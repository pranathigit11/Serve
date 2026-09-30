import { initializeApp, getApps, getApp, applicationDefault, cert } from 'firebase-admin/app';
import { env } from './env';

export const initializeFirebaseAdmin = () => {
  if (getApps().length > 0) {
    return getApp();
  }

  const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = env;

  if (!FIREBASE_PROJECT_ID) {
    console.warn('⚠️ FIREBASE_PROJECT_ID is not set. Firebase Admin SDK will not initialize correctly.');
  }

  let credential;
  if (FIREBASE_CLIENT_EMAIL && FIREBASE_PRIVATE_KEY) {
    // Handle escaped newlines in private key if passed via env var
    const privateKey = FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
    credential = cert({
      projectId: FIREBASE_PROJECT_ID,
      clientEmail: FIREBASE_CLIENT_EMAIL,
      privateKey,
    });
  } else {
    credential = applicationDefault();
  }

  return initializeApp({
    credential,
    projectId: FIREBASE_PROJECT_ID,
  });
};

export const getFirebaseAdmin = () => {
  if (getApps().length === 0) {
    return initializeFirebaseAdmin();
  }
  return getApp();
};
