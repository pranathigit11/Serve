import { Request, Response, NextFunction } from 'express';
import * as studentsService from '../services/students.service';

export const getStudentById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: 'Student ID is required' });
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
