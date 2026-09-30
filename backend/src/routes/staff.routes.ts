import { Router } from 'express';
import * as staffController from '../controllers/staff.controller';
import { verifyFirebaseToken, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.use(verifyFirebaseToken);
router.use(requireRole('STAFF'));

router.get('/:id', staffController.getStaffById);
router.post('/:id/canteen-change-requests', staffController.createChangeRequest);
router.get('/:id/canteen-change-requests', staffController.getChangeRequests);

export default router;
