import type { Server as HttpServer } from 'node:http';
import { Server, type Socket } from 'socket.io';
import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { prisma } from '../lib/prisma.js';
import { identityFromToken, userFromIdentity } from '../middleware/auth.js';
import { rooms, roomsFor, type RoomSubject } from './rooms.js';

let io: Server | undefined;

interface SocketData {
  userId: string;
}

function subjectFromUser(user: {
  id: string;
  role: RoomSubject['role'];
  studentProfile: { selectedCanteenId: string | null } | null;
  staffProfile: { canteenId: string | null } | null;
}): RoomSubject {
  return {
    id: user.id,
    role: user.role,
    studentCanteenId: user.studentProfile?.selectedCanteenId ?? null,
    staffCanteenId: user.staffProfile?.canteenId ?? null,
  };
}

export function attachRealtime(server: HttpServer, corsOrigins: string[]): Server {
  io = new Server(server, {
    cors: { origin: corsOrigins, methods: ['GET', 'POST'] },
    // Clients never send domain events; keep inbound payloads tiny.
    maxHttpBufferSize: 10_000,
  });

  // Authenticate during the handshake: unauthenticated or inactive accounts
  // are rejected before they can join any room.
  io.use(async (socket, next) => {
    try {
      const token = (socket.handshake.auth as { token?: unknown } | undefined)?.token;
      const identity = await identityFromToken(typeof token === 'string' ? token : null);
      const user = await userFromIdentity(identity);
      (socket.data as SocketData).userId = user.id;
      await socket.join(roomsFor(subjectFromUser(user)));
      next();
    } catch (error) {
      const appError = error instanceof AppError ? error : null;
      if (!appError) logger.error({ err: error }, 'Socket authentication failed unexpectedly');
      const failure = new Error(appError?.code ?? 'INTERNAL_ERROR') as Error & { data?: unknown };
      failure.data = { message: appError?.message ?? 'Unable to authenticate.' };
      next(failure);
    }
  });

  io.on('connection', (socket: Socket) => {
    logger.debug({ socketId: socket.id, userId: (socket.data as SocketData).userId }, 'socket connected');
    // Clients cannot request room changes; ignore any attempt.
    socket.onAny((event) => {
      logger.debug({ socketId: socket.id, event }, 'ignored client-emitted socket event');
    });
  });

  return io;
}

export function realtime(): Server | undefined {
  return io;
}

export function emitTo(room: string | string[], event: string, payload: unknown) {
  io?.to(room).emit(event, payload);
}

/**
 * Re-computes an account's rooms from PostgreSQL and moves every connected
 * socket of that account accordingly (e.g. after a staff reassignment or a
 * student switching canteen).
 */
export async function syncUserRooms(userId: string) {
  if (!io) return;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { studentProfile: true, staffProfile: true },
  });
  const sockets = await io.in(rooms.user(userId)).fetchSockets();
  if (!user || user.status !== 'ACTIVE') {
    for (const socket of sockets) socket.disconnect(true);
    return;
  }
  const desired = new Set(roomsFor(subjectFromUser(user)));
  for (const socket of sockets) {
    for (const room of socket.rooms) {
      if (room !== socket.id && !desired.has(room)) socket.leave(room);
    }
    socket.join([...desired]);
  }
}

export async function disconnectUser(userId: string) {
  if (!io) return;
  io.in(rooms.user(userId)).disconnectSockets(true);
}

export function closeRealtime(): Promise<void> {
  return new Promise((resolve) => {
    if (!io) return resolve();
    void io.close(() => resolve());
    io = undefined;
  });
}
