import { Router } from 'express';
import * as adminController from '../controllers/admin.controller';

const router = Router();

// Canteens
router.get('/canteens', adminController.getCanteens);
router.post('/canteens', adminController.createCanteen);
router.patch('/canteens/:id', adminController.updateCanteen);
router.patch('/canteens/:id/activate', (req, res, next) => { req.body.isActive = true; adminController.updateCanteen(req, res, next); });
router.patch('/canteens/:id/deactivate', (req, res, next) => { req.body.isActive = false; adminController.updateCanteen(req, res, next); });

// Hostels
router.get('/canteens/:id/hostels', adminController.getCanteenHostels);
router.put('/canteens/:id/hostels', adminController.updateCanteenHostels);

// Staff
router.get('/staff', adminController.getStaff);
router.get('/staff/:id', adminController.getStaffById);
router.post('/staff', adminController.createStaff);
router.patch('/staff/:id', adminController.updateStaff);
router.patch('/staff/:id/canteen', adminController.updateStaff);
router.patch('/staff/:id/activate', (req, res, next) => { req.body.isActive = true; adminController.updateStaff(req, res, next); });
router.patch('/staff/:id/deactivate', (req, res, next) => { req.body.isActive = false; adminController.updateStaff(req, res, next); });

// Change Requests
router.get('/canteen-change-requests', adminController.getChangeRequests);
router.patch('/canteen-change-requests/:id/approve', adminController.approveChangeRequest);
router.patch('/canteen-change-requests/:id/reject', adminController.rejectChangeRequest);

// Dashboard
router.get('/pending-actions', adminController.getPendingActions);
router.get('/summary', adminController.getSummary);

export default router;
