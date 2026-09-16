import { Router } from 'express';
import { getCanteenStatus } from '../controllers/canteen';
import { authenticateStudentOrStaff } from '../middleware/auth';

const router = Router();

router.get('/status', authenticateStudentOrStaff, getCanteenStatus);

export default router;
