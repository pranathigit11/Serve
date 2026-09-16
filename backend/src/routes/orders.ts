import { Router } from 'express';
import { createOrder, getMyOrders, getOrderById } from '../controllers/orders';
import { authenticateStudent, authenticateStudentOrStaff } from '../middleware/auth';

const router = Router();

router.post('/', authenticateStudent, createOrder);
router.get('/my-orders', authenticateStudent, getMyOrders);
router.get('/:id', authenticateStudentOrStaff, getOrderById);

export default router;
