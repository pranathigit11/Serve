import { Router } from 'express';
import * as hostelsController from '../controllers/hostels.controller';

const router = Router();

router.get('/', hostelsController.getHostels);
router.get('/:id', hostelsController.getHostelById);

export default router;
