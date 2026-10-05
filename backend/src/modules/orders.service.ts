import { Prisma, type OrderStatus } from '../generated/prisma/client.js';
import { badRequest, conflict, forbidden, notFound } from '../lib/errors.js';
import { money } from '../lib/money.js';
import { prisma, type TransactionClient } from '../lib/prisma.js';
import { publishOrderPlaced, publishOrderStatus } from '../realtime/events.js';
import { orderDto, type OrderWithRelations } from './dto.js';
import { notify, notifyCanteenStaff } from './notifications.js';

export const orderInclude = {
  items: true,
  canteen: true,
  student: { include: { studentProfile: true } },
} satisfies Prisma.OrderInclude;

/** Statuses staff can see: only paid orders reach the kitchen. */
export const STAFF_VISIBLE_STATUSES: OrderStatus[] = ['PLACED', 'PREPARING', 'READY', 'COLLECTED'];

const STAFF_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus>> = {
  PLACED: 'PREPARING',
  PREPARING: 'READY',
  READY: 'COLLECTED',
};

const STATUS_TIMESTAMP: Partial<Record<OrderStatus, 'preparingAt' | 'readyAt' | 'collectedAt'>> = {
  PREPARING: 'preparingAt',
  READY: 'readyAt',
  COLLECTED: 'collectedAt',
};

export interface CreateOrderInput {
  studentId: string;
  canteenId: string;
  idempotencyKey: string;
  items: { menuItemId: string; quantity: number }[];
}

export const MAX_QUANTITY_PER_ITEM = 20;

/** Locks a canteen row for the duration of the transaction (shared lock). */
async function lockCanteen(tx: TransactionClient, canteenId: string) {
  await tx.$queryRaw`SELECT 1 FROM "Canteen" WHERE id = ${canteenId}::uuid FOR SHARE`;
  return tx.canteen.findUnique({ where: { id: canteenId } });
}

export function assertCanteenOpen(canteen: { status: string; isAcceptingOrders: boolean } | null) {
  if (!canteen) throw notFound('CANTEEN_NOT_FOUND', 'Canteen not found.');
  if (canteen.status !== 'ACTIVE') {
    throw conflict('CANTEEN_INACTIVE', 'This canteen is currently unavailable.');
  }
  if (!canteen.isAcceptingOrders) {
    throw conflict('CANTEEN_NOT_ACCEPTING_ORDERS', 'This canteen is not accepting orders right now.');
  }
}

/**
 * Validates every line against the database (existence, canteen, availability)
 * under row locks and returns priced snapshot lines. Client prices/totals are
 * never read.
 */
export async function priceLines(tx: TransactionClient, canteenId: string, lines: CreateOrderInput['items']) {
  const ids = lines.map((line) => line.menuItemId);
  await tx.$queryRaw`SELECT 1 FROM "MenuItem" WHERE id = ANY(${ids}::uuid[]) FOR SHARE`;
  const menuItems = await tx.menuItem.findMany({ where: { id: { in: ids } } });
  const byId = new Map(menuItems.map((item) => [item.id, item]));

  return lines.map((line) => {
    const item = byId.get(line.menuItemId);
    if (!item || item.deletedAt) {
      throw badRequest('ITEM_NOT_FOUND', 'One of the items is no longer on the menu.', { itemId: line.menuItemId });
    }
    if (item.canteenId !== canteenId) {
      throw badRequest('ITEM_NOT_IN_CANTEEN', 'One of the items is not sold at this canteen.', {
        itemId: line.menuItemId,
      });
    }
    if (!item.isAvailable) {
      throw conflict('ITEM_UNAVAILABLE', `${item.name} is out of stock.`, { itemId: item.id });
    }
    const unitPrice = money(item.price);
    return {
      menuItemId: item.id,
      itemName: item.name,
      unitPrice,
      quantity: line.quantity,
      lineTotal: unitPrice.mul(line.quantity),
      prepTimeMinutes: item.prepTimeMinutes,
    };
  });
}

/** Merges duplicate lines for the same item. */
export function normaliseLines(items: CreateOrderInput['items']) {
  const merged = new Map<string, number>();
  for (const { menuItemId, quantity } of items) merged.set(menuItemId, (merged.get(menuItemId) ?? 0) + quantity);
  const lines = [...merged.entries()].map(([menuItemId, quantity]) => ({ menuItemId, quantity }));
  for (const line of lines) {
    if (line.quantity > MAX_QUANTITY_PER_ITEM) {
      throw badRequest('QUANTITY_TOO_LARGE', `You can order at most ${MAX_QUANTITY_PER_ITEM} of one item.`, {
        itemId: line.menuItemId,
      });
    }
  }
  return lines;
}

