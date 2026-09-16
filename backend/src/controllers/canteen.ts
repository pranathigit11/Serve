import { Request, Response } from 'express';

export const getCanteenStatus = async (req: Request, res: Response) => {
  // GET /api/canteen/status mock
  res.status(200).json({
    status: "OPEN",
    message: "Orders open until 9 PM",
    updatedAt: "2026-09-16T18:00:00Z"
  });
};
