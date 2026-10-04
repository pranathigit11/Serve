import { randomUUID } from 'node:crypto';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { io as ioClient, type Socket } from 'socket.io-client';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { attachRealtime, closeRealtime } from '../src/realtime/io.js';

const EMULATOR = `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`;
const PROJECT = process.env.FIREBASE_PROJECT_ID;

/* -------------------------------------------------------------------- server */

export interface TestServer {
  server: http.Server;
  baseUrl: string;
  close: () => Promise<void>;
}

export async function startServer(): Promise<TestServer> {
  const server = http.createServer(createApp());
  attachRealtime(server, ['http://localhost:5173']);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  return {
    server,
    baseUrl: `http://127.0.0.1:${port}`,
    close: async () => {
      await closeRealtime();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}

export async function resetDatabase() {
  await prisma.$executeRawUnsafe(
    'TRUNCATE "Notification", "Payment", "OrderItem", "Order", "StaffCanteenRequest", "MenuItem", "MenuCategory", "StudentProfile", "StaffProfile", "User", "Canteen" RESTART IDENTITY CASCADE',
  );
  await fetch(`${EMULATOR}/emulator/v1/projects/${PROJECT}/accounts`, { method: 'DELETE' });
}

/* ------------------------------------------------------------------ identity */

export interface FirebaseTestUser {
  uid: string;
  email: string;
  idToken: string;
}

export async function createFirebaseUser(email = `${randomUUID().slice(0, 8)}@college.edu`): Promise<FirebaseTestUser> {
  const response = await fetch(`${EMULATOR}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'not-a-real-password-1', returnSecureToken: true }),
  });
  const body = (await response.json()) as { localId: string; idToken: string; error?: unknown };
  if (!response.ok) throw new Error(`Emulator sign-up failed: ${JSON.stringify(body)}`);
  return { uid: body.localId, email: email.toLowerCase(), idToken: body.idToken };
}

export function api(server: http.Server, token?: string) {
  const agent = request(server);
  const withAuth = (req: request.Test) => (token ? req.set('Authorization', `Bearer ${token}`) : req);
  return {
    get: (url: string) => withAuth(agent.get(url)),
    post: (url: string, body?: object) => withAuth(agent.post(url)).send(body ?? {}),
    patch: (url: string, body?: object) => withAuth(agent.patch(url)).send(body ?? {}),
    delete: (url: string) => withAuth(agent.delete(url)),
  };
}

export interface TestAccount extends FirebaseTestUser {
  id: string;
}

export async function registerStudent(server: http.Server, hostel = 'Krishna', name = 'Test Student') {
  const user = await createFirebaseUser();
  const res = await api(server, user.idToken).post('/api/students/register', {
    name,
    rollNumber: `R${randomUUID().slice(0, 8)}`,
    hostel,
  });
  if (res.status !== 201) throw new Error(`register student failed: ${res.status} ${JSON.stringify(res.body)}`);
  return { ...user, id: res.body.account.id as string };
}

export async function registerStaff(server: http.Server, name = 'Test Staff') {
  const user = await createFirebaseUser();
  const res = await api(server, user.idToken).post('/api/staff/register', { name });
  if (res.status !== 201) throw new Error(`register staff failed: ${res.status} ${JSON.stringify(res.body)}`);
  return { ...user, id: res.body.account.id as string };
}

/** Admins are provisioned out-of-band (scripts/create-admin.ts); mirror that here. */
export async function createAdmin(): Promise<TestAccount> {
  const user = await createFirebaseUser();
  const admin = await prisma.user.create({
    data: { firebaseUid: user.uid, email: user.email, name: 'Test Admin', role: 'ADMIN' },
  });
  return { ...user, id: admin.id };
}

/** Assigns staff to a canteen directly in the database (the approval flow itself is tested separately). */
export async function assignStaff(staffId: string, canteenId: string) {
  await prisma.staffProfile.update({ where: { userId: staffId }, data: { canteenId, assignedAt: new Date() } });
}

/* ---------------------------------------------------------------- canteens */

export async function createCanteen(name: string, hostelsServed: string[], overrides: object = {}) {
  return prisma.canteen.create({ data: { name, location: `${name} block`, hostelsServed, ...overrides } });
}

export async function createMenu(canteenId: string, items: { name: string; price: number; isAvailable?: boolean }[]) {
  const category = await prisma.menuCategory.create({ data: { canteenId, name: 'Snacks', sortOrder: 0 } });
  const created = [];
  for (const item of items) {
    created.push(
      await prisma.menuItem.create({
        data: {
          canteenId,
          categoryId: category.id,
          name: item.name,
          price: item.price,
          prepTimeMinutes: 10,
          isAvailable: item.isAvailable ?? true,
        },
      }),
    );
  }
  return { category, items: created };
}

/* ---------------------------------------------------------------- checkout */

export async function placeOrder(
  server: http.Server,
  token: string,
  canteenId: string,
  items: { menuItemId: string; quantity: number }[],
  key = randomUUID(),
) {
  return api(server, token).post('/api/orders', { canteenId, items }).set('Idempotency-Key', key);
}

/** Full happy-path checkout: order → payment → mock gateway → verify. */
export async function checkout(
  server: http.Server,
  token: string,
  canteenId: string,
  items: { menuItemId: string; quantity: number }[],
) {
  const order = await placeOrder(server, token, canteenId, items);
  if (order.status !== 201) throw new Error(`order failed: ${order.status} ${JSON.stringify(order.body)}`);
  const payment = await api(server, token).post('/api/payments', { orderId: order.body.order.id });
  const gateway = await api(server, token).post(`/api/payments/mock/${payment.body.payment.id}/complete`, {
    outcome: 'SUCCESS',
  });
  const verify = await api(server, token).post('/api/payments/verify', gateway.body.result);
  if (verify.status !== 200) throw new Error(`verify failed: ${verify.status} ${JSON.stringify(verify.body)}`);
  return verify.body.order as { id: string; status: string; orderNumber: string; totalAmount: number };
}

/* ------------------------------------------------------------------ sockets */

export function connectSocket(baseUrl: string, token?: string): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socket = ioClient(baseUrl, {
      auth: token ? { token } : {},
      transports: ['websocket'],
      reconnection: false,
      forceNew: true,
    });
    socket.once('connect', () => resolve(socket));
    socket.once('connect_error', (error) => {
      socket.close();
      reject(error);
    });
  });
}

export function waitForEvent<T = Record<string, unknown>>(
  socket: Socket,
  event: string,
  predicate: (payload: T) => boolean = () => true,
  timeoutMs = 4000,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, handler);
      reject(new Error(`Timed out waiting for ${event}`));
    }, timeoutMs);
    const handler = (payload: T) => {
      if (!predicate(payload)) return;
      clearTimeout(timer);
      socket.off(event, handler);
      resolve(payload);
    };
    socket.on(event, handler);
  });
}

/** Collects every event received on a socket, for asserting that nothing leaked. */
export function recordEvents(socket: Socket) {
  const events: { event: string; payload: unknown }[] = [];
  socket.onAny((event: string, payload: unknown) => events.push({ event, payload }));
  return events;
}

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
