import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

interface EnvConfig {
  PORT: number;
  NODE_ENV: string;
  DATABASE_URL: string;
  STUDENT_APP_URL: string;
  STAFF_DASHBOARD_URL: string;
  ADMIN_PORTAL_URL: string;
  FIREBASE_PROJECT_ID?: string;
}

const getEnv = (key: string, defaultValue?: string): string => {
  const value = process.env[key] || defaultValue;
  if (value === undefined) {
    throw new Error(`Environment variable ${key} is missing`);
  }
  return value;
};

export const env: EnvConfig = {
  PORT: parseInt(getEnv('PORT', '5001'), 10),
  NODE_ENV: getEnv('NODE_ENV', 'development'),
  DATABASE_URL: getEnv('DATABASE_URL'),
  STUDENT_APP_URL: getEnv('STUDENT_APP_URL', 'http://10.0.2.2:3000'),
  STAFF_DASHBOARD_URL: getEnv('STAFF_DASHBOARD_URL', 'http://localhost:5173'),
  ADMIN_PORTAL_URL: getEnv('ADMIN_PORTAL_URL', 'http://localhost:5174'),
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
};
