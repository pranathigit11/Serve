/**
 * Payment flow (provider = MOCK):
 *
 *   POST /api/payments                     create a payment attempt for an unpaid order
 *   POST /api/payments/mock/:id/complete   simulated gateway: returns a result signed with
 *                                          MOCK_PAYMENT_SECRET (what Razorpay Checkout would
 *                                          hand back to the client)
 *   POST /api/payments/verify              server verifies the signature, amount and state,
 *                                          then marks payment SUCCEEDED and order PLACED in one
 *                                          transaction
 *
 * The client can never mark anything paid by itself: only /verify changes
 * payment/order state, and it requires a signature only the server can mint.
 * Replacing the mock with a real gateway means replacing the gateway step and
 * the signature check; the state machine stays the same.
 */
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';
import { Prisma } from '../generated/prisma/client.js';
import { AppError, badRequest, conflict, notFound } from '../lib/errors.js';
import { money, toPaise } from '../lib/money.js';
import { prisma, type TransactionClient } from '../lib/prisma.js';
import { orderDto } from './dto.js';
import { announcePlacedOrder, assertCanteenOpen, markOrderPlaced, priceLines } from './orders.service.js';

export type GatewayStatus = 'CAPTURED' | 'FAILED';

export interface GatewayResult {
  paymentId: string;
  providerOrderId: string;
  providerPaymentId: string;
  amountPaise: number;
  status: GatewayStatus;
  signature: string;
}

const randomId = (prefix: string) => `${prefix}_${randomBytes(12).toString('hex')}`;

function sign(result: Omit<GatewayResult, 'signature' | 'paymentId'>): string {
  return createHmac('sha256', env.MOCK_PAYMENT_SECRET)
    .update(`${result.providerOrderId}|${result.providerPaymentId}|${result.amountPaise}|${result.status}`)
    .digest('hex');
}

function signatureValid(result: GatewayResult): boolean {
  const expected = Buffer.from(sign(result), 'hex');
  const received = Buffer.from(result.signature, 'hex');
  return expected.length === received.length && timingSafeEqual(expected, received);
}

async function ownedPayment(studentId: string, paymentId: string, tx: TransactionClient = prisma) {
  const payment = await tx.payment.findUnique({ where: { id: paymentId }, include: { order: true } });
  if (!payment || payment.order.studentId !== studentId) {
    throw notFound('PAYMENT_NOT_FOUND', 'Payment not found.');
  }
  return payment;
}

async function lockOrder(tx: TransactionClient, orderId: string) {
  await tx.$queryRaw`SELECT 1 FROM "Order" WHERE id = ${orderId}::uuid FOR UPDATE`;
}

export async function createPayment(studentId: string, orderId: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order || order.studentId !== studentId) throw notFound('ORDER_NOT_FOUND', 'Order not found.');
    await lockOrder(tx, orderId);
    const current = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true, canteen: true } });

    if (current.status === 'CANCELLED') throw conflict('ORDER_NOT_PAYABLE', 'This order was cancelled.');
    if (current.status !== 'PENDING_PAYMENT') throw conflict('ALREADY_PAID', 'This order has already been paid.');

    // Do not take money for an order the canteen can no longer fulfil.
    assertCanteenOpen(current.canteen);
    const lines = current.items.map((item) => {
      if (!item.menuItemId) {
        throw badRequest('ITEM_NOT_FOUND', `${item.itemName} is no longer on the menu.`);
      }
      return { menuItemId: item.menuItemId, quantity: item.quantity };
    });
    await priceLines(tx, current.canteenId, lines);

    await tx.payment.updateMany({
      where: { orderId, status: 'CREATED' },
      data: { status: 'CANCELLED', failureReason: 'SUPERSEDED' },
    });
    return tx.payment.create({
      data: {
        orderId,
        provider: 'MOCK',
        providerOrderId: randomId('mock_order'),
        amount: current.totalAmount,
        currency: 'INR',
      },
    });
  });
}

