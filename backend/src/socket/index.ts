import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { env } from '../config/env';

let io: Server;

export const initSocket = (server: HttpServer) => {
  io = new Server(server, {
    cors: {
      origin: [
        env.STUDENT_APP_URL,
        env.STAFF_DASHBOARD_URL,
        env.ADMIN_PORTAL_URL,
        'http://localhost:5000',
        'http://localhost:5001'
      ],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      credentials: true
    }
  });

  io.on('connection', (socket: Socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on('join:student', (studentId: string) => {
      socket.join(`student:${studentId}`);
      console.log(`Socket ${socket.id} joined student:${studentId}`);
    });

    socket.on('join:staff', (staffId: string) => {
      socket.join(`staff:${staffId}`);
      console.log(`Socket ${socket.id} joined staff:${staffId}`);
    });

    socket.on('join:canteen', (canteenId: string) => {
      socket.join(`canteen:${canteenId}`);
      console.log(`Socket ${socket.id} joined canteen:${canteenId}`);
    });

    socket.on('leave:canteen', (canteenId: string) => {
      socket.leave(`canteen:${canteenId}`);
      console.log(`Socket ${socket.id} left canteen:${canteenId}`);
    });

    socket.on('join:admin', () => {
      socket.join('admin');
      console.log(`Socket ${socket.id} joined admin`);
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};
