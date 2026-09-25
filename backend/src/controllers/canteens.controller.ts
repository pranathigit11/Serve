import { Request, Response, NextFunction } from 'express';
import * as canteensService from '../services/canteens.service';
import { getIO } from '../socket';

export const getCanteens = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const canteens = await canteensService.getCanteens();
    res.json({ success: true, data: canteens });
  } catch (error) {
    next(error);
  }
};

export const getCanteenById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: 'Canteen ID is required' });
    }
    
    const canteen = await canteensService.getCanteenById(id as string);
    if (!canteen) {
      return res.status(404).json({ success: false, message: 'Canteen not found' });
    }
    
    res.json({ success: true, data: canteen });
  } catch (error) {
    next(error);
  }
};

export const getCanteenOrderTakingStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const canteen = await canteensService.getCanteenById(id as string);
    if (!canteen) {
      return res.status(404).json({ success: false, message: 'Canteen not found' });
    }
    res.json({
      success: true,
      data: {
        canteenId: canteen.id,
        isActive: canteen.isActive,
        isAcceptingOrders: canteen.isAcceptingOrders
      }
    });
  } catch (error) {
    next(error);
  }
};

export const updateCanteenOrderTaking = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { isAcceptingOrders } = req.body;
    
    if (typeof isAcceptingOrders !== 'boolean') {
      return res.status(400).json({ success: false, message: 'isAcceptingOrders must be a boolean' });
    }

    const canteen = await canteensService.updateCanteenOrderTaking(id as string, isAcceptingOrders);
    
    const io = getIO();
    io.to(`canteen:${id}`).emit('canteen:order_taking_updated', {
      canteenId: id,
      isAcceptingOrders
    });

    res.json({ success: true, data: canteen });
  } catch (error: any) {
    // Check if error is related to canteen not found (Prisma throws specific error for update not found)
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Canteen not found' });
    }
    next(error);
  }
};
