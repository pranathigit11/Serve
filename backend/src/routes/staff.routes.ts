import { Router } from 'express';
import * as staffController from '../controllers/staff.controller';

const router = Router();

router.get('/:id', staffController.getStaffById);
router.post('/:id/canteen-change-requests', staffController.createChangeRequest);
router.get('/:id/canteen-change-requests', staffController.getChangeRequests);

export default router;