async function findByIdempotencyKey(studentId: string, idempotencyKey: string) {
  return prisma.order.findUnique({
    where: { studentId_idempotencyKey: { studentId, idempotencyKey } },
    include: orderInclude,
  });
}

/** Creates an order awaiting payment. Returns `{ order, created }`. */
export async function createOrder(input: CreateOrderInput): Promise<{ order: OrderWithRelations; created: boolean }> {
  const existing = await findByIdempotencyKey(input.studentId, input.idempotencyKey);
  if (existing) {
    if (existing.canteenId !== input.canteenId) {
      throw conflict('IDEMPOTENCY_KEY_REUSED', 'This checkout key was already used for another order.');
    }
    return { order: existing, created: false };
  }

  const lines = normaliseLines(input.items);
  try {
    const order = await prisma.$transaction(async (tx) => {
      assertCanteenOpen(await lockCanteen(tx, input.canteenId));
      const priced = await priceLines(tx, input.canteenId, lines);
      const total = priced.reduce((sum, line) => sum.add(line.lineTotal), money(0));
      return tx.order.create({
        data: {
          studentId: input.studentId,
          canteenId: input.canteenId,
          idempotencyKey: input.idempotencyKey,
          status: 'PENDING_PAYMENT',
          totalAmount: total,
          items: {
            create: priced.map(({ menuItemId, itemName, unitPrice, quantity, lineTotal }) => ({
              menuItemId,
              itemName,
              unitPrice,
              quantity,
              lineTotal,
            })),
          },
        },
        include: orderInclude,
      });
    });
    return { order, created: true };
  } catch (error) {
    // Two concurrent requests with the same key: the loser returns the winner's order.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const winner = await findByIdempotencyKey(input.studentId, input.idempotencyKey);
      if (winner) return { order: winner, created: false };
    }
    throw error;
  }
}

/** Student view of one of their own orders. Other students' orders are reported as not found. */
export async function getStudentOrder(studentId: string, orderId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: orderInclude });
  if (!order || order.studentId !== studentId) throw notFound('ORDER_NOT_FOUND', 'Order not found.');
  return order;
}

export async function listStudentOrders(studentId: string) {
  return prisma.order.findMany({
    where: { studentId, status: { not: 'PENDING_PAYMENT' } },
    include: orderInclude,
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
}

/** A student may abandon an order only before it has been paid. */
export async function cancelUnpaidOrder(studentId: string, orderId: string) {
  const order = await getStudentOrder(studentId, orderId);
  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.order.updateMany({
      where: { id: order.id, status: 'PENDING_PAYMENT' },
      data: { status: 'CANCELLED', cancelledAt: new Date(), cancellationReason: 'Cancelled by student' },
    });
    if (updated.count === 0) {
      throw conflict('ORDER_NOT_CANCELLABLE', 'Only unpaid orders can be cancelled.');
    }
    await tx.payment.updateMany({ where: { orderId: order.id, status: 'CREATED' }, data: { status: 'CANCELLED' } });
    return tx.order.findUniqueOrThrow({ where: { id: order.id }, include: orderInclude });
  });
  publishOrderStatus(result, orderDto(result, { includeStudent: true }), studentId, orderDto(result), false);
  return result;
}

export async function listCanteenOrders(canteenId: string) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return prisma.order.findMany({
    where: {
      canteenId,
      OR: [{ status: { in: ['PLACED', 'PREPARING', 'READY'] } }, { status: 'COLLECTED', collectedAt: { gte: since } }],
    },
    include: orderInclude,
    orderBy: [{ placedAt: 'desc' }, { createdAt: 'desc' }],
    take: 500,
  });
}

/**
 * Staff transition PLACED → PREPARING → READY → COLLECTED. The order must belong
 * to the staff member's own canteen; the transition is applied with a
 * compare-and-set so concurrent clicks cannot skip or repeat a step.
 */
