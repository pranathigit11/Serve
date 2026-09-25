import { Router } from 'express';
import * as canteensController from '../controllers/canteens.controller';

const router = Router();

router.get('/', canteensController.getCanteens);
router.get('/:id', canteensController.getCanteenById);
router.get('/:id/order-taking', canteensController.getCanteenOrderTakingStatus);
router.patch('/:id/order-taking', canteensController.updateCanteenOrderTaking);

export default router;
