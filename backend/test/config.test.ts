import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { prisma } from '../src/lib/prisma.js';
import { createFirebaseUser } from './helpers.js';

const SAFE_PRODUCTION_ENV = {
  NODE_ENV: 'production',
  DATABASE_URL: 'postgresql://user:pass@db.internal:5432/serve',
  FIREBASE_PROJECT_ID: 'serve-prod',
  CORS_ORIGINS: 'https://staff.serve.example,https://admin.serve.example',
  PAYMENT_MODE: 'mock',
  ALLOW_MOCK_PAYMENTS_IN_PRODUCTION: 'true',
  MOCK_PAYMENT_SECRET: 'a-very-long-random-production-secret-value-123',
};

function loadConfig(env: Record<string, string>) {
  return spawnSync('npx', ['tsx', 'test/fixtures/load-config.ts'], {
    // DOTENV_CONFIG_PATH: ignore the developer's local .env file.
    env: { PATH: process.env.PATH ?? '', HOME: process.env.HOME ?? '', DOTENV_CONFIG_PATH: '/nonexistent', ...env },
    encoding: 'utf8',
    cwd: process.cwd(),
  });
}

describe('production configuration guard', () => {
  it('accepts a complete production configuration', () => {
    const result = loadConfig(SAFE_PRODUCTION_ENV);
    expect(result.stdout).toContain('CONFIG_OK');
  });

  it.each([
    ['the Auth emulator host', { FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099' }, /FIREBASE_AUTH_EMULATOR_HOST/],
    ['wildcard CORS', { CORS_ORIGINS: '*' }, /CORS_ORIGINS/],
    ['localhost CORS', { CORS_ORIGINS: 'http://localhost:5173' }, /development origins/],
    ['mock payments without opt-in', { ALLOW_MOCK_PAYMENTS_IN_PRODUCTION: 'false' }, /ALLOW_MOCK_PAYMENTS_IN_PRODUCTION/],
    ['the development payment secret', { MOCK_PAYMENT_SECRET: 'dev-only-mock-payment-secret-change-me' }, /MOCK_PAYMENT_SECRET/],
    ['a missing database url', { DATABASE_URL: '' }, /DATABASE_URL/],
  ])('refuses to start with %s', (_label, override, message) => {
    const result = loadConfig({ ...SAFE_PRODUCTION_ENV, ...override });
    expect(result.stdout).not.toContain('CONFIG_OK');
    expect(result.stderr).toMatch(message);
  });
});

describe('admin bootstrap script', () => {
  it('grants ADMIN to an existing Firebase user and refuses to change another role', async () => {
    const firebaseUser = await createFirebaseUser();
    const run = (args: string[]) =>
      spawnSync('npx', ['tsx', 'scripts/create-admin.ts', ...args], { env: process.env, encoding: 'utf8' });

    const created = run(['--email', firebaseUser.email, '--name', 'Ops Admin']);
    expect(created.stdout).toContain('Admin ready');
    const admin = await prisma.user.findUniqueOrThrow({ where: { firebaseUid: firebaseUser.uid } });
    expect(admin).toMatchObject({ role: 'ADMIN', name: 'Ops Admin', email: firebaseUser.email });

    const studentFirebase = await createFirebaseUser();
    await prisma.user.create({
      data: { firebaseUid: studentFirebase.uid, email: studentFirebase.email, name: 's', role: 'STUDENT' },
    });
    const refused = run(['--uid', studentFirebase.uid]);
    expect(refused.stderr).toContain('refusing to change roles');
    expect((await prisma.user.findUniqueOrThrow({ where: { firebaseUid: studentFirebase.uid } })).role).toBe('STUDENT');
  });
});
