import { Request, Response, NextFunction } from 'express';
import * as adminService from '../services/admin.service';
import { ChangeRequestStatus } from '@prisma/client';
import { getIO } from '../socket';

export const getCanteens = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const canteens = await adminService.getCanteens();
    res.json({ success: true, data: canteens });
  } catch (error) {
    next(error);
  }
};

export const createCanteen = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, location, hostelIds } = req.body;
    if (!name || !location) {
      return res.status(400).json({ success: false, message: 'Name and location are required' });
    }

    const canteen = await adminService.createCanteen({ name, location, hostelIds: hostelIds || [] });
    res.json({ success: true, data: canteen });
  } catch (error: any) {
    if (error.message.includes('already exists') || error.message.includes('invalid hostel')) {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  }
};

export const updateCanteen = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, location, isActive, isAcceptingOrders } = req.body;
    
    const data: any = {};
    if (name !== undefined) data.name = name;
    if (location !== undefined) data.location = location;
    if (isActive !== undefined) data.isActive = isActive;
    if (isAcceptingOrders !== undefined) data.isAcceptingOrders = isAcceptingOrders;

    const canteen = await adminService.updateCanteen(id as string, data);
    res.json({ success: true, data: canteen });
  } catch (error: any) {
    if (error.message.includes('already exists')) return res.status(400).json({ success: false, message: error.message });
    if (error.code === 'P2025') return res.status(404).json({ success: false, message: 'Canteen not found' });
    next(error);
  }
};

export const getCanteenHostels = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const hostels = await adminService.getCanteenHostels(id as string);
    res.json({ success: true, data: hostels });
  } catch (error) {
    next(error);
  }
};

export const updateCanteenHostels = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { hostelIds } = req.body;
    if (!Array.isArray(hostelIds)) return res.status(400).json({ success: false, message: 'hostelIds must be an array' });

    const hostels = await adminService.updateCanteenHostels(id as string, hostelIds);
    res.json({ success: true, data: hostels });
  } catch (error: any) {
    if (error.message.includes('invalid hostel')) return res.status(400).json({ success: false, message: error.message });
    if (error.message.includes('not found')) return res.status(404).json({ success: false, message: error.message });
    next(error);
  }
};

export const getStaff = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const staff = await adminService.getStaff();
    res.json({ success: true, data: staff });
  } catch (error) {
    next(error);
  }
};

export const getStaffById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const staff = await adminService.getStaffById(id as string);
    if (!staff) return res.status(404).json({ success: false, message: 'Staff not found' });
    res.json({ success: true, data: staff });
  } catch (error) {
    next(error);
  }
};

export const createStaff = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, staffId, email, assignedCanteenId } = req.body;
    if (!name || !staffId || !email || !assignedCanteenId) {
      return res.status(400).json({ success: false, message: 'Name, staffId, email, and assignedCanteenId are required' });
    }

    const staff = await adminService.createStaff({ name, staffId, email, assignedCanteenId });
    res.json({ success: true, data: staff });
  } catch (error: any) {
    if (error.message.includes('already exists') || error.message.includes('Invalid or inactive')) {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  }
};

export const updateStaff = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, email, assignedCanteenId, isActive } = req.body;
    
    const data: any = {};
    if (name !== undefined) data.name = name;
    if (email !== undefined) data.email = email;
    if (assignedCanteenId !== undefined) data.assignedCanteenId = assignedCanteenId;
    if (isActive !== undefined) data.isActive = isActive;

    const staff = await adminService.updateStaff(id as string, data);
    res.json({ success: true, data: staff });
  } catch (error: any) {
    if (error.message.includes('Invalid or inactive') || error.message.includes('already in use')) {
      return res.status(400).json({ success: false, message: error.message });
    }
    if (error.code === 'P2025') return res.status(404).json({ success: false, message: 'Staff not found' });
    next(error);
  }
};

export const getChangeRequests = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.query;
    const requests = await adminService.getChangeRequests(status as ChangeRequestStatus);
    res.json({ success: true, data: requests });
  } catch (error) {
    next(error);
  }
};

export const approveChangeRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { adminId } = req.body;
    if (!adminId) return res.status(400).json({ success: false, message: 'adminId is required' });

    const result = await adminService.approveChangeRequest(id as string, adminId);
    
    const io = getIO();
    io.to('admin').emit('change_request:updated', {
      requestId: result.id,
      staffId: result.staffId,
      status: 'APPROVED'
    });
    io.to(`staff:${result.staffId}`).emit('change_request:updated', {
      requestId: result.id,
      staffId: result.staffId,
      status: 'APPROVED'
    });
    
    // Also emit assignment updated
    io.to('admin').emit('staff:canteen_assignment_updated', {
      staffId: result.staffId,
      assignedCanteenId: result.requestedCanteenId
    });
    io.to(`staff:${result.staffId}`).emit('staff:canteen_assignment_updated', {
      staffId: result.staffId,
      assignedCanteenId: result.requestedCanteenId
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    if (error.message.includes('not found') || error.message.includes('inactive')) return res.status(404).json({ success: false, message: error.message });
    if (error.message.includes('not PENDING')) return res.status(409).json({ success: false, message: error.message });
    next(error);
  }
};

export const rejectChangeRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { adminId, reason } = req.body;
    if (!adminId) return res.status(400).json({ success: false, message: 'adminId is required' });

    const result = await adminService.rejectChangeRequest(id as string, adminId, reason);
    
    const io = getIO();
    io.to('admin').emit('change_request:updated', {
      requestId: result.id,
      staffId: result.staffId,
      status: 'REJECTED',
      reviewNote: result.reviewNote
    });
    io.to(`staff:${result.staffId}`).emit('change_request:updated', {
      requestId: result.id,
      staffId: result.staffId,
      status: 'REJECTED',
      reviewNote: result.reviewNote
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    if (error.message.includes('not found') || error.message.includes('inactive')) return res.status(404).json({ success: false, message: error.message });
    if (error.message.includes('not PENDING')) return res.status(409).json({ success: false, message: error.message });
    next(error);
  }
};

export const getPendingActions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const actions = await adminService.getPendingActions();
    res.json({ success: true, data: actions });
  } catch (error) {
    next(error);
  }
};

export const getSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const summary = await adminService.getSummary();
    res.json({ success: true, data: summary });
  } catch (error) {
    next(error);
  }
};
