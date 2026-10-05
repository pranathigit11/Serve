import 'dotenv/config';
import { z } from 'zod';

const booleanString = z
  .enum(['true', 'false', '1', '0'])
  .optional()
  .transform((value) => value === 'true' || value === '1');

const commaList = z
  .string()
  .optional()
  .transform((value) =>
    (value ?? '')
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0),
  );

const DEV_MOCK_SECRET = 'dev-only-mock-payment-secret-change-me';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(5001),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  // Number of reverse-proxy hops to trust for client IPs (rate limiting).
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).default(0),
  // Global per-IP request budget per minute (campus networks often share one IP).
  RATE_LIMIT_PER_MINUTE: z.coerce.number().int().min(10).default(1200),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // Comma-separated list of browser origins allowed to call the API / Socket.IO.
  CORS_ORIGINS: commaList,

  FIREBASE_PROJECT_ID: z.string().min(1, 'FIREBASE_PROJECT_ID is required'),
  // Optional service account (raw JSON or base64-encoded JSON). Token
  // verification only needs the project id; admin tooling needs credentials.
  FIREBASE_SERVICE_ACCOUNT_JSON: z.string().optional(),
  // Development/testing only: points firebase-admin at the Auth emulator.
  FIREBASE_AUTH_EMULATOR_HOST: z.string().optional(),

  // Optional sign-up policy for students (e.g. "college.edu").
  STUDENT_EMAIL_DOMAINS: commaList,
  REQUIRE_EMAIL_VERIFIED: booleanString,

  PAYMENT_MODE: z.enum(['mock']).default('mock'),
  MOCK_PAYMENT_SECRET: z.string().min(16, 'MOCK_PAYMENT_SECRET must be at least 16 characters'),
  ALLOW_MOCK_PAYMENTS_IN_PRODUCTION: booleanString,
  PENDING_PAYMENT_TTL_MINUTES: z.coerce.number().int().min(1).max(24 * 60).default(30),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`);
    throw new Error(`Invalid environment configuration:\n${problems.join('\n')}`);
  }
  const env = parsed.data;

  if (env.NODE_ENV === 'production') {
    const problems: string[] = [];
    if (env.FIREBASE_AUTH_EMULATOR_HOST) {
      // With the emulator host set, firebase-admin accepts unsigned tokens.
      problems.push('FIREBASE_AUTH_EMULATOR_HOST must not be set in production');
    }
    if (env.CORS_ORIGINS.length === 0 || env.CORS_ORIGINS.includes('*')) {
      problems.push('CORS_ORIGINS must list the deployed staff/admin/student web origins (no "*")');
    }
    if (env.CORS_ORIGINS.some((origin) => /localhost|127\.0\.0\.1|10\.0\.2\.2/.test(origin))) {
      problems.push('CORS_ORIGINS must not contain development origins in production');
    }
    if (env.PAYMENT_MODE === 'mock' && !env.ALLOW_MOCK_PAYMENTS_IN_PRODUCTION) {
      problems.push(
        'PAYMENT_MODE=mock collects no money; set ALLOW_MOCK_PAYMENTS_IN_PRODUCTION=true to acknowledge this explicitly',
      );
    }
    if (env.MOCK_PAYMENT_SECRET === DEV_MOCK_SECRET || env.MOCK_PAYMENT_SECRET.length < 32) {
      problems.push('MOCK_PAYMENT_SECRET must be a unique random value of at least 32 characters in production');
    }
    if (problems.length > 0) {
      throw new Error(`Unsafe production configuration:\n${problems.map((p) => `  - ${p}`).join('\n')}`);
    }
  }

  return env;
}

export const env = loadEnv();
export const isProduction = env.NODE_ENV === 'production';
