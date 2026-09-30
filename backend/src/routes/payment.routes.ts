import { Router } from 'express';
import * as paymentController from '../controllers/payment.controller';
import { verifyFirebaseToken, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.use(verifyFirebaseToken);
router.post('/create', requireRole('STUDENT'), paymentController.createPayment);
router.post('/verify', requireRole('STUDENT'), paymentController.verifyPayment);

export default router;
