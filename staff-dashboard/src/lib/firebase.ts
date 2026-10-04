import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';
import { getConfig } from './config';

let auth: Auth | undefined;

export function firebaseAuth(): Auth {
  if (auth) return auth;
  const config = getConfig();
  const app = initializeApp(config.firebase);
  auth = getAuth(app);
  if (config.authEmulatorHost) {
    connectAuthEmulator(auth, `http://${config.authEmulatorHost}`, { disableWarnings: true });
  }
  return auth;
}
