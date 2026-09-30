import { Router } from 'express';
import * as orderController from '../controllers/order.controller';
import { verifyFirebaseToken, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.use(verifyFirebaseToken);

// Students
router.post('/', requireRole('STUDENT'), orderController.createOrder);
router.post('/:id/confirm-payment', requireRole('STUDENT'), orderController.confirmPayment);
router.patch('/:id/cancel', requireRole('STUDENT'), orderController.cancelOrder);
router.get('/student/:studentId', requireRole('STUDENT'), orderController.getStudentOrders);
router.get('/student/:studentId/active', requireRole('STUDENT'), orderController.getStudentActiveOrders);

// Staff
router.get('/canteen/:canteenId', requireRole('STAFF'), orderController.getCanteenOrders);
router.get('/canteen/:canteenId/:orderId', requireRole('STAFF'), orderController.getCanteenOrderById);
router.patch('/:id/status', requireRole('STAFF'), orderController.updateOrderStatus);

// Mixed
router.get('/:id', requireRole('STUDENT', 'STAFF', 'ADMIN'), orderController.getOrderById);

export default router;
