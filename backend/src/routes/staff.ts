import { Router } from 'express';
import { updateOrderStatus, verifyPickup, updateMenuAvailability, updateCanteenStatus } from '../controllers/staff';
import { authenticateStaff } from '../middleware/auth';

const router = Router();

router.patch('/orders/:id/status', authenticateStaff, updateOrderStatus);
router.post('/orders/:id/verify-pickup', authenticateStaff, verifyPickup);
router.patch('/menu/:id/availability', authenticateStaff, updateMenuAvailability);
router.patch('/canteen/status', authenticateStaff, updateCanteenStatus);

export default router;
