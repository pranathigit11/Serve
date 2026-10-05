import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/lib/prisma.js';
import {
  api,
  assignStaff,
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
  const staffA = await registerStaff(t.server, 'Staff A');
  const staffB = await registerStaff(t.server, 'Staff B');
  await assignStaff(staffA.id, canteenA.id);
  await assignStaff(staffB.id, canteenB.id);
  const student = await registerStudent(t.server, 'A');
  return { canteenA, canteenB, staffA, staffB, student };
}

describe('database-driven, canteen-specific menus', () => {
  it('K–R: staff-created category/item propagates to students; price and availability changes are enforced', async () => {
    const { canteenA, canteenB, staffA, student } = await setup();
    const staffApi = api(t.server, staffA.idToken);
    const studentApi = api(t.server, student.idToken);

    // Empty canteen menu: empty arrays, no fallback data.
    const empty = await studentApi.get(`/api/canteens/${canteenA.id}/menu`);
    expect(empty.status).toBe(200);
    expect(empty.body.items).toEqual([]);
    expect(empty.body.categories).toEqual([]);

    // K. Create category (any canteenId in the body is ignored).
    const category = await staffApi.post('/api/staff/menu/categories', {
      name: 'Test Backend Category',
      canteenId: canteenB.id,
    });
    expect(category.status).toBe(201);
    expect(category.body.category.canteenId).toBe(canteenA.id);

    // L. Create item.
    const item = await staffApi.post('/api/staff/menu/items', {
      categoryId: category.body.category.id,
      name: 'Test Backend Item',
      price: 99,
      description: 'Created by the integration test',
      canteenId: canteenB.id,
    });
    expect(item.status).toBe(201);
    const itemId = item.body.item.id as string;

    // Exists in PostgreSQL, owned by canteen A.
    const row = await prisma.menuItem.findUniqueOrThrow({ where: { id: itemId } });
    expect(row.canteenId).toBe(canteenA.id);
    expect(row.price.toString()).toBe('99');

    // M. Student sees the new item in canteen A only.
    const menuA = await studentApi.get(`/api/canteens/${canteenA.id}/menu`);
    expect(menuA.body.items).toEqual([
      expect.objectContaining({ id: itemId, name: 'Test Backend Item', price: 99, isAvailable: true, category: 'Test Backend Category' }),
    ]);
    expect(menuA.body.categories.map((c: { name: string }) => c.name)).toEqual(['Test Backend Category']);
    const menuB = await studentApi.get(`/api/canteens/${canteenB.id}/menu`);
    expect(menuB.body.items).toEqual([]);

    // N/O. Price change visible to students.
    const priced = await staffApi.patch(`/api/staff/menu/items/${itemId}`, { price: 120.5 });
    expect(priced.body.item.price).toBe(120.5);
    const afterPrice = await studentApi.get(`/api/canteens/${canteenA.id}/menu`);
    expect(afterPrice.body.items[0].price).toBe(120.5);

    // P/Q. Disable → students see it unavailable.
    const disabled = await staffApi.patch(`/api/staff/menu/items/${itemId}/availability`, { isAvailable: false });
    expect(disabled.body.item.isAvailable).toBe(false);
    const afterDisable = await studentApi.get(`/api/canteens/${canteenA.id}/menu`);
    expect(afterDisable.body.items[0].isAvailable).toBe(false);

    // R. Unavailable item cannot be ordered.
    const order = await placeOrder(t.server, student.idToken, canteenA.id, [{ menuItemId: itemId, quantity: 1 }]);
    expect(order.status).toBe(409);
    expect(order.body).toMatchObject({ error: 'ITEM_UNAVAILABLE', itemId });

    // Re-enable then order at the new price.
    await staffApi.patch(`/api/staff/menu/items/${itemId}/availability`, { isAvailable: true });
    const ok = await placeOrder(t.server, student.idToken, canteenA.id, [{ menuItemId: itemId, quantity: 2 }]);
    expect(ok.status).toBe(201);
    expect(ok.body.order.totalAmount).toBe(241);

    // Deleted items disappear and cannot be ordered; history keeps the snapshot.
    expect((await staffApi.delete(`/api/staff/menu/items/${itemId}`)).status).toBe(204);
    const afterDelete = await studentApi.get(`/api/canteens/${canteenA.id}/menu`);
    expect(afterDelete.body.items).toEqual([]);
    const deletedOrder = await placeOrder(t.server, student.idToken, canteenA.id, [{ menuItemId: itemId, quantity: 1 }]);
    expect(deletedOrder.status).toBe(400);
    expect(deletedOrder.body.error).toBe('ITEM_NOT_FOUND');
    const snapshot = await prisma.orderItem.findFirstOrThrow({ where: { orderId: ok.body.order.id } });
    expect(snapshot).toMatchObject({ itemName: 'Test Backend Item', quantity: 2 });
    expect(snapshot.unitPrice.toString()).toBe('120.5');
  });

  it('disabling an item in one canteen does not affect another canteen', async () => {
    const { canteenA, canteenB, staffA, student } = await setup();
    const menuA = await createMenu(canteenA.id, [{ name: 'Masala Dosa', price: 60 }]);
    const menuB = await createMenu(canteenB.id, [{ name: 'Masala Dosa', price: 55 }]);
    await api(t.server, staffA.idToken).patch(`/api/staff/menu/items/${menuA.items[0]!.id}/availability`, {
      isAvailable: false,
    });
    const b = await api(t.server, student.idToken).get(`/api/canteens/${canteenB.id}/menu`);
    expect(b.body.items[0]).toMatchObject({ id: menuB.items[0]!.id, isAvailable: true, price: 55 });
  });

  it('AC: staff cannot manage another canteen’s menu by changing ids (403)', async () => {
    const { canteenB, staffA, staffB } = await setup();
    const menuB = await createMenu(canteenB.id, [{ name: 'Tea', price: 20 }]);
    const itemB = menuB.items[0]!.id;
    const staffApi = api(t.server, staffA.idToken);

    const attempts = [
      await staffApi.patch(`/api/staff/menu/items/${itemB}`, { price: 1 }),
      await staffApi.patch(`/api/staff/menu/items/${itemB}/availability`, { isAvailable: false }),
      await staffApi.delete(`/api/staff/menu/items/${itemB}`),
      await staffApi.patch(`/api/staff/menu/categories/${menuB.category.id}`, { name: 'Hacked' }),
      await staffApi.post('/api/staff/menu/items', { categoryId: menuB.category.id, name: 'Injected', price: 1 }),
    ];
    for (const res of attempts) expect(res.status).toBe(403);

    // Moving an own item into another canteen's category is also rejected.
    const menuA = await prisma.menuCategory.create({ data: { canteenId: (await prisma.staffProfile.findUniqueOrThrow({ where: { userId: staffA.id } })).canteenId!, name: 'Mine' } });
    const own = await staffApi.post('/api/staff/menu/items', { categoryId: menuA.id, name: 'Own', price: 10 });
    const move = await staffApi.patch(`/api/staff/menu/items/${own.body.item.id}`, { categoryId: menuB.category.id });
    expect(move.status).toBe(403);

    const untouched = await prisma.menuItem.findUniqueOrThrow({ where: { id: itemB } });
    expect(untouched).toMatchObject({ isAvailable: true, deletedAt: null });
    expect(untouched.price.toString()).toBe('20');
    expect((await prisma.menuCategory.findUniqueOrThrow({ where: { id: menuB.category.id } })).name).toBe('Snacks');
    expect(await prisma.menuItem.count({ where: { name: 'Injected' } })).toBe(0);

    // Staff B can still manage it.
    const ok = await api(t.server, staffB.idToken).patch(`/api/staff/menu/items/${itemB}`, { price: 25 });
    expect(ok.status).toBe(200);
  });

  it('database rejects an item whose category belongs to a different canteen (composite FK)', async () => {
    const { canteenA, canteenB } = await setup();
    const categoryB = await prisma.menuCategory.create({ data: { canteenId: canteenB.id, name: 'B only' } });
    await expect(
      prisma.menuItem.create({
        data: { canteenId: canteenA.id, categoryId: categoryB.id, name: 'Bad', price: 10 },
      }),
    ).rejects.toThrow();
  });

  it('validates menu input (price, names, duplicates)', async () => {
    const { staffA } = await setup();
    const staffApi = api(t.server, staffA.idToken);
    const category = await staffApi.post('/api/staff/menu/categories', { name: 'Juices' });
    expect((await staffApi.post('/api/staff/menu/categories', { name: 'Juices' })).status).toBe(409);
    for (const price of [0, -5, 10.555, 1_000_000]) {
      const res = await staffApi.post('/api/staff/menu/items', { categoryId: category.body.category.id, name: 'X', price });
      expect(res.status, String(price)).toBe(400);
    }
    const badImage = await staffApi.post('/api/staff/menu/items', {
      categoryId: category.body.category.id,
      name: 'X',
      price: 10,
      imageUrl: 'javascript:alert(1)',
    });
    expect(badImage.status).toBe(400);
  });

  it('hides inactive canteens’ menus from students', async () => {
    const { canteenA, student } = await setup();
    await prisma.canteen.update({ where: { id: canteenA.id }, data: { status: 'INACTIVE' } });
    const res = await api(t.server, student.idToken).get(`/api/canteens/${canteenA.id}/menu`);
    expect(res.status).toBe(404);
    const list = await api(t.server, student.idToken).get('/api/canteens');
    expect(list.body.canteens.map((c: { id: string }) => c.id)).not.toContain(canteenA.id);
  });
});
