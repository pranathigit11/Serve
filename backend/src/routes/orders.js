"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const orders_1 = require("../controllers/orders");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.post('/', auth_1.authenticateStudent, orders_1.createOrder);
router.get('/my-orders', auth_1.authenticateStudent, orders_1.getMyOrders);
router.get('/:id', auth_1.authenticateStudentOrStaff, orders_1.getOrderById);
exports.default = router;
//# sourceMappingURL=orders.js.map