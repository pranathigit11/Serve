"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.webhook = exports.verifyPayment = exports.createPaymentOrder = void 0;
const createPaymentOrder = async (req, res) => {
    // POST /api/payments/create-order mock
    res.status(200).json({
        razorpayOrderId: "order_xyz",
        amount: 9000,
        currency: "INR",
        keyId: "rzp_test_xxx"
    });
};
exports.createPaymentOrder = createPaymentOrder;
const verifyPayment = async (req, res) => {
    // POST /api/payments/verify mock
    res.status(200).json({ status: "CONFIRMED" });
};
exports.verifyPayment = verifyPayment;
const webhook = async (req, res) => {
    // POST /api/payments/webhook mock
    res.status(200).json({ received: true });
};
exports.webhook = webhook;
//# sourceMappingURL=payments.js.map