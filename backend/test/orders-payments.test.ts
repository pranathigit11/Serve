import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/lib/prisma.js';
import { expireStalePendingOrders } from '../src/modules/orders.service.js';
import {
  api,
  assignStaff,
  checkout,
  createCanteen,
  createMenu,
  placeOrder,
  registerStaff,
  registerStudent,
  resetDatabase,
  startServer,
  type TestServer,
} from './helpers.js';

let t: TestServer;

beforeAll(async () => {
  t = await startServer();
});
afterAll(async () => {
  await t.close();
});
beforeEach(async () => {
  await resetDatabase();
});

async function setup() {
  const canteenA = await createCanteen('Canteen A', ['A']);
  const canteenB = await createCanteen('Canteen B', ['B']);
  const menuA = await createMenu(canteenA.id, [
    { name: 'Veg Sandwich', price: 50 },
    { name: 'Cold Coffee', price: 30.5 },
    { name: 'Paneer Roll', price: 100, isAvailable: false },
  ]);
  const menuB = await createMenu(canteenB.id, [{ name: 'Lemon Tea', price: 25 }]);
  const student = await registerStudent(t.server, 'A', 'Aryan');
  const otherStudent = await registerStudent(t.server, 'B', 'Sneha');
  const staffA = await registerStaff(t.server, 'Staff A');
  const staffB = await registerStaff(t.server, 'Staff B');
  await assignStaff(staffA.id, canteenA.id);
  await assignStaff(staffB.id, canteenB.id);
  return { canteenA, canteenB, menuA, menuB, student, otherStudent, staffA, staffB };
}

