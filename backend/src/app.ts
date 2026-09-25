import express, { Application } from 'express';
import cors from 'cors';
import { env } from './config/env';
import healthRoutes from './routes/health.routes';
import canteensRoutes from './routes/canteens.routes';
import hostelsRoutes from './routes/hostels.routes';
import menuRoutes from './routes/menu.routes';
import studentsRoutes from './routes/students.routes';
import staffRoutes from './routes/staff.routes';
import orderRoutes from './routes/order.routes';
import adminRoutes from './routes/admin.routes';
import { errorHandler } from './middleware/error.middleware';
import { notFoundHandler } from './middleware/notFound.middleware';

const app: Application = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS Configuration
app.use(cors({
  origin: [
    env.STUDENT_APP_URL,
    env.STAFF_DASHBOARD_URL,
    env.ADMIN_PORTAL_URL
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  credentials: true
}));

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/canteens', canteensRoutes);
app.use('/api/hostels', hostelsRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/students', studentsRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);

// 404 Handler
app.use(notFoundHandler);

// Centralized Error Handler
app.use(errorHandler);

export default app;
