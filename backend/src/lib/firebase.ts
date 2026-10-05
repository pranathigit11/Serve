import { applicationDefault, cert, initializeApp, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { env } from '../config/env.js';

export interface VerifiedIdentity {
  uid: string;
  email: string | null;
  emailVerified: boolean;
}

function parseServiceAccount(raw: string): Record<string, string> {
  const trimmed = raw.trim();
  const json = trimmed.startsWith('{') ? trimmed : Buffer.from(trimmed, 'base64').toString('utf8');
  return JSON.parse(json) as Record<string, string>;
}

function createApp(): App {
  if (env.FIREBASE_AUTH_EMULATOR_HOST) {
    // firebase-admin reads this variable directly; make sure it is set even
    // when the value came from a .env file.
    process.env.FIREBASE_AUTH_EMULATOR_HOST = env.FIREBASE_AUTH_EMULATOR_HOST;
  }
  if (env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return initializeApp({
      credential: cert(parseServiceAccount(env.FIREBASE_SERVICE_ACCOUNT_JSON)),
      projectId: env.FIREBASE_PROJECT_ID,
    });
  }
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return initializeApp({ credential: applicationDefault(), projectId: env.FIREBASE_PROJECT_ID });
  }
  // ID-token verification only needs the project id (public signing keys are
  // fetched from Google).
  return initializeApp({ projectId: env.FIREBASE_PROJECT_ID });
}

let auth: Auth | undefined;

export function firebaseAuth(): Auth {
  auth ??= getAuth(createApp());
  return auth;
}

export async function verifyIdToken(token: string): Promise<VerifiedIdentity> {
  const decoded = await firebaseAuth().verifyIdToken(token);
  return {
    uid: decoded.uid,
    email: decoded.email ? decoded.email.toLowerCase() : null,
    emailVerified: decoded.email_verified === true,
  };
}