describe('order validation', () => {
  it('S/T: computes totals server-side and ignores client prices, totals and identities', async () => {
    const { canteenA, menuA, student, otherStudent } = await setup();
    const res = await api(t.server, student.idToken)
      .post('/api/orders', {
        canteenId: canteenA.id,
        studentId: otherStudent.id,
        totalAmount: 1,
        items: [
          { menuItemId: menuA.items[0]!.id, quantity: 2, price: 0.01 },
          { menuItemId: menuA.items[1]!.id, quantity: 3, price: 0.01 },
          { menuItemId: menuA.items[0]!.id, quantity: 1 },
        ],
      })
      .set('Idempotency-Key', randomUUID());
    expect(res.status).toBe(201);
    // 3 × 50 + 3 × 30.50 = 241.50
    expect(res.body.order.totalAmount).toBe(241.5);
    expect(res.body.order.status).toBe('PENDING_PAYMENT');
    expect(res.body.order.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Veg Sandwich', quantity: 3, unitPrice: 50, lineTotal: 150 }),
        expect.objectContaining({ name: 'Cold Coffee', quantity: 3, unitPrice: 30.5, lineTotal: 91.5 }),
      ]),
    );
    const stored = await prisma.order.findUniqueOrThrow({ where: { id: res.body.order.id } });
    expect(stored.studentId).toBe(student.id);
    expect(stored.totalAmount.toString()).toBe('241.5');
  });

  it('is idempotent per Idempotency-Key (no duplicate orders on retry)', async () => {
    const { canteenA, menuA, student } = await setup();
    const key = randomUUID();
    const items = [{ menuItemId: menuA.items[0]!.id, quantity: 1 }];
    const [a, b] = await Promise.all([
      placeOrder(t.server, student.idToken, canteenA.id, items, key),
      placeOrder(t.server, student.idToken, canteenA.id, items, key),
    ]);
    expect([a.status, b.status].sort()).toEqual([200, 201]);
    expect(a.body.order.id).toBe(b.body.order.id);
    expect(await prisma.order.count()).toBe(1);

    const missingKey = await api(t.server, student.idToken).post('/api/orders', { canteenId: canteenA.id, items });
    expect(missingKey.status).toBe(400);
    expect(missingKey.body.error).toBe('IDEMPOTENCY_KEY_REQUIRED');
  });

  it('AH: rejects invalid orders', async () => {
    const { canteenA, canteenB, menuA, menuB, student } = await setup();
    const token = student.idToken;
    const cases: [object[], string, number, string][] = [
      [[], canteenA.id, 400, 'VALIDATION_ERROR'],
      [[{ menuItemId: menuA.items[0]!.id, quantity: 0 }], canteenA.id, 400, 'VALIDATION_ERROR'],
      [[{ menuItemId: menuA.items[0]!.id, quantity: -2 }], canteenA.id, 400, 'VALIDATION_ERROR'],
      [[{ menuItemId: menuA.items[0]!.id, quantity: 1.5 }], canteenA.id, 400, 'VALIDATION_ERROR'],
      [[{ menuItemId: menuA.items[0]!.id, quantity: 21 }], canteenA.id, 400, 'VALIDATION_ERROR'],
      [[{ menuItemId: menuA.items[0]!.id, quantity: 15 }, { menuItemId: menuA.items[0]!.id, quantity: 15 }], canteenA.id, 400, 'QUANTITY_TOO_LARGE'],
      [[{ menuItemId: randomUUID(), quantity: 1 }], canteenA.id, 400, 'ITEM_NOT_FOUND'],
      [[{ menuItemId: 'not-a-uuid', quantity: 1 }], canteenA.id, 400, 'VALIDATION_ERROR'],
      [[{ menuItemId: menuA.items[2]!.id, quantity: 1 }], canteenA.id, 409, 'ITEM_UNAVAILABLE'],
      // Cross-canteen: item of canteen B in an order for canteen A, and vice versa.
      [[{ menuItemId: menuB.items[0]!.id, quantity: 1 }], canteenA.id, 400, 'ITEM_NOT_IN_CANTEEN'],
      [[{ menuItemId: menuA.items[0]!.id, quantity: 1 }], canteenB.id, 400, 'ITEM_NOT_IN_CANTEEN'],
      [[{ menuItemId: menuA.items[0]!.id, quantity: 1 }], randomUUID(), 404, 'CANTEEN_NOT_FOUND'],
    ];
    for (const [items, canteenId, status, error] of cases) {
      const res = await placeOrder(t.server, token, canteenId, items as never);
      expect(res.status, JSON.stringify(items)).toBe(status);
      expect(res.body.error, JSON.stringify(items)).toBe(error);
    }
    expect(await prisma.order.count()).toBe(0);
  });

  it('AE: blocks ordering from inactive or paused canteens', async () => {
    const { canteenA, menuA, student, staffA } = await setup();
    const items = [{ menuItemId: menuA.items[0]!.id, quantity: 1 }];

    const paused = await api(t.server, staffA.idToken).patch('/api/staff/canteen/order-taking', {
      isAcceptingOrders: false,
    });
    expect(paused.body.canteen.isAcceptingOrders).toBe(false);
    const whilePaused = await placeOrder(t.server, student.idToken, canteenA.id, items);
    expect(whilePaused.status).toBe(409);
    expect(whilePaused.body.error).toBe('CANTEEN_NOT_ACCEPTING_ORDERS');

    await api(t.server, staffA.idToken).patch('/api/staff/canteen/order-taking', { isAcceptingOrders: true });
    await prisma.canteen.update({ where: { id: canteenA.id }, data: { status: 'INACTIVE' } });
    const whileInactive = await placeOrder(t.server, student.idToken, canteenA.id, items);
    expect(whileInactive.status).toBe(409);
    expect(whileInactive.body.error).toBe('CANTEEN_INACTIVE');
  });

  it('does not take payment if the canteen paused after the order was created', async () => {
    const { canteenA, menuA, student } = await setup();
    const order = await placeOrder(t.server, student.idToken, canteenA.id, [{ menuItemId: menuA.items[0]!.id, quantity: 1 }]);
    await prisma.canteen.update({ where: { id: canteenA.id }, data: { isAcceptingOrders: false } });
    const payment = await api(t.server, student.idToken).post('/api/payments', { orderId: order.body.order.id });
    expect(payment.status).toBe(409);
    expect(payment.body.error).toBe('CANTEEN_NOT_ACCEPTING_ORDERS');
  });
});

describe('mock payment (server authoritative)', () => {
  it('U/V: creates, completes and verifies a payment; order becomes PLACED', async () => {
    const { canteenA, menuA, student } = await setup();
    const studentApi = api(t.server, student.idToken);
    const order = await placeOrder(t.server, student.idToken, canteenA.id, [{ menuItemId: menuA.items[0]!.id, quantity: 2 }]);
    const payment = await studentApi.post('/api/payments', { orderId: order.body.order.id });
    expect(payment.status).toBe(201);
    expect(payment.body.payment).toMatchObject({ amount: 100, currency: 'INR', provider: 'MOCK', status: 'CREATED' });

    // The gateway step alone changes nothing.
    const gateway = await studentApi.post(`/api/payments/mock/${payment.body.payment.id}/complete`, { outcome: 'SUCCESS' });
    expect(gateway.status).toBe(200);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.body.order.id } })).status).toBe('PENDING_PAYMENT');

    const verify = await studentApi.post('/api/payments/verify', gateway.body.result);
    expect(verify.status).toBe(200);
    expect(verify.body).toMatchObject({ status: 'CONFIRMED', order: { status: 'PLACED', totalAmount: 100 } });
    expect(verify.body.order.estimatedReadyAt).toBeTruthy();

    const storedPayment = await prisma.payment.findUniqueOrThrow({ where: { id: payment.body.payment.id } });
    expect(storedPayment.status).toBe('SUCCEEDED');

    // AG. Duplicate verification is rejected and changes nothing.
    const duplicate = await studentApi.post('/api/payments/verify', gateway.body.result);
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error).toBe('ALREADY_VERIFIED');
    // Paying an already-paid order is rejected.
    const again = await studentApi.post('/api/payments', { orderId: order.body.order.id });
    expect(again.status).toBe(409);
    expect(again.body.error).toBe('ALREADY_PAID');
    expect(await prisma.payment.count({ where: { status: 'SUCCEEDED' } })).toBe(1);
  });

  it('AG: concurrent verifications of two attempts for one order produce exactly one success', async () => {
    const { canteenA, menuA, student } = await setup();
    const studentApi = api(t.server, student.idToken);
    const order = await placeOrder(t.server, student.idToken, canteenA.id, [{ menuItemId: menuA.items[0]!.id, quantity: 1 }]);
    const p1 = await studentApi.post('/api/payments', { orderId: order.body.order.id });
    const g1 = await studentApi.post(`/api/payments/mock/${p1.body.payment.id}/complete`, { outcome: 'SUCCESS' });
    // Simulate a replayed verification racing itself.
    const results = await Promise.all([
      studentApi.post('/api/payments/verify', g1.body.result),
      studentApi.post('/api/payments/verify', g1.body.result),
      studentApi.post('/api/payments/verify', g1.body.result),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409, 409]);
    expect(await prisma.payment.count({ where: { status: 'SUCCEEDED' } })).toBe(1);
  });

  it('a newer attempt supersedes an older open attempt', async () => {
    const { canteenA, menuA, student } = await setup();
    const studentApi = api(t.server, student.idToken);
    const order = await placeOrder(t.server, student.idToken, canteenA.id, [{ menuItemId: menuA.items[0]!.id, quantity: 1 }]);
    const p1 = await studentApi.post('/api/payments', { orderId: order.body.order.id });
    const g1 = await studentApi.post(`/api/payments/mock/${p1.body.payment.id}/complete`, { outcome: 'SUCCESS' });
    const p2 = await studentApi.post('/api/payments', { orderId: order.body.order.id });
    expect(p2.status).toBe(201);
    const stale = await studentApi.post('/api/payments/verify', g1.body.result);
    expect(stale.status).toBe(409);
    expect(stale.body.error).toBe('PAYMENT_NOT_PENDING');
  });

  it('frontend cannot forge success: tampered or invented results fail', async () => {
    const { canteenA, menuA, student } = await setup();
    const studentApi = api(t.server, student.idToken);
    const order = await placeOrder(t.server, student.idToken, canteenA.id, [{ menuItemId: menuA.items[0]!.id, quantity: 1 }]);
    const payment = await studentApi.post('/api/payments', { orderId: order.body.order.id });
    const failure = await studentApi.post(`/api/payments/mock/${payment.body.payment.id}/complete`, { outcome: 'FAILURE' });

    // Flip FAILED → CAPTURED without a valid signature.
    const flipped = await studentApi.post('/api/payments/verify', { ...failure.body.result, status: 'CAPTURED' });
    expect(flipped.status).toBe(400);
    expect(flipped.body.error).toBe('SIGNATURE_INVALID');
    // Invented signature.
    const invented = await studentApi.post('/api/payments/verify', { ...failure.body.result, signature: 'a'.repeat(64) });
    expect(invented.status).toBe(400);
    // Order still unpaid, payment still open.
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.body.order.id } })).status).toBe('PENDING_PAYMENT');
    expect((await prisma.payment.findUniqueOrThrow({ where: { id: payment.body.payment.id } })).status).toBe('CREATED');

    // Genuine failure result marks the attempt FAILED, order stays unpaid, retry possible.
    const failed = await studentApi.post('/api/payments/verify', failure.body.result);
    expect(failed.status).toBe(402);
    expect(failed.body.error).toBe('PAYMENT_FAILED');
    expect((await prisma.payment.findUniqueOrThrow({ where: { id: payment.body.payment.id } })).status).toBe('FAILED');
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.body.order.id } })).status).toBe('PENDING_PAYMENT');
    const retry = await studentApi.post('/api/payments', { orderId: order.body.order.id });
    expect(retry.status).toBe(201);
  });

  it('rejects an incorrect paid amount', async () => {
    const { canteenA, menuA, student } = await setup();
    const studentApi = api(t.server, student.idToken);
    const order = await placeOrder(t.server, student.idToken, canteenA.id, [{ menuItemId: menuA.items[0]!.id, quantity: 1 }]);
    const payment = await studentApi.post('/api/payments', { orderId: order.body.order.id });
    const underpaid = await studentApi.post(`/api/payments/mock/${payment.body.payment.id}/complete`, {
      outcome: 'SUCCESS',
      amount: 1,
    });
    const res = await studentApi.post('/api/payments/verify', underpaid.body.result);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('AMOUNT_MISMATCH');
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.body.order.id } })).status).toBe('PENDING_PAYMENT');
  });

  it('handles cancelled payments and invalid / foreign payment ids', async () => {
    const { canteenA, menuA, student, otherStudent } = await setup();
    const studentApi = api(t.server, student.idToken);
    const order = await placeOrder(t.server, student.idToken, canteenA.id, [{ menuItemId: menuA.items[0]!.id, quantity: 1 }]);
    const payment = await studentApi.post('/api/payments', { orderId: order.body.order.id });
    const gateway = await studentApi.post(`/api/payments/mock/${payment.body.payment.id}/complete`, { outcome: 'SUCCESS' });

    // Another student cannot touch this payment or order.
    const otherApi = api(t.server, otherStudent.idToken);
    expect((await otherApi.post('/api/payments/verify', gateway.body.result)).status).toBe(404);
    expect((await otherApi.post(`/api/payments/${payment.body.payment.id}/cancel`)).status).toBe(404);
    expect((await otherApi.post('/api/payments', { orderId: order.body.order.id })).status).toBe(404);
    expect((await otherApi.get(`/api/orders/${order.body.order.id}`)).status).toBe(404);

    const cancelled = await studentApi.post(`/api/payments/${payment.body.payment.id}/cancel`);
    expect(cancelled.status).toBe(200);
    const afterCancel = await studentApi.post('/api/payments/verify', gateway.body.result);
    expect(afterCancel.status).toBe(409);

    const unknown = await studentApi.post('/api/payments/verify', { ...gateway.body.result, paymentId: randomUUID() });
    expect(unknown.status).toBe(404);
    expect((await studentApi.post('/api/payments', { orderId: randomUUID() })).status).toBe(404);
  });

  it('unpaid orders expire and cannot be paid afterwards', async () => {
    const { canteenA, menuA, student } = await setup();
    const studentApi = api(t.server, student.idToken);
    const order = await placeOrder(t.server, student.idToken, canteenA.id, [{ menuItemId: menuA.items[0]!.id, quantity: 1 }]);
    const payment = await studentApi.post('/api/payments', { orderId: order.body.order.id });
    const gateway = await studentApi.post(`/api/payments/mock/${payment.body.payment.id}/complete`, { outcome: 'SUCCESS' });
    await prisma.order.update({ where: { id: order.body.order.id }, data: { createdAt: new Date(Date.now() - 3600_000) } });
    expect(await expireStalePendingOrders(30)).toBe(1);
    const res = await studentApi.post('/api/payments/verify', gateway.body.result);
    expect(res.status).toBe(409);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.body.order.id } })).status).toBe('CANCELLED');
  });

  it('students can cancel only their own unpaid orders', async () => {
    const { canteenA, menuA, student, otherStudent } = await setup();
    const unpaid = await placeOrder(t.server, student.idToken, canteenA.id, [{ menuItemId: menuA.items[0]!.id, quantity: 1 }]);
    expect((await api(t.server, otherStudent.idToken).post(`/api/orders/${unpaid.body.order.id}/cancel`)).status).toBe(404);
    const ok = await api(t.server, student.idToken).post(`/api/orders/${unpaid.body.order.id}/cancel`);
    expect(ok.body.order.status).toBe('CANCELLED');
    const paid = await checkout(t.server, student.idToken, canteenA.id, [{ menuItemId: menuA.items[0]!.id, quantity: 1 }]);
    const res = await api(t.server, student.idToken).post(`/api/orders/${paid.id}/cancel`);
    expect(res.status).toBe(409);
  });
});