export async function advanceOrderStatus(canteenId: string, orderId: string, nextStatus: OrderStatus) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || !STAFF_VISIBLE_STATUSES.includes(order.status)) {
    throw notFound('ORDER_NOT_FOUND', 'Order not found.');
  }
  if (order.canteenId !== canteenId) throw forbidden('FORBIDDEN', 'This order belongs to another canteen.');
  if (STAFF_TRANSITIONS[order.status] !== nextStatus) {
    throw conflict('INVALID_TRANSITION', `Cannot move an order from ${order.status} to ${nextStatus}.`, {
      currentStatus: order.status,
    });
  }
  const timestampField = STATUS_TIMESTAMP[nextStatus];
  const updated = await prisma.order.updateMany({
    where: { id: orderId, canteenId, status: order.status },
    data: { status: nextStatus, ...(timestampField ? { [timestampField]: new Date() } : {}) },
  });
  if (updated.count === 0) {
    throw conflict('INVALID_TRANSITION', 'The order was updated by someone else. Refresh and try again.');
  }
  const result = await prisma.order.findUniqueOrThrow({ where: { id: orderId }, include: orderInclude });
  publishOrderStatus(result, orderDto(result, { includeStudent: true }), result.studentId, orderDto(result), true);

  const studentMessages: Partial<Record<OrderStatus, { title: string; message: string; type: 'INFO' | 'SUCCESS' }>> = {
    PREPARING: { title: 'Order Preparing', message: `Order #${result.orderNumber} is being prepared.`, type: 'INFO' },
    READY: { title: 'Order Ready', message: `Order #${result.orderNumber} is ready for pickup.`, type: 'SUCCESS' },
    COLLECTED: { title: 'Order Collected', message: `Order #${result.orderNumber} has been collected.`, type: 'INFO' },
  };
  const studentMessage = studentMessages[nextStatus];
  if (studentMessage) await notify([{ userId: result.studentId, orderId: result.id, ...studentMessage }]);
  if (nextStatus === 'READY') {
    await notifyCanteenStaff(canteenId, {
      type: 'SUCCESS',
      title: 'Order Ready',
      message: `Order #${result.orderNumber} is ready for pickup`,
      orderId: result.id,
    });
  }
  return result;
}

/** Called by the payment service inside its transaction once a payment is verified. */
export async function markOrderPlaced(tx: TransactionClient, orderId: string) {
  const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
  const prepTimes = await tx.menuItem.findMany({
    where: { id: { in: order.items.map((item) => item.menuItemId).filter((id): id is string => !!id) } },
    select: { prepTimeMinutes: true },
  });
  const prepMinutes = Math.max(5, ...prepTimes.map((item) => item.prepTimeMinutes));
  const now = new Date();
  return tx.order.update({
    where: { id: orderId },
    data: { status: 'PLACED', placedAt: now, estimatedReadyAt: new Date(now.getTime() + prepMinutes * 60_000) },
    include: orderInclude,
  });
}

export async function announcePlacedOrder(order: OrderWithRelations) {
  publishOrderPlaced(order, orderDto(order, { includeStudent: true }), order.studentId, orderDto(order));
  const hostel = order.student?.studentProfile?.hostel;
  await notifyCanteenStaff(order.canteenId, {
    type: 'INFO',
    title: 'New Order',
    message: `New order #${order.orderNumber} received${hostel ? ` from ${hostel} Hostel` : ''}`,
    orderId: order.id,
  });
  await notify([
    {
      userId: order.studentId,
      type: 'SUCCESS',
      title: 'Payment Confirmed',
      message: `Order #${order.orderNumber} has been placed with ${order.canteen.name}.`,
      orderId: order.id,
    },
  ]);
}

/** Cancels unpaid orders older than the TTL (abandoned checkouts). */
export async function expireStalePendingOrders(ttlMinutes: number) {
  const cutoff = new Date(Date.now() - ttlMinutes * 60_000);
  const stale = await prisma.order.findMany({
    where: { status: 'PENDING_PAYMENT', createdAt: { lt: cutoff } },
    select: { id: true },
    take: 500,
  });
  if (stale.length === 0) return 0;
  const ids = stale.map((order) => order.id);
  return prisma.$transaction(async (tx) => {
    const result = await tx.order.updateMany({
      where: { id: { in: ids }, status: 'PENDING_PAYMENT' },
      data: { status: 'CANCELLED', cancelledAt: new Date(), cancellationReason: 'Payment not completed in time' },
    });
    await tx.payment.updateMany({
      where: { orderId: { in: ids }, status: 'CREATED' },
      data: { status: 'CANCELLED', failureReason: 'EXPIRED' },
    });
    return result.count;
  });
}
