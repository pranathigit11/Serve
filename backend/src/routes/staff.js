"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const staff_1 = require("../controllers/staff");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.patch('/orders/:id/status', auth_1.authenticateStaff, staff_1.updateOrderStatus);
router.post('/orders/:id/verify-pickup', auth_1.authenticateStaff, staff_1.verifyPickup);
router.patch('/menu/:id/availability', auth_1.authenticateStaff, staff_1.updateMenuAvailability);
router.patch('/canteen/status', auth_1.authenticateStaff, staff_1.updateCanteenStatus);
exports.default = router;
//# sourceMappingURL=staff.js.map