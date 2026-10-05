import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/lib/prisma.js';
import {
  api,
  createAdmin,
  createCanteen,
  registerStaff,
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

describe('staff canteen request → admin approval', () => {
  it('runs the full request / reject / approve workflow and persists the assignment', async () => {
    const canteenA = await createCanteen('Canteen A', ['A']);
    const canteenB = await createCanteen('Canteen B', ['B']);
    const staff = await registerStaff(t.server, 'Priya');
    const admin = await createAdmin();
    const staffApi = api(t.server, staff.idToken);
    const adminApi = api(t.server, admin.idToken);

    // G. Staff requests canteen access.
    const created = await staffApi.post('/api/staff/canteen-requests', { toCanteenId: canteenA.id });
    expect(created.status).toBe(201);
    expect(created.body.request).toMatchObject({
      currentCanteenId: null,
      requestedCanteenId: canteenA.id,
      status: 'PENDING',
      reason: 'Initial canteen access request',
    });

    // Only one pending request at a time.
    const duplicate = await staffApi.post('/api/staff/canteen-requests', { toCanteenId: canteenB.id });
    expect(duplicate.status).toBe(409);

    // H. Admin sees the pending request.
    const pending = await adminApi.get('/api/admin/canteen-requests?status=PENDING');
    expect(pending.status).toBe(200);
    expect(pending.body.requests).toHaveLength(1);

    // Rejection does not grant access.
    const rejected = await adminApi.post(`/api/admin/canteen-requests/${created.body.request.id}/reject`);
    expect(rejected.status).toBe(200);
    expect(rejected.body.request.status).toBe('REJECTED');
    expect((await prisma.staffProfile.findUniqueOrThrow({ where: { userId: staff.id } })).canteenId).toBeNull();
    expect((await staffApi.get('/api/staff/orders')).status).toBe(403);

    // A resolved request cannot be resolved again.
    const again = await adminApi.post(`/api/admin/canteen-requests/${created.body.request.id}/approve`);
    expect(again.status).toBe(409);

    // I/J. New request, approved → assignment persisted in PostgreSQL.
    const second = await staffApi.post('/api/staff/canteen-requests', { toCanteenId: canteenA.id });
    expect(second.status).toBe(201);
    const approved = await adminApi.post(`/api/admin/canteen-requests/${second.body.request.id}/approve`);
    expect(approved.status).toBe(200);
    expect(approved.body.request.status).toBe('APPROVED');

    const profile = await prisma.staffProfile.findUniqueOrThrow({ where: { userId: staff.id } });
    expect(profile.canteenId).toBe(canteenA.id);
    const stored = await prisma.staffCanteenRequest.findUniqueOrThrow({ where: { id: second.body.request.id } });
    expect(stored.reviewedById).toBe(admin.id);

    const me = await staffApi.get('/api/staff/me');
    expect(me.body.staff.canteen.id).toBe(canteenA.id);
    expect(me.body.staff.pendingRequest).toBeNull();
    expect((await staffApi.get('/api/staff/orders')).status).toBe(200);

    // Change request from A to B records the current canteen.
    const change = await staffApi.post('/api/staff/canteen-requests', { toCanteenId: canteenB.id });
    expect(change.body.request.currentCanteenId).toBe(canteenA.id);
    const sameCanteen = await api(t.server, staff.idToken).post('/api/staff/canteen-requests', {
      toCanteenId: canteenA.id,
    });
    expect(sameCanteen.status).toBe(400);
    expect(sameCanteen.body.error).toBe('ALREADY_ASSIGNED');

    // Staff notifications reflect the decisions.
    const notifications = await staffApi.get('/api/notifications');
    const titles = notifications.body.notifications.map((n: { title: string }) => n.title);
    expect(titles).toContain('Canteen Assigned');
    expect(titles).toContain('Canteen Request Rejected');
  });

  it('cannot approve a request for a canteen that was deactivated meanwhile', async () => {
    const canteen = await createCanteen('Canteen A', ['A']);
    const staff = await registerStaff(t.server);
    const admin = await createAdmin();
    const req = await api(t.server, staff.idToken).post('/api/staff/canteen-requests', { toCanteenId: canteen.id });
    await api(t.server, admin.idToken).patch(`/api/admin/canteens/${canteen.id}`, { status: 'INACTIVE' });
    const res = await api(t.server, admin.idToken).post(`/api/admin/canteen-requests/${req.body.request.id}/approve`);
    expect(res.status).toBe(409);
    expect((await prisma.staffProfile.findUniqueOrThrow({ where: { userId: staff.id } })).canteenId).toBeNull();
    expect((await prisma.staffCanteenRequest.findUniqueOrThrow({ where: { id: req.body.request.id } })).status).toBe(
      'PENDING',
    );
  });

  it('only admins can resolve requests or change assignments', async () => {
    const canteen = await createCanteen('Canteen A', ['A']);
    const staff = await registerStaff(t.server);
    const otherStaff = await registerStaff(t.server);
    const req = await api(t.server, staff.idToken).post('/api/staff/canteen-requests', { toCanteenId: canteen.id });

    const selfApprove = await api(t.server, staff.idToken).post(`/api/admin/canteen-requests/${req.body.request.id}/approve`);
    expect(selfApprove.status).toBe(403);
    const peerApprove = await api(t.server, otherStaff.idToken).post(
      `/api/admin/canteen-requests/${req.body.request.id}/approve`,
    );
    expect(peerApprove.status).toBe(403);
    const selfAssign = await api(t.server, staff.idToken).patch(`/api/admin/staff/${staff.id}/assignment`, {
      canteenId: canteen.id,
    });
    expect(selfAssign.status).toBe(403);
    expect((await prisma.staffProfile.findUniqueOrThrow({ where: { userId: staff.id } })).canteenId).toBeNull();
  });
});

describe('admin portal APIs', () => {
  it('manages canteens and staff assignments with validation', async () => {
    const admin = await createAdmin();
    const adminApi = api(t.server, admin.idToken);

    const created = await adminApi.post('/api/admin/canteens', {
      name: 'Tapti Night Canteen',
      location: 'Tapti Block',
      hostelsServed: ['Tapti', 'Tapti'],
      id: 'client-chosen-id',
    });
    expect(created.status).toBe(201);
    expect(created.body.canteen.id).not.toBe('client-chosen-id');
    expect(created.body.canteen.hostelsServed).toEqual(['Tapti']);

    const duplicate = await adminApi.post('/api/admin/canteens', {
      name: 'Tapti Night Canteen',
      location: 'x',
      hostelsServed: ['x'],
    });
    expect(duplicate.status).toBe(409);

    const invalid = await adminApi.post('/api/admin/canteens', { name: '', location: 'x', hostelsServed: [] });
    expect(invalid.status).toBe(400);

    const deactivated = await adminApi.patch(`/api/admin/canteens/${created.body.canteen.id}`, { status: 'INACTIVE' });
    expect(deactivated.body.canteen.status).toBe('INACTIVE');

    const staff = await registerStaff(t.server, 'Amit');
    const toInactive = await adminApi.patch(`/api/admin/staff/${staff.id}/assignment`, {
      canteenId: created.body.canteen.id,
    });
    expect(toInactive.status).toBe(409);

    const active = await createCanteen('Active', ['X']);
    const assigned = await adminApi.patch(`/api/admin/staff/${staff.id}/assignment`, { canteenId: active.id });
    expect(assigned.status).toBe(200);
    expect(assigned.body.staff).toMatchObject({ name: 'Amit', staffId: 'ST-001', canteenId: active.id, status: 'ACTIVE' });

    const list = await adminApi.get('/api/admin/staff');
    expect(list.body.staff).toHaveLength(1);

    // An admin cannot be targeted as "staff".
    const notStaff = await adminApi.patch(`/api/admin/staff/${admin.id}/assignment`, { canteenId: active.id });
    expect(notStaff.status).toBe(404);
  });
});
