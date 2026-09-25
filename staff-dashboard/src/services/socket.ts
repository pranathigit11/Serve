import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:5001';

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Function[]> = new Map();

  connect(staffId: string, canteenId: string) {
    if (!this.socket) {
      this.socket = io(SOCKET_URL, {
        withCredentials: true,
      });

      this.socket.on('connect', () => {
        console.log('Socket connected');
        if (staffId) this.socket?.emit('join:staff', staffId);
        if (canteenId) this.socket?.emit('join:canteen', canteenId);
      });

      this.socket.on('disconnect', () => {
        console.log('Socket disconnected');
      });

      // Register all listeners
      this.socket.onAny((event, ...args) => {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
          callbacks.forEach(cb => cb(...args));
        }
      });
    }
  }

  joinCanteen(canteenId: string) {
    this.socket?.emit('join:canteen', canteenId);
  }

  leaveCanteen(canteenId: string) {
    this.socket?.emit('leave:canteen', canteenId);
  }

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)?.push(callback);
  }

  off(event: string, callback: Function) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      this.listeners.set(event, callbacks.filter(cb => cb !== callback));
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const socketService = new SocketService();
