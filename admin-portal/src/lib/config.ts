/**
 * Runtime configuration, supplied through Vite env variables at build time.
 * Development defaults live in `.env.development`; production builds must set
 * real values (see `.env.example`). Nothing here is secret: Firebase web config
 * is public by design and authorization is enforced by the backend.
 */
const env = import.meta.env;

function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing required configuration: ${name}`);
  return value;
}

function load() {
  const apiUrl = required('VITE_API_URL', env.VITE_API_URL).replace(/\/$/, '');
  if (env.PROD && /localhost|127\.0\.0\.1|10\.0\.2\.2/.test(apiUrl)) {
    throw new Error('VITE_API_URL points at a development host in a production build');
  }
  return {
    apiUrl,
    socketUrl: (env.VITE_SOCKET_URL || apiUrl).replace(/\/$/, ''),
    firebase: {
      apiKey: required('VITE_FIREBASE_API_KEY', env.VITE_FIREBASE_API_KEY),
      authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || undefined,
      projectId: required('VITE_FIREBASE_PROJECT_ID', env.VITE_FIREBASE_PROJECT_ID),
      appId: env.VITE_FIREBASE_APP_ID || undefined,
    },
    // Development only: Firebase Auth emulator host, e.g. 127.0.0.1:9099.
    authEmulatorHost: env.PROD ? undefined : env.VITE_FIREBASE_AUTH_EMULATOR_HOST || undefined,
    roleSelectionUrl: env.VITE_ROLE_SELECTION_URL || undefined,
  };
}

export type AppConfig = ReturnType<typeof load>;

let cached: AppConfig | undefined;
let failure: Error | undefined;

export function getConfig(): AppConfig {
  if (cached) return cached;
  if (failure) throw failure;
  try {
    cached = load();
    return cached;
  } catch (error) {
    failure = error as Error;
    throw failure;
  }
}
