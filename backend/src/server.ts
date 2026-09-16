import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { getAuth } from 'firebase-admin/auth';
import dotenv from 'dotenv';

dotenv.config();

import canteenRoutes from './routes/canteen';
import menuRoutes from './routes/menu';
import ordersRoutes from './routes/orders';
import paymentsRoutes from './routes/payments';
import staffRoutes from './routes/staff';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
  }
});

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/canteen', canteenRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/staff', staffRoutes);

// Realtime system - Socket.IO authentication
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error'));
  }
  try {
    const decodedToken = await getAuth().verifyIdToken(token);
    (socket as any).user = decodedToken;
    next();
  } catch (error) {
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  const user = (socket as any).user;
  
  if (user.role === 'STAFF') {
    socket.join('staff');
  } else {
    socket.join(`student:${user.uid}`);
  }

  socket.on('disconnect', () => {
    // Handle disconnect
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
