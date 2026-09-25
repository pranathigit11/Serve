import { Request, Response, NextFunction } from 'express';
import * as orderService from '../services/order.service';
import { OrderStatus } from '@prisma/client';
import { getIO } from '../socket';

export const createOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { studentId, canteenId, items } = req.body;
    if (!studentId || !canteenId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid order data' });
    }

    const order = await orderService.createOrder(studentId, canteenId, items);
    
    // Emit real-time event
    const io = getIO();
    io.to(`canteen:${canteenId}`).emit('order:created', order);
    io.to(`student:${studentId}`).emit('order:created', order);

    res.json({ success: true, data: order });
  } catch (error: any) {
    if (error.message.includes('not found') || error.message.includes('unavailable') || error.message.includes('not currently accepting') || error.message.includes('does not match') || error.message.includes('does not belong')) {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  }
};

export const confirmPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const order = await orderService.confirmPayment(id as string);
    
    // Emit real-time event
    const io = getIO();
    io.to(`student:${order.studentId}`).emit('order:status_updated', order);
    io.to(`canteen:${order.canteenId}`).emit('order:status_updated', order);

    res.json({ success: true, data: order });
  } catch (error: any) {
    if (error.message.includes('not found') || error.message.includes('not in PLACED state')) {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  }
};

export const cancelOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const order = await orderService.cancelOrder(id as string);
    
    // Emit real-time event
    const io = getIO();
    io.to(`student:${order.studentId}`).emit('order:cancelled', order);
    io.to(`canteen:${order.canteenId}`).emit('order:cancelled', order);

    res.json({ success: true, data: order });
  } catch (error: any) {
    if (error.message.includes('not found') || error.message.includes('cannot be cancelled')) {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  }
};

export const updateOrderStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status, canteenId } = req.body;
    
    if (!status || !canteenId) {
      return res.status(400).json({ success: false, message: 'Status and canteenId are required' });
    }

    const order = await orderService.updateOrderStatus(id as string, status as OrderStatus, canteenId);
    
    // Emit real-time event
    const io = getIO();
    io.to(`student:${order.studentId}`).emit('order:status_updated', order);
    io.to(`canteen:${canteenId}`).emit('order:status_updated', order);

    res.json({ success: true, data: order });
  } catch (error: any) {
    if (error.message.includes('not found') || error.message.includes('Unauthorized') || error.message.includes('Invalid status transition')) {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  }
};

export const getOrderById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const order = await orderService.getOrderById(id as string);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

export const getStudentOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { studentId } = req.params;
    const orders = await orderService.getStudentOrders(studentId as string);
    res.json({ success: true, data: orders });
  } catch (error) {
    next(error);
  }
};

export const getStudentActiveOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { studentId } = req.params;
    const orders = await orderService.getStudentActiveOrders(studentId as string);
    res.json({ success: true, data: orders });
  } catch (error) {
    next(error);
  }
};

export const getCanteenOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { canteenId } = req.params;
    const { status, search } = req.query;
    
    const orders = await orderService.getCanteenOrders(canteenId as string, status as OrderStatus, search as string);
    res.json({ success: true, data: orders });
  } catch (error) {
    next(error);
  }
};

export const getCanteenOrderById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { canteenId, orderId } = req.params;
    const order = await orderService.getCanteenOrderById(canteenId as string, orderId as string);
    res.json({ success: true, data: order });
  } catch (error: any) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ success: false, message: error.message });
    }
    next(error);
  }
};
