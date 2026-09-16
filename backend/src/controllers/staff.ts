import { Request, Response } from 'express';

export const updateOrderStatus = async (req: Request, res: Response) => {
  // PATCH /api/staff/orders/:id/status mock
  res.status(200).json({
    orderId: req.params.id,
    status: req.body.status || "PREPARING"
  });
};

export const verifyPickup = async (req: Request, res: Response) => {
  // POST /api/staff/orders/:id/verify-pickup mock
  res.status(200).json({
    orderId: req.params.id,
    status: "COMPLETED"
  });
};

export const updateMenuAvailability = async (req: Request, res: Response) => {
  // PATCH /api/staff/menu/:id/availability mock
  res.status(200).json({
    id: req.params.id,
    isAvailable: req.body.isAvailable !== undefined ? req.body.isAvailable : false
  });
};

export const updateCanteenStatus = async (req: Request, res: Response) => {
  // PATCH /api/staff/canteen/status mock
  res.status(200).json({
    status: req.body.status || "PAUSED"
  });
};
