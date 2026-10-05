import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { expireStalePendingOrders } from '../modules/orders.service.js';

/** Periodically cancels abandoned (never paid) checkouts. Safe to run on every instance. */
export function startPendingOrderExpiry(intervalMs = 60_000): () => void {
  const run = async () => {
    try {
      const expired = await expireStalePendingOrders(env.PENDING_PAYMENT_TTL_MINUTES);
      if (expired > 0) logger.info({ expired }, 'Expired unpaid orders');
    } catch (error) {
      logger.error({ err: error }, 'Failed to expire unpaid orders');
    }
  };
  const timer = setInterval(() => void run(), intervalMs);
  timer.unref();
  return () => clearInterval(timer);
}
