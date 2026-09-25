import { Router } from 'express';
import * as orderController from '../controllers/order.controller';

const router = Router();

router.post('/', orderController.createOrder);
router.post('/:id/confirm-payment', orderController.confirmPayment);
router.patch('/:id/cancel', orderController.cancelOrder);
router.patch('/:id/status', orderController.updateOrderStatus);
router.get('/:id', orderController.getOrderById);

router.get('/student/:studentId', orderController.getStudentOrders);
router.get('/student/:studentId/active', orderController.getStudentActiveOrders);

router.get('/canteen/:canteenId', orderController.getCanteenOrders);
router.get('/canteen/:canteenId/:orderId', orderController.getCanteenOrderById);

export default router;
