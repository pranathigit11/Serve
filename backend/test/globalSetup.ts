import { execSync } from 'node:child_process';

export default function setup() {
  const databaseUrl =
    process.env.TEST_DATABASE_URL ?? 'postgresql://serve:serve_dev_pw@localhost:5432/serve_test?schema=public';
  if (!/test/.test(databaseUrl)) {
    throw new Error('Refusing to run tests against a database whose name does not contain "test"');
  }
  // Apply the committed migrations exactly as production would.
  execSync('npx prisma migrate deploy', {
    stdio: 'pipe',
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });
}
