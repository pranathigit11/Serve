import { Router } from 'express';
import * as canteensController from '../controllers/canteens.controller';
import { verifyFirebaseToken, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.get('/', canteensController.getCanteens);
router.get('/:id', canteensController.getCanteenById);

router.get('/:id/order-taking', verifyFirebaseToken, requireRole('STAFF'), canteensController.getCanteenOrderTakingStatus);
router.patch('/:id/order-taking', verifyFirebaseToken, requireRole('STAFF'), canteensController.updateCanteenOrderTaking);

export default router;
