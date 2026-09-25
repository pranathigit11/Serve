import { Router } from 'express';
import * as menuController from '../controllers/menu.controller';

const router = Router();

router.get('/', menuController.getMenu);

router.get('/canteen/:canteenId', menuController.getStaffMenu);
router.post('/canteen/:canteenId', menuController.createMenuItem);
router.patch('/:menuItemId/availability', menuController.updateMenuAvailability);
router.patch('/:menuItemId', menuController.updateMenuItem);

export default router;
