import { Request, Response, NextFunction } from 'express';
import * as menuService from '../services/menu.service';
import { getIO } from '../socket';

export const getMenu = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { canteenId } = req.query;
    
    // We expect canteenId to be a string if provided
    const menu = await menuService.getMenu(canteenId as string | undefined);
    
    res.json({ success: true, data: menu });
  } catch (error) {
    next(error);
  }
};

export const getStaffMenu = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { canteenId } = req.params;
    const menu = await menuService.getStaffMenu(canteenId as string);
    res.json({ success: true, data: menu });
  } catch (error) {
    next(error);
  }
};

export const updateMenuAvailability = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { menuItemId } = req.params;
    const { canteenId, isAvailable } = req.body;
    
    if (!canteenId || typeof isAvailable !== 'boolean') {
      return res.status(400).json({ success: false, message: 'canteenId and boolean isAvailable are required' });
    }

    const item = await menuService.updateMenuAvailability(menuItemId as string, canteenId, isAvailable);
    
    const io = getIO();
    io.to(`canteen:${canteenId}`).emit('menu:availability_updated', {
      menuItemId,
      canteenId,
      isAvailable
    });

    res.json({ success: true, data: item });
  } catch (error: any) {
    if (error.message.includes('not found')) return res.status(404).json({ success: false, message: error.message });
    if (error.message.includes('Unauthorized')) return res.status(409).json({ success: false, message: error.message });
    next(error);
  }
};

export const createMenuItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { canteenId } = req.params;
    const { name, description, price, imageUrl, categoryId } = req.body;

    if (!name || price === undefined || price <= 0 || !categoryId) {
      return res.status(400).json({ success: false, message: 'name, price (>0), and categoryId are required' });
    }

    const item = await menuService.createMenuItem(canteenId as string, { name, description, price, imageUrl, categoryId });
    res.json({ success: true, data: item });
  } catch (error: any) {
    if (error.message.includes('not found') || error.message.includes('inactive')) return res.status(404).json({ success: false, message: error.message });
    next(error);
  }
};

export const updateMenuItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { menuItemId } = req.params;
    const { canteenId, name, description, price, imageUrl, categoryId, isAvailable } = req.body;

    if (!canteenId) return res.status(400).json({ success: false, message: 'canteenId is required for authorization' });

    const data: any = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (price !== undefined) {
      if (price <= 0) return res.status(400).json({ success: false, message: 'price must be > 0' });
      data.price = price;
    }
    if (imageUrl !== undefined) data.imageUrl = imageUrl;
    if (categoryId !== undefined) data.categoryId = categoryId;
    if (isAvailable !== undefined) data.isAvailable = isAvailable;

    const item = await menuService.updateMenuItem(menuItemId as string, canteenId, data);

    if (isAvailable !== undefined) {
      const io = getIO();
      io.to(`canteen:${canteenId}`).emit('menu:availability_updated', {
        menuItemId,
        canteenId,
        isAvailable
      });
    }

    res.json({ success: true, data: item });
  } catch (error: any) {
    if (error.message.includes('not found')) return res.status(404).json({ success: false, message: error.message });
    if (error.message.includes('Unauthorized')) return res.status(409).json({ success: false, message: error.message });
    next(error);
  }
};
