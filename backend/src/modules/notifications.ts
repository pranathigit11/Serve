import { Router } from 'express';
import type { NotificationType } from '../generated/prisma/client.js';
import { notFound } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { prisma } from '../lib/prisma.js';
import { idParam, parse } from '../lib/validation.js';
import { currentUser, requireRole } from '../middleware/auth.js';
import { publishNotification } from '../realtime/events.js';
import { notificationDto } from './dto.js';

export interface NotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  orderId?: string | null;
}

/**
 * Persists notifications and pushes them to connected clients. Called after
 * the business transaction commits; a failure here must not undo the
 * business change, so it is logged instead of thrown.
 */
export async function notify(inputs: NotificationInput[]) {
  if (inputs.length === 0) return;
  try {
    const created = await prisma.notification.createManyAndReturn({
      data: inputs.map((input) => ({ ...input, orderId: input.orderId ?? null })),
    });
    for (const notification of created) publishNotification(notification.userId, notificationDto(notification));
  } catch (error) {
    logger.error({ err: error }, 'Failed to create notifications');
  }
}

export async function notifyCanteenStaff(canteenId: string, input: Omit<NotificationInput, 'userId'>) {
  const staff = await prisma.staffProfile.findMany({
    where: { canteenId, user: { status: 'ACTIVE' } },
    select: { userId: true },
  });
  await notify(staff.map(({ userId }) => ({ ...input, userId })));
}

export const notificationsRouter = Router();

notificationsRouter.use(requireRole('STUDENT', 'STAFF', 'ADMIN'));

notificationsRouter.get('/', async (req, res) => {
  const user = currentUser(req);
  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  res.json({ notifications: notifications.map(notificationDto) });
});

notificationsRouter.post('/read-all', async (req, res) => {
  const user = currentUser(req);
  const result = await prisma.notification.updateMany({ where: { userId: user.id, isRead: false }, data: { isRead: true } });
  res.json({ updated: result.count });
});

notificationsRouter.post('/:notificationId/read', async (req, res) => {
  const user = currentUser(req);
  const { notificationId } = parse(idParam('notificationId'), req.params);
  // Ownership is part of the WHERE clause, so another user's id simply matches nothing.
  const result = await prisma.notification.updateMany({
    where: { id: notificationId, userId: user.id },
    data: { isRead: true },
  });
  if (result.count === 0) throw notFound('NOTIFICATION_NOT_FOUND', 'Notification not found.');
  res.json({ id: notificationId, isRead: true });
});
