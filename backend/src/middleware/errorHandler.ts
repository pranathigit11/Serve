import type { ErrorRequestHandler, RequestHandler } from 'express';
import { Prisma } from '../generated/prisma/client.js';
import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ error: 'NOT_FOUND', message: 'Route not found.' });
};

export const errorHandler: ErrorRequestHandler = (err: unknown, req, res, _next) => {
  if (err instanceof AppError) {
    if (err.status >= 500) logger.error({ err, reqId: req.id }, err.message);
    res.status(err.status).json({ error: err.code, message: err.message, ...(err.details ?? {}) });
    return;
  }

  // Malformed JSON body from express.json().
  if (typeof err === 'object' && err !== null && 'type' in err) {
    const type = (err as { type?: string }).type;
    if (type === 'entity.parse.failed') {
      res.status(400).json({ error: 'INVALID_JSON', message: 'Request body is not valid JSON.' });
      return;
    }
    if (type === 'entity.too.large') {
      res.status(413).json({ error: 'PAYLOAD_TOO_LARGE', message: 'Request body is too large.' });
      return;
    }
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    res.status(409).json({ error: 'CONFLICT', message: 'A record with these details already exists.' });
    return;
  }

  // Never leak stack traces or internal messages to clients.
  logger.error({ err, reqId: req.id }, 'Unhandled error');
  res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.' });
};
