import { Router, Request, Response } from 'express';
import { prisma } from '../config/prisma';

const router = Router();

// Basic health check
router.get('/', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'serve-backend',
    timestamp: new Date().toISOString()
  });
});

// Database connection health check
router.get('/db', async (req: Request, res: Response) => {
  try {
    // A simple query to verify the connection is active
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Database health check failed:', error);
    res.status(500).json({
      status: 'error',
      database: 'disconnected',
      message: 'Failed to connect to the database',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
