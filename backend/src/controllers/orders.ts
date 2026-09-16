import { Request, Response } from 'express';

export const createOrder = async (req: Request, res: Response) => {
  // POST /api/orders mock
  res.status(201).json({
    orderId: "uuid",
    orderNumber: "ORD-1234",
    totalAmount: 90,
    status: "PENDING"
  });
};

export const getMyOrders = async (req: Request, res: Response) => {
  // GET /api/orders/my-orders mock
  res.status(200).json({
    orders: [
      {
        orderId: "uuid",
        orderNumber: "ORD-1234",
        status: "COMPLETED",
        totalAmount: 90,
        createdAt: "2026-09-16T18:00:00Z"
      }
    ]
  });
};

export const getOrderById = async (req: Request, res: Response) => {
  // GET /api/orders/:id mock
  res.status(200).json({
    orderId: "uuid",
    orderNumber: "ORD-1234",
    status: "PREPARING",
    estimatedReadyAt: "2026-09-16T18:20:00Z",
    pickupWindowStart: "2026-09-16T18:15:00Z",
    pickupWindowEnd: "2026-09-16T18:30:00Z",
    pickupPin: "4821",
    items: [ { name: "Veg Puff", quantity: 2, priceAtTime: 30 } ]
  });
};
