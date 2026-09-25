import { PrismaClient } from '@prisma/client';
import { env } from './env';

// Prevent multiple instances of Prisma Client in development
declare global {
  var prisma: PrismaClient | undefined;
}

export const prisma = global.prisma || new PrismaClient({
  datasources: {
    db: {
      url: env.DATABASE_URL,
    },
  },
});

if (env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}
