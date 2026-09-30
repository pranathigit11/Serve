import { Request, Response, NextFunction } from 'express';
import { getAuth } from 'firebase-admin/auth';
import { getFirebaseAdmin } from '../config/firebaseAdmin';
import { getStudentByFirebaseUid } from '../services/students.service';
import { getStaffByFirebaseUid } from '../services/staff.service';
import { getAdminByFirebaseUid } from '../services/admin.service';

export type Role = 'STUDENT' | 'STAFF' | 'ADMIN';

export type AuthenticatedUser = {
  firebaseUid: string;
  role: Role;
  studentId?: string;
  staffId?: string;
  adminId?: string;
  assignedCanteenId?: string;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export const verifyFirebaseToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const token = authHeader.split('Bearer ')[1];
    
    let decodedToken;
    try {
      decodedToken = await getAuth(getFirebaseAdmin()).verifyIdToken(token);
    } catch (error) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const firebaseUid = decodedToken.uid;

    const admin = await getAdminByFirebaseUid(firebaseUid);
    if (admin && admin.isActive) {
      req.user = { firebaseUid, role: 'ADMIN', adminId: admin.id };
      return next();
    }

    const staff = await getStaffByFirebaseUid(firebaseUid);
    if (staff && staff.isActive) {
      req.user = { 
        firebaseUid, 
        role: 'STAFF', 
        staffId: staff.id, 
        assignedCanteenId: staff.assignedCanteenId 
      };
      return next();
    }

    const student = await getStudentByFirebaseUid(firebaseUid);
    if (student && student.isActive) {
      req.user = { firebaseUid, role: 'STUDENT', studentId: student.id };
      return next();
    }

    return res.status(403).json({ success: false, message: 'User is not registered with SERVE' });
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
};

export const requireRole = (...roles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'You do not have permission to perform this action' });
    }

    next();
  };
};
