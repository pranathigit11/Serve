"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const payments_1 = require("../controllers/payments");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.post('/create-order', auth_1.authenticateStudent, payments_1.createPaymentOrder);
router.post('/verify', auth_1.authenticateStudent, payments_1.verifyPayment);
// Webhook doesn't use the standard token auth, it uses razorpay signature validation
router.post('/webhook', payments_1.webhook);
exports.default = router;
//# sourceMappingURL=payments.js.map