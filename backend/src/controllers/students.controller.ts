import { Request, Response, NextFunction } from 'express';
import * as studentsService from '../services/students.service';

export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = req.user!.studentId!;
    const student = await studentsService.getStudentById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const responseData = {
      id: student.id,
      name: student.name,
      studentId: student.studentId,
      email: student.email,
      isActive: student.isActive,
      role: 'STUDENT',
      hostel: student.hostel.name,
      assignedCanteen: student.hostel.canteen,
    };

    res.json({ success: true, data: responseData });
  } catch (error) {
    next(error);
  }
};

export const getStudentById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: 'Student ID is required' });
    }
    
    if (req.user!.role === 'STUDENT' && id !== req.user!.studentId) {
      return res.status(403).json({ success: false, message: 'You do not have permission to perform this action' });
    }

    const student = await studentsService.getStudentById(id as string);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Format response to include assigned canteen nicely
    const responseData = {
      id: student.id,
      name: student.name,
      studentId: student.studentId,
      email: student.email,
      isActive: student.isActive,
      hostel: student.hostel.name,
      assignedCanteen: student.hostel.canteen,
    };

    res.json({ success: true, data: responseData });
  } catch (error) {
    next(error);
  }
};
