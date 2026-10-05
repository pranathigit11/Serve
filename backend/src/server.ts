import http from 'node:http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { startPendingOrderExpiry } from './jobs/expirePendingOrders.js';
import { logger } from './lib/logger.js';
import { prisma } from './lib/prisma.js';
import { attachRealtime, closeRealtime } from './realtime/io.js';

const app = createApp();
const server = http.createServer(app);
attachRealtime(server, env.CORS_ORIGINS);
const stopExpiry = startPendingOrderExpiry();

if (env.FIREBASE_AUTH_EMULATOR_HOST) {
  logger.warn({ host: env.FIREBASE_AUTH_EMULATOR_HOST }, 'Using the Firebase Auth EMULATOR (development only)');
}
if (env.PAYMENT_MODE === 'mock') {
  logger.warn('PAYMENT_MODE=mock: payments are simulated and no money is collected');
}

server.listen(env.PORT, () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, 'SERVE API listening');
});

let shuttingDown = false;
async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, 'Shutting down');
  stopExpiry();
  await closeRealtime(); // also closes the HTTP server
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'Unhandled promise rejection');
});