describe('staff order handling and isolation', () => {
  it('X/Z: staff advance PLACED → PREPARING → READY → COLLECTED with valid transitions only', async () => {
    const { canteenA, menuA, student, staffA } = await setup();
    const order = await checkout(t.server, student.idToken, canteenA.id, [{ menuItemId: menuA.items[0]!.id, quantity: 1 }]);
    const staffApi = api(t.server, staffA.idToken);

    const list = await staffApi.get('/api/staff/orders');
    expect(list.body.orders).toEqual([
      expect.objectContaining({ id: order.id, status: 'PLACED', student: { name: 'Aryan', hostel: 'A' } }),
    ]);

    expect((await staffApi.patch(`/api/staff/orders/${order.id}/status`, { status: 'READY' })).status).toBe(409);
    expect((await staffApi.patch(`/api/staff/orders/${order.id}/status`, { status: 'PLACED' })).status).toBe(400);
    for (const status of ['PREPARING', 'READY', 'COLLECTED']) {
      const res = await staffApi.patch(`/api/staff/orders/${order.id}/status`, { status });
      expect(res.status, status).toBe(200);
      expect(res.body.order.status).toBe(status);
    }
    expect((await staffApi.patch(`/api/staff/orders/${order.id}/status`, { status: 'COLLECTED' })).status).toBe(409);

    const history = await api(t.server, student.idToken).get('/api/students/me/orders');
    expect(history.body.orders[0]).toMatchObject({ id: order.id, status: 'COLLECTED' });
    expect(history.body.orders[0].collectedAt).toBeTruthy();
    const titles = (await api(t.server, student.idToken).get('/api/notifications')).body.notifications.map(
      (n: { title: string }) => n.title,
    );
    expect(titles).toEqual(expect.arrayContaining(['Payment Confirmed', 'Order Preparing', 'Order Ready', 'Order Collected']));
  });

  it('concurrent status clicks cannot double-advance an order', async () => {
    const { canteenA, menuA, student, staffA } = await setup();
    const order = await checkout(t.server, student.idToken, canteenA.id, [{ menuItemId: menuA.items[0]!.id, quantity: 1 }]);
    const staffApi = api(t.server, staffA.idToken);
    const results = await Promise.all(
      [1, 2, 3].map(() => staffApi.patch(`/api/staff/orders/${order.id}/status`, { status: 'PREPARING' })),
    );
    expect(results.filter((r) => r.status === 200)).toHaveLength(1);
  });

  it('AA/AC: staff of canteen B cannot see or modify canteen A orders; unpaid orders are invisible', async () => {
    const { canteenA, menuA, student, staffA, staffB } = await setup();
    const unpaid = await placeOrder(t.server, student.idToken, canteenA.id, [{ menuItemId: menuA.items[1]!.id, quantity: 1 }]);
    const order = await checkout(t.server, student.idToken, canteenA.id, [{ menuItemId: menuA.items[0]!.id, quantity: 1 }]);

    const listB = await api(t.server, staffB.idToken).get('/api/staff/orders');
    expect(listB.body.orders).toEqual([]);
    const listA = await api(t.server, staffA.idToken).get('/api/staff/orders');
    expect(listA.body.orders.map((o: { id: string }) => o.id)).toEqual([order.id]);

    const attack = await api(t.server, staffB.idToken).patch(`/api/staff/orders/${order.id}/status`, {
      status: 'PREPARING',
      canteenId: canteenA.id,
    });
    expect(attack.status).toBe(403);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe('PLACED');

    const unpaidAttack = await api(t.server, staffA.idToken).patch(`/api/staff/orders/${unpaid.body.order.id}/status`, {
      status: 'PREPARING',
    });
    expect(unpaidAttack.status).toBe(404);

    // Pausing only affects the staff member's own canteen.
    await api(t.server, staffB.idToken).patch('/api/staff/canteen/order-taking', {
      isAcceptingOrders: false,
      canteenId: canteenA.id,
    });
    expect((await prisma.canteen.findUniqueOrThrow({ where: { id: canteenA.id } })).isAcceptingOrders).toBe(true);
  });

  it('historical order lines survive menu edits', async () => {
    const { canteenA, menuA, student, staffA } = await setup();
    const order = await checkout(t.server, student.idToken, canteenA.id, [{ menuItemId: menuA.items[0]!.id, quantity: 2 }]);
    await api(t.server, staffA.idToken).patch(`/api/staff/menu/items/${menuA.items[0]!.id}`, {
      name: 'Renamed',
      price: 999,
    });
    await api(t.server, staffA.idToken).delete(`/api/staff/menu/items/${menuA.items[0]!.id}`);
    const res = await api(t.server, student.idToken).get(`/api/orders/${order.id}`);
    expect(res.body.order.items[0]).toMatchObject({ name: 'Veg Sandwich', unitPrice: 50, quantity: 2, lineTotal: 100 });
    expect(res.body.order.totalAmount).toBe(100);
  });
});

describe('abuse protection', () => {
  it('rate-limits checkout attempts per student account', async () => {
    const { canteenA, student, otherStudent } = await setup();
    const statuses: number[] = [];
    for (let i = 0; i < 31; i += 1) {
      statuses.push((await placeOrder(t.server, student.idToken, canteenA.id, [])).status);
    }
    expect(statuses.slice(0, 30).every((s) => s === 400)).toBe(true);
    expect(statuses[30]).toBe(429);
    // Another student on the same IP is unaffected.
    expect((await placeOrder(t.server, otherStudent.idToken, canteenA.id, [])).status).toBe(400);
  });
});
