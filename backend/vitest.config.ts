import { defineConfig } from 'vitest/config';

// Integration tests run against a real PostgreSQL database and the Firebase
// Auth emulator:
//   firebase emulators:start --only auth --project demo-serve
//   TEST_DATABASE_URL=postgresql://.../serve_test npm test
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    globalSetup: ['./test/globalSetup.ts'],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL:
        process.env.TEST_DATABASE_URL ?? 'postgresql://serve:serve_dev_pw@localhost:5432/serve_test?schema=public',
      FIREBASE_PROJECT_ID: 'demo-serve',
      FIREBASE_AUTH_EMULATOR_HOST: process.env.FIREBASE_AUTH_EMULATOR_HOST ?? '127.0.0.1:9099',
      CORS_ORIGINS: 'http://localhost:5173',
      PAYMENT_MODE: 'mock',
      MOCK_PAYMENT_SECRET: 'test-mock-payment-secret-0123456789',
      LOG_LEVEL: 'silent',
    },
  },
});
