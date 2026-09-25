import { Request, Response, NextFunction } from 'express';
import * as staffService from '../services/staff.service';
import { getIO } from '../socket';

export const getStaffById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: 'Staff ID is required' });
    }

    const staff = await staffService.getStaffById(id as string);
    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff not found' });
    }

    // Format response nicely
    const responseData = {
      id: staff.id,
      name: staff.name,
      staffId: staff.staffId,
      email: staff.email,
      isActive: staff.isActive,
      canteen: {
        id: staff.assignedCanteen.id,
        name: staff.assignedCanteen.name,
        location: staff.assignedCanteen.location,
        isActive: staff.assignedCanteen.isActive,
        isAcceptingOrders: staff.assignedCanteen.isAcceptingOrders
      },
      hostels: (staff.assignedCanteen as any).hostels || [],
    };

    res.json({ success: true, data: responseData });
  } catch (error) {
    next(error);
  }
};

export const createChangeRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { requestedCanteenId, reason } = req.body;

    const request = await staffService.createChangeRequest(id as string, requestedCanteenId, reason);
    
    const io = getIO();
    io.to('admin').emit('change_request:created', request);

    res.json({ success: true, data: request });
  } catch (error: any) {
    if (error.message.includes('not found') || error.message.includes('inactive')) return res.status(404).json({ success: false, message: error.message });
    if (error.message.includes('Already assigned') || error.message.includes('pending request')) return res.status(409).json({ success: false, message: error.message });
    if (error.message.includes('required') || error.message.includes('too long')) return res.status(400).json({ success: false, message: error.message });
    next(error);
  }
};

export const getChangeRequests = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const requests = await staffService.getChangeRequests(id as string);
    res.json({ success: true, data: requests });
  } catch (error) {
    next(error);
  }
};
