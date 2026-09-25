import app from './app';
import { env } from './config/env';
import { prisma } from './config/prisma';

import { createServer } from 'http';
import { initSocket } from './socket';

const startServer = async () => {
  try {
    // Attempt to connect to the database to ensure it's available
    await prisma.$connect();
    console.log('Successfully connected to the database.');

    const server = createServer(app);
    initSocket(server);

    server.listen(env.PORT, () => {
      console.log(`Server is running in ${env.NODE_ENV} mode on port ${env.PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
