import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import pg from 'pg';

export const config = {
  api: process.env.E2E_API_URL ?? 'http://localhost:5001',
  staffUrl: process.env.E2E_STAFF_URL ?? 'http://localhost:5173',
  adminUrl: process.env.E2E_ADMIN_URL ?? 'http://localhost:5174',
  studentUrl: process.env.E2E_STUDENT_URL ?? 'http://localhost:45678',
  emulator: process.env.E2E_AUTH_EMULATOR ?? 'http://127.0.0.1:9099',
  databaseUrl: process.env.E2E_DATABASE_URL ?? 'postgresql://serve:serve_dev_pw@localhost:5432/serve_e2e',
  artifacts: path.resolve('artifacts'),
};
mkdirSync(config.artifacts, { recursive: true });

export const db = new pg.Pool({ connectionString: config.databaseUrl });
export const query = async (sql, params = []) => (await db.query(sql, params)).rows;

const results = [];
let failureHook = async () => {};
export const onCheckFailure = (hook) => {
  failureHook = hook;
};
export function record(id, description, passed, evidence = '') {
  results.push({ id, description, passed, evidence });
  console.log(`${passed ? 'PASS' : 'FAIL'}  [${id}] ${description}${evidence ? ` — ${evidence}` : ''}`);
}
export async function check(id, description, fn) {
  try {
    const evidence = await fn();
    record(id, description, true, typeof evidence === 'string' ? evidence : '');
  } catch (error) {
    record(id, description, false, error.message.split('\n')[0]);
    await failureHook(id).catch(() => {});
  }
}
export const summary = () => results;

export function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export async function eventually(fn, { timeout = 10_000, interval = 250, message = 'condition not met' } = {}) {
  const deadline = Date.now() + timeout;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const value = await fn();
      if (value) return value;
    } catch (error) {
      lastError = error;
    }
    await new Promise((r) => setTimeout(r, interval));
  }
  throw new Error(`${message}${lastError ? ` (${lastError.message})` : ''}`);
}

/** Creates a Firebase Auth emulator user and returns its id token. */
export async function emulatorUser(email, password) {
  const res = await fetch(`${config.emulator}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(body));
  return body;
}

export async function emulatorSignIn(email, password) {
  const res = await fetch(
    `${config.emulator}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-api-key`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  );
  const body = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(body));
  return body.idToken;
}

export async function api(method, url, token, body) {
  const res = await fetch(`${config.api}${url}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

/** Provisions an admin exactly as operators would: Firebase user + create-admin script. */
export function createAdminViaScript(email) {
  return execFileSync('npx', ['tsx', 'scripts/create-admin.ts', '--email', email, '--name', 'E2E Admin'], {
    cwd: path.resolve('../backend'),
    env: { ...process.env, DATABASE_URL: config.databaseUrl },
    encoding: 'utf8',
  });
}

/**
 * Firebase JS SDK files that FlutterFire web loads from www.gstatic.com
 * (unreachable from this sandbox) are served from the identical npm build.
 */
export async function routeFirebaseSdk(context) {
  // The SDK's dev-only "Running in emulator mode" banner covers bottom-anchored
  // buttons; it never appears without the emulator, so hide it for the run.
  await context.addInitScript(() => {
    const style = document.createElement('style');
    style.textContent = '.firebase-emulator-warning { display: none !important; }';
    document.addEventListener('DOMContentLoaded', () => document.head.appendChild(style));
  });
  const require = createRequire(path.resolve('../staff-dashboard/package.json'));
  const firebaseDir = path.dirname(require.resolve('firebase/package.json'));
  await context.route(/https:\/\/www\.gstatic\.com\/firebasejs\/[^/]+\/(firebase-[a-z-]+\.js)$/, (route, request) => {
    const file = request.url().split('/').pop();
    route.fulfill({
      status: 200,
      contentType: 'text/javascript',
      body: readFileSync(path.join(firebaseDir, file)),
    });
  });
}
