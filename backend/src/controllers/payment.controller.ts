import { Request, Response, NextFunction } from 'express';
import * as paymentService from '../services/payment.service';
import { getIO } from '../socket';
import { OrderStatus } from '@prisma/client';

export const createPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orderId } = req.body;
    const studentId = req.user!.studentId!;
    
    if (!orderId) {
      return res.status(400).json({ success: false, message: 'orderId is required' });
    }

    const { payment } = await paymentService.createPayment(orderId, studentId);
    res.json({ success: true, data: payment });
  } catch (error: any) {
    if (error.message.includes('not found') || error.message.includes('payable state')) {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  }
};

export const verifyPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { paymentId, success, providerPaymentId } = req.body;
    if (!paymentId || success === undefined) {
      return res.status(400).json({ success: false, message: 'paymentId and success are required' });
    }

    const result = await paymentService.verifyPayment(paymentId, success, providerPaymentId);
    
    if (result.order.studentId !== req.user!.studentId) {
      return res.status(403).json({ success: false, message: 'You do not have permission to perform this action' });
    }

    if (success && !result.isDuplicate) {
      const io = getIO();
      io.to(`student:${result.order.studentId}`).emit('order:status_updated', result.order);
      io.to(`canteen:${result.order.canteenId}`).emit('order:status_updated', result.order);
    }

    res.json({ success: true, data: result.payment });
  } catch (error: any) {
    if (error.message.includes('not found')) {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  }
};
