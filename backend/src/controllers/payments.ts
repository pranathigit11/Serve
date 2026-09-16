import { Request, Response } from 'express';

export const createPaymentOrder = async (req: Request, res: Response) => {
  // POST /api/payments/create-order mock
  res.status(200).json({
    razorpayOrderId: "order_xyz",
    amount: 9000,
    currency: "INR",
    keyId: "rzp_test_xxx"
  });
};

export const verifyPayment = async (req: Request, res: Response) => {
  // POST /api/payments/verify mock
  res.status(200).json({ status: "CONFIRMED" });
};

export const webhook = async (req: Request, res: Response) => {
  // POST /api/payments/webhook mock
  res.status(200).json({ received: true });
};
