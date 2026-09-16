import { Router } from 'express';
import { getMenu, getMenuItem } from '../controllers/menu';
import { authenticateStudentOrStaff } from '../middleware/auth';

const router = Router();

router.get('/', authenticateStudentOrStaff, getMenu);
router.get('/:id', authenticateStudentOrStaff, getMenuItem);

export default router;