/** Simulated gateway. Never changes payment/order state. */
export async function completeMockPayment(
  studentId: string,
  paymentId: string,
  outcome: 'SUCCESS' | 'FAILURE',
  paidAmount?: number,
): Promise<GatewayResult> {
  if (env.PAYMENT_MODE !== 'mock') throw notFound('NOT_FOUND', 'Route not found.');
  const payment = await ownedPayment(studentId, paymentId);
  if (payment.status !== 'CREATED') {
    throw conflict('PAYMENT_NOT_PENDING', 'This payment attempt is no longer open.');
  }
  const unsigned = {
    providerOrderId: payment.providerOrderId,
    providerPaymentId: randomId('mock_pay'),
    amountPaise: paidAmount !== undefined ? toPaise(money(paidAmount)) : toPaise(money(payment.amount)),
    status: (outcome === 'SUCCESS' ? 'CAPTURED' : 'FAILED') as GatewayStatus,
  };
  return { paymentId: payment.id, ...unsigned, signature: sign(unsigned) };
}

type VerifyOutcome =
  | { kind: 'success'; orderId: string }
  | { kind: 'failure'; error: AppError };

export async function verifyPayment(studentId: string, result: GatewayResult) {
  if (!/^[0-9a-f]{64}$/.test(result.signature) || !signatureValid(result)) {
    throw badRequest('SIGNATURE_INVALID', 'Payment could not be verified.');
  }

  let outcome: VerifyOutcome;
  try {
    outcome = await prisma.$transaction(async (tx): Promise<VerifyOutcome> => {
      const initial = await ownedPayment(studentId, result.paymentId, tx);
      await lockOrder(tx, initial.orderId);
      const payment = await tx.payment.findUniqueOrThrow({ where: { id: result.paymentId }, include: { order: true } });

      if (payment.providerOrderId !== result.providerOrderId) {
        throw badRequest('SIGNATURE_INVALID', 'Payment could not be verified.');
      }
      if (payment.status === 'SUCCEEDED') throw conflict('ALREADY_VERIFIED', 'This payment was already verified.');
      if (payment.status !== 'CREATED') {
        throw conflict('PAYMENT_NOT_PENDING', 'This payment attempt is no longer open.');
      }

      const fail = async (reason: string, error: AppError): Promise<VerifyOutcome> => {
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: 'FAILED', failureReason: reason, providerPaymentId: result.providerPaymentId },
        });
        return { kind: 'failure', error };
      };

      if (result.status !== 'CAPTURED') {
        return fail('DECLINED', new AppError(402, 'PAYMENT_FAILED', 'The payment was not completed.'));
      }
      const expectedPaise = toPaise(money(payment.order.totalAmount));
      if (result.amountPaise !== expectedPaise || toPaise(money(payment.amount)) !== expectedPaise) {
        return fail('AMOUNT_MISMATCH', badRequest('AMOUNT_MISMATCH', 'The paid amount does not match the order total.'));
      }
      if (payment.order.status === 'CANCELLED') {
        return fail('ORDER_NOT_PAYABLE', conflict('ORDER_NOT_PAYABLE', 'This order was cancelled before payment completed.'));
      }
      if (payment.order.status !== 'PENDING_PAYMENT') {
        return fail('ORDER_ALREADY_PAID', conflict('ALREADY_PAID', 'This order has already been paid.'));
      }

      await tx.payment.update({
        where: { id: payment.id },
        data: { status: 'SUCCEEDED', providerPaymentId: result.providerPaymentId, verifiedAt: new Date() },
      });
      await markOrderPlaced(tx, payment.orderId);
      return { kind: 'success', orderId: payment.orderId };
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      // The same gateway payment id was already used.
      throw conflict('ALREADY_VERIFIED', 'This payment was already verified.');
    }
    throw error;
  }

  if (outcome.kind === 'failure') throw outcome.error;

  const order = await prisma.order.findUniqueOrThrow({
    where: { id: outcome.orderId },
    include: { items: true, canteen: true, student: { include: { studentProfile: true } } },
  });
  await announcePlacedOrder(order);
  return orderDto(order);
}

export async function cancelPayment(studentId: string, paymentId: string) {
  const payment = await ownedPayment(studentId, paymentId);
  const updated = await prisma.payment.updateMany({
    where: { id: payment.id, status: 'CREATED' },
    data: { status: 'CANCELLED', failureReason: 'CANCELLED_BY_USER' },
  });
  if (updated.count === 0) throw conflict('PAYMENT_NOT_PENDING', 'This payment attempt is no longer open.');
  return { id: payment.id, status: 'CANCELLED' as const };
}
