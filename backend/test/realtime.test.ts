import type { Socket } from 'socket.io-client';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/lib/prisma.js';
import {
  api,
  assignStaff,
  checkout,
  connectSocket,
  createAdmin,
  createCanteen,
  createFirebaseUser,
  createMenu,
  recordEvents,
  registerStaff,
  registerStudent,
  resetDatabase,
  sleep,
  startServer,
  waitForEvent,
  type TestServer,
} from './helpers.js';

let t: TestServer;
const sockets: Socket[] = [];

async function connect(token?: string) {
  const socket = await connectSocket(t.baseUrl, token);
  sockets.push(socket);
  return socket;
}

beforeAll(async () => {
  t = await startServer();
});
afterAll(async () => {
  await t.close();
});
beforeEach(async () => {
  await resetDatabase();
});
afterEach(() => {
  for (const socket of sockets.splice(0)) socket.close();
});

async function world() {
  const canteenA = await createCanteen('Canteen A', ['A']);
  const canteenB = await createCanteen('Canteen B', ['B']);
  const menuA = await createMenu(canteenA.id, [{ name: 'Sandwich', price: 50 }]);
  const menuB = await createMenu(canteenB.id, [{ name: 'Tea', price: 20 }]);
  const studentA = await registerStudent(t.server, 'A', 'Student A');
  const studentB = await registerStudent(t.server, 'B', 'Student B');
  const staffA = await registerStaff(t.server, 'Staff A');
  const staffB = await registerStaff(t.server, 'Staff B');
  await assignStaff(staffA.id, canteenA.id);
  await assignStaff(staffB.id, canteenB.id);
  return { canteenA, canteenB, menuA, menuB, studentA, studentB, staffA, staffB };
}

describe('socket authentication', () => {
  it('rejects connections without a valid, registered, active account', async () => {
    await expect(connect()).rejects.toThrow('AUTH_REQUIRED');
    await expect(connect('forged.token.value')).rejects.toThrow('INVALID_TOKEN');
    const unregistered = await createFirebaseUser();
    await expect(connect(unregistered.idToken)).rejects.toThrow('ACCOUNT_NOT_REGISTERED');
    const student = await registerStudent(t.server);
    await prisma.user.update({ where: { id: student.id }, data: { status: 'INACTIVE' } });
    await expect(connect(student.idToken)).rejects.toThrow('ACCOUNT_INACTIVE');
  });
});

describe('W/Y/AA: real-time order flow with canteen isolation', () => {
  it('delivers orders and status changes only to the right staff and student', async () => {
    const { canteenA, canteenB, menuA, menuB, studentA, studentB, staffA, staffB } = await world();
    const sA = await connect(studentA.idToken);
    const sB = await connect(studentB.idToken);
    const kA = await connect(staffA.idToken);
    const kB = await connect(staffB.idToken);
    const leakB = recordEvents(kB);
    const leakStudentB = recordEvents(sB);

    // Student A orders from canteen A; staff A receives it without refreshing.
    const staffGotOrder = waitForEvent<{ id: string; status: string; student: { name: string } }>(kA, 'order:created');
    const studentGotPlaced = waitForEvent<{ status: string }>(sA, 'order:status_updated', (o) => o.status === 'PLACED');
    const order = await checkout(t.server, studentA.idToken, canteenA.id, [{ menuItemId: menuA.items[0]!.id, quantity: 2 }]);
    expect(await staffGotOrder).toMatchObject({ id: order.id, status: 'PLACED', student: { name: 'Student A' } });
    await studentGotPlaced;

    // Staff A advances; student A receives every update.
    for (const status of ['PREPARING', 'READY', 'COLLECTED']) {
      const studentUpdate = waitForEvent<{ id: string; status: string }>(sA, 'order:status_updated', (o) => o.status === status);
      const staffUpdate = waitForEvent<{ id: string; status: string }>(kA, 'order:status_updated', (o) => o.status === status);
      const res = await api(t.server, staffA.idToken).patch(`/api/staff/orders/${order.id}/status`, { status });
      expect(res.status).toBe(200);
      expect(await studentUpdate).toMatchObject({ id: order.id, status });
      await staffUpdate;
    }

    // Canteen B flow reaches only canteen B.
    const leakA = recordEvents(kA);
    const leakStudentA = recordEvents(sA);
    const staffBGot = waitForEvent<{ id: string }>(kB, 'order:created');
    const orderB = await checkout(t.server, studentB.idToken, canteenB.id, [{ menuItemId: menuB.items[0]!.id, quantity: 1 }]);
    expect((await staffBGot).id).toBe(orderB.id);
    await sleep(300);

    const orderEvents = (events: { event: string }[]) => events.filter((e) => e.event.startsWith('order:'));
    expect(orderEvents(leakA)).toEqual([]);
    expect(orderEvents(leakStudentA)).toEqual([]);
    // Staff B and student B never saw canteen A's order.
    expect(
      [...leakB, ...leakStudentB].some((e) => JSON.stringify(e.payload).includes(order.id)),
    ).toBe(false);
  });

  it('ignores client attempts to join other rooms', async () => {
    const { canteenA, menuA, studentA, staffB } = await world();
    const kB = await connect(staffB.idToken);
    const events = recordEvents(kB);
    kB.emit('join', `canteen:${canteenA.id}:staff`);
    kB.emit('subscribe', { canteenId: canteenA.id, room: `canteen:${canteenA.id}:staff` });
    await sleep(200);
    await checkout(t.server, studentA.idToken, canteenA.id, [{ menuItemId: menuA.items[0]!.id, quantity: 1 }]);
    await sleep(300);
    expect(events.filter((e) => e.event === 'order:created')).toEqual([]);
  });
});

