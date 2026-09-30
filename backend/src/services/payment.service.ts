import { prisma } from '../config/prisma';
import { PaymentStatus, PaymentProvider, OrderStatus } from '@prisma/client';
import { getIO } from '../socket';

export const createPayment = async (orderId: string, studentId: string) => {
  const order = await prisma.order.findFirst({
    where: { id: orderId, studentId },
    include: { payment: true }
  });

  if (!order) throw new Error('Order not found or unauthorized');
  
  if (order.status !== OrderStatus.PLACED) {
    throw new Error('Order is no longer in a payable state');
  }

  const mode = process.env.PAYMENT_MODE || 'mock';
  
  if (order.payment) {
    return { order, payment: order.payment };
  }

  const payment = await prisma.payment.create({
    data: {
      orderId: order.id,
      amount: order.totalAmount,
      provider: PaymentProvider.RAZORPAY,
      status: PaymentStatus.PENDING,
      providerOrderId: mode === 'mock' ? `mock_order_${Date.now()}` : undefined
    }
  });

  return { order, payment };
};

export const verifyPayment = async (paymentId: string, success: boolean, providerPaymentId?: string) => {
  return await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { id: paymentId },
      include: { order: true }
    });

    if (!payment) throw new Error('Payment not found');
    
    if (payment.status === PaymentStatus.SUCCESS || payment.order.status === OrderStatus.PAYMENT_CONFIRMED) {
      return { payment, order: payment.order, isDuplicate: true };
    }

    if (success) {
      const updatedPayment = await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.SUCCESS,
          providerPaymentId: providerPaymentId || `mock_payment_${Date.now()}`
        }
      });

      const updatedOrder = await tx.order.update({
        where: { id: payment.orderId },
        data: { status: OrderStatus.PAYMENT_CONFIRMED }
      });

      return { payment: updatedPayment, order: updatedOrder, isDuplicate: false };
    } else {
      const updatedPayment = await tx.payment.update({
        where: { id: paymentId },
        data: { status: PaymentStatus.FAILED }
      });

      return { payment: updatedPayment, order: payment.order, isDuplicate: false };
    }
  });
};
