import { Request, Response, NextFunction } from 'express';
import * as hostelsService from '../services/hostels.service';

export const getHostels = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const hostels = await hostelsService.getHostels();
    res.json({ success: true, data: hostels });
  } catch (error) {
    next(error);
  }
};

export const getHostelById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: 'Hostel ID is required' });
    }

    const hostel = await hostelsService.getHostelById(id as string);
    if (!hostel) {
      return res.status(404).json({ success: false, message: 'Hostel not found' });
    }

    res.json({ success: true, data: hostel });
  } catch (error) {
    next(error);
  }
};