describe('menu and canteen broadcasts', () => {
  it('O/Q: price and availability changes reach students of that canteen only', async () => {
    const { menuA, studentA, studentB, staffA } = await world();
    const sA = await connect(studentA.idToken);
    const sB = await connect(studentB.idToken);
    const otherCanteen = recordEvents(sB);
    const itemId = menuA.items[0]!.id;

    const priceEvent = waitForEvent<{ id: string; price: number }>(sA, 'menu:item_updated', (i) => i.price === 75);
    await api(t.server, staffA.idToken).patch(`/api/staff/menu/items/${itemId}`, { price: 75 });
    expect(await priceEvent).toMatchObject({ id: itemId, price: 75 });

    const availability = waitForEvent<{ id: string; isAvailable: boolean }>(sA, 'menu:availability_updated');
    await api(t.server, staffA.idToken).patch(`/api/staff/menu/items/${itemId}/availability`, { isAvailable: false });
    expect(await availability).toMatchObject({ id: itemId, isAvailable: false });

    const paused = waitForEvent<{ isAcceptingOrders: boolean }>(sA, 'canteen:order_taking_updated');
    await api(t.server, staffA.idToken).patch('/api/staff/canteen/order-taking', { isAcceptingOrders: false });
    expect((await paused).isAcceptingOrders).toBe(false);

    await sleep(200);
    expect(otherCanteen.filter((e) => e.event.startsWith('menu:') || e.event.startsWith('canteen:'))).toEqual([]);
  });

  it('moves a student’s live connection when they switch canteen', async () => {
    const { canteenB, menuA, menuB, studentA, staffA } = await world();
    const sA = await connect(studentA.idToken);
    const events = recordEvents(sA);
    const res = await api(t.server, studentA.idToken).patch('/api/students/me', { selectedCanteenId: canteenB.id });
    expect(res.body.account.student.selectedCanteenId).toBe(canteenB.id);
    await sleep(100);

    await api(t.server, staffA.idToken).patch(`/api/staff/menu/items/${menuA.items[0]!.id}`, { price: 51 });
    const staffB = await registerStaff(t.server);
    await assignStaff(staffB.id, canteenB.id);
    const fromB = waitForEvent<{ id: string }>(sA, 'menu:item_updated');
    await api(t.server, staffB.idToken).patch(`/api/staff/menu/items/${menuB.items[0]!.id}`, { price: 21 });
    expect((await fromB).id).toBe(menuB.items[0]!.id);
    expect(events.some((e) => (e.payload as { id?: string })?.id === menuA.items[0]!.id)).toBe(false);
  });
});

describe('admin and staff assignment events', () => {
  it('notifies admins of requests and moves staff into the approved canteen room', async () => {
    const { canteenA, canteenB, menuB, studentB } = await world();
    const admin = await createAdmin();
    const staff = await registerStaff(t.server, 'Newbie');
    const adminSocket = await connect(admin.idToken);
    const staffSocket = await connect(staff.idToken);

    const requested = waitForEvent<{ requestedCanteenId: string }>(adminSocket, 'change_request:created');
    const req = await api(t.server, staff.idToken).post('/api/staff/canteen-requests', { toCanteenId: canteenB.id });
    expect((await requested).requestedCanteenId).toBe(canteenB.id);

    const assignment = waitForEvent<{ canteenId: string }>(staffSocket, 'staff:canteen_assignment_updated');
    const updated = waitForEvent<{ status: string }>(staffSocket, 'change_request:updated');
    await api(t.server, admin.idToken).post(`/api/admin/canteen-requests/${req.body.request.id}/approve`);
    expect((await assignment).canteenId).toBe(canteenB.id);
    expect((await updated).status).toBe('APPROVED');

    // The same live socket now receives canteen B orders (no reconnect needed)…
    const newOrder = waitForEvent<{ canteenId: string }>(staffSocket, 'order:created');
    await checkout(t.server, studentB.idToken, canteenB.id, [{ menuItemId: menuB.items[0]!.id, quantity: 1 }]);
    expect((await newOrder).canteenId).toBe(canteenB.id);

    // …and after reassignment to A it stops receiving canteen B orders.
    await api(t.server, admin.idToken).patch(`/api/admin/staff/${staff.id}/assignment`, { canteenId: canteenA.id });
    await sleep(100);
    const events = recordEvents(staffSocket);
    await checkout(t.server, studentB.idToken, canteenB.id, [{ menuItemId: menuB.items[0]!.id, quantity: 1 }]);
    await sleep(300);
    expect(events.filter((e) => e.event === 'order:created')).toEqual([]);
  });

  it('disconnects a staff member’s sockets when deactivated', async () => {
    const { staffA } = await world();
    const admin = await createAdmin();
    const socket = await connect(staffA.idToken);
    const disconnected = new Promise<void>((resolve) => socket.once('disconnect', () => resolve()));
    await api(t.server, admin.idToken).patch(`/api/admin/staff/${staffA.id}/status`, { status: 'INACTIVE' });
    await disconnected;
    expect(socket.connected).toBe(false);
  });
});
