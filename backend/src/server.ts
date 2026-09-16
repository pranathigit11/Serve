import http from 'http';
import { Server } from 'socket.io';
import app from './app';

const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: '*', // To be restricted in production
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE']
  }
});

io.on('connection', (socket) => {
  console.log(`New client connected: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
  
  // Future: Join specific rooms for staff vs students
  // socket.on('join', (role) => { ... });
});

// Start listening
server.listen(PORT, () => {
  console.log(`[Server] running on http://localhost:${PORT}`);
});
