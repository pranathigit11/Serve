import { Router } from 'express';
import * as studentsController from '../controllers/students.controller';
import { verifyFirebaseToken, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.use(verifyFirebaseToken);
router.get('/me', requireRole('STUDENT'), studentsController.getMe);
router.get('/:id', requireRole('STUDENT', 'ADMIN'), studentsController.getStudentById);

export default router;
