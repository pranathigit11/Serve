import { pino } from 'pino';
import { env } from '../config/env.js';

export const logger = pino({
  level: env.NODE_ENV === 'test' ? 'silent' : env.LOG_LEVEL,
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', '*.token', '*.idToken', '*.signature'],
    censor: '[redacted]',
  },
  base: { service: 'serve-backend' },
});
