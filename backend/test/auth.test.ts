import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/lib/prisma.js';
import {
  api,
  assignStaff,
  createAdmin,
  createCanteen,
  createFirebaseUser,
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

describe('authentication', () => {
  it('rejects requests without a token (401)', async () => {
    for (const url of ['/api/me', '/api/staff/me', '/api/admin/canteens', '/api/students/me/orders', '/api/notifications']) {
      const res = await api(t.server).get(url);
      expect(res.status, url).toBe(401);
      expect(res.body.error).toBe('AUTH_REQUIRED');
    }
  });

  it('rejects invalid and malformed tokens (401)', async () => {
    for (const header of ['Bearer not-a-jwt', 'Bearer eyJhbGciOiJub25lIn0.e30.', 'Basic abc', 'Bearer']) {
      const res = await api(t.server).get('/api/me').set('Authorization', header);
      expect(res.status, header).toBe(401);
    }
  });

  it('rejects a valid Firebase user that has no SERVE account (403, safe)', async () => {
    const user = await createFirebaseUser();
    const res = await api(t.server, user.idToken).get('/api/me');
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('ACCOUNT_NOT_REGISTERED');
    expect(JSON.stringify(res.body)).not.toMatch(/stack|prisma/i);
  });

  it('derives identity from the token, never from the request body', async () => {
    const canteen = await createCanteen('Krishna', ['Krishna']);
    const user = await createFirebaseUser();
    const res = await api(t.server, user.idToken).post('/api/students/register', {
      name: 'Asha',
      rollNumber: 'cs101',
      hostel: 'Krishna',
      role: 'ADMIN',
      firebaseUid: 'someone-else',
      email: 'spoof@evil.com',
    });
    expect(res.status).toBe(201);
    expect(res.body.account).toMatchObject({
      role: 'STUDENT',
      email: user.email,
      student: { rollNumber: 'CS101', hostel: 'Krishna', selectedCanteenId: canteen.id },
    });
    const stored = await prisma.user.findUniqueOrThrow({ where: { id: res.body.account.id } });
    expect(stored.firebaseUid).toBe(user.uid);
  });

  it('prevents registering twice or switching role by re-registering (409)', async () => {
    const student = await registerStudent(t.server);
    const again = await api(t.server, student.idToken).post('/api/students/register', {
      name: 'x',
      rollNumber: 'other',
      hostel: 'Krishna',
    });
    expect(again.status).toBe(409);
    const asStaff = await api(t.server, student.idToken).post('/api/staff/register', { name: 'x' });
    expect(asStaff.status).toBe(409);
  });

  it('rejects a duplicate roll number', async () => {
    const first = await createFirebaseUser();
    const second = await createFirebaseUser();
    await api(t.server, first.idToken).post('/api/students/register', { name: 'a', rollNumber: 'dup1', hostel: 'X' });
    const res = await api(t.server, second.idToken).post('/api/students/register', {
      name: 'b',
      rollNumber: 'DUP1',
      hostel: 'X',
    });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('ROLL_NUMBER_TAKEN');
  });

  it('validates registration input (400)', async () => {
    const user = await createFirebaseUser();
    const res = await api(t.server, user.idToken).post('/api/students/register', { name: '', hostel: 'X' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });
});

describe('public endpoints', () => {
  it('lists only active canteens without authentication, and nothing else is public', async () => {
    await createCanteen('Open', ['X']);
    await createCanteen('Closed', ['Y'], { status: 'INACTIVE' });
    const res = await api(t.server).get('/api/canteens');
    expect(res.status).toBe(200);
    expect(res.body.canteens.map((c: { name: string }) => c.name)).toEqual(['Open']);
    expect(Object.keys(res.body.canteens[0]).sort()).toEqual(
      ['hostelsServed', 'id', 'isAcceptingOrders', 'location', 'name', 'status'].sort(),
    );
    const menu = await api(t.server).get(`/api/canteens/${res.body.canteens[0].id}/menu`);
    expect(menu.status).toBe(401);
  });
});

describe('role authorization (PostgreSQL role is authoritative)', () => {
  it('returns 403 for the wrong role on every protected area', async () => {
    const student = await registerStudent(t.server);
    const staff = await registerStaff(t.server);
    const admin = await createAdmin();

    const cases: [string, string, string][] = [
      [student.idToken, 'get', '/api/staff/me'],
      [student.idToken, 'get', '/api/admin/canteens'],
      [student.idToken, 'get', '/api/admin/staff'],
      [staff.idToken, 'get', '/api/admin/canteen-requests'],
      [staff.idToken, 'post', '/api/orders'],
      [staff.idToken, 'post', '/api/payments'],
      [staff.idToken, 'get', '/api/students/me/orders'],
      [admin.idToken, 'get', '/api/staff/orders'],
      [admin.idToken, 'post', '/api/orders'],
    ];
    for (const [token, method, url] of cases) {
      const client = api(t.server, token);
      const res = method === 'get' ? await client.get(url) : await client.post(url, {});
      expect(res.status, `${method} ${url}`).toBe(403);
    }
  });

  it('does not let anyone self-register as admin', async () => {
    const user = await createFirebaseUser();
    for (const url of ['/api/admin/register', '/api/admins/register', '/api/register']) {
      const res = await api(t.server, user.idToken).post(url, { role: 'ADMIN' });
      expect([403, 404]).toContain(res.status);
    }
    expect(await prisma.user.count({ where: { role: 'ADMIN' } })).toBe(0);
  });

  it('blocks staff with no canteen assignment from canteen operations', async () => {
    const staff = await registerStaff(t.server);
    for (const url of ['/api/staff/orders', '/api/staff/menu', '/api/staff/canteen']) {
      const res = await api(t.server, staff.idToken).get(url);
      expect(res.status, url).toBe(403);
      expect(res.body.error).toBe('NO_CANTEEN_ASSIGNED');
    }
  });

  it('rejects inactive accounts immediately (staff deactivated by admin)', async () => {
    const canteen = await createCanteen('A', ['A']);
    const staff = await registerStaff(t.server);
    await assignStaff(staff.id, canteen.id);
    expect((await api(t.server, staff.idToken).get('/api/staff/orders')).status).toBe(200);

    const admin = await createAdmin();
    const res = await api(t.server, admin.idToken).patch(`/api/admin/staff/${staff.id}/status`, { status: 'INACTIVE' });
    expect(res.status).toBe(200);

    const after = await api(t.server, staff.idToken).get('/api/staff/orders');
    expect(after.status).toBe(403);
    expect(after.body.error).toBe('ACCOUNT_INACTIVE');
  });

  it('rejects inactive students', async () => {
    const student = await registerStudent(t.server);
    await prisma.user.update({ where: { id: student.id }, data: { status: 'INACTIVE' } });
    const res = await api(t.server, student.idToken).get('/api/me');
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('ACCOUNT_INACTIVE');
  });

  it('returns account details for /api/me', async () => {
    const staff = await registerStaff(t.server, 'Rahul');
    const res = await api(t.server, staff.idToken).get('/api/me');
    expect(res.status).toBe(200);
    expect(res.body.account).toMatchObject({ role: 'STAFF', name: 'Rahul', staff: { staffId: 'ST-001', canteenId: null } });
  });
});

describe('error handling', () => {
  it('rejects malformed JSON without leaking internals', async () => {
    const student = await registerStudent(t.server);
    const res = await api(t.server, student.idToken)
      .post('/api/orders')
      .set('Content-Type', 'application/json')
      .send('{"canteenId": ');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_JSON');
  });

  it('rejects non-uuid path ids with 400 instead of a database error', async () => {
    const student = await registerStudent(t.server);
    const res = await api(t.server, student.idToken).get("/api/orders/1' OR '1'='1");
    expect(res.status).toBe(400);
  });
});
