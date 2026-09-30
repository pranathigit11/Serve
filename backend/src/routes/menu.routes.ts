import { Router } from 'express';
import * as menuController from '../controllers/menu.controller';
import { verifyFirebaseToken, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.get('/', menuController.getMenu);

router.get('/canteen/:canteenId', verifyFirebaseToken, requireRole('STAFF'), menuController.getStaffMenu);
router.post('/canteen/:canteenId', verifyFirebaseToken, requireRole('STAFF'), menuController.createMenuItem);

router.patch('/:menuItemId/availability', verifyFirebaseToken, requireRole('STAFF'), menuController.updateMenuAvailability);
router.patch('/:menuItemId', verifyFirebaseToken, requireRole('STAFF'), menuController.updateMenuItem);

export default router;
