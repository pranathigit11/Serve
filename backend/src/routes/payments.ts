import { Router } from 'express';
import { createPaymentOrder, verifyPayment, webhook } from '../controllers/payments';
import { authenticateStudent } from '../middleware/auth';

const router = Router();

router.post('/create-order', authenticateStudent, createPaymentOrder);
router.post('/verify', authenticateStudent, verifyPayment);
// Webhook doesn't use the standard token auth, it uses razorpay signature validation
router.post('/webhook', webhook);

export default router;
