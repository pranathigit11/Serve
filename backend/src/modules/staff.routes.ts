import { Router } from 'express';
import { z } from 'zod';
import { badRequest, conflict, notFound } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';
import { idParam, parse, priceSchema, trimmed, uuid } from '../lib/validation.js';
import { currentUser, requireRole, staffCanteenId } from '../middleware/auth.js';
import { publishCanteen, publishChangeRequest } from '../realtime/events.js';
import { canteenDto, canteenRequestDto, orderDto, staffCode } from './dto.js';
import {
  createCategory,
  createMenuItem,
  deleteMenuItem,
  getCanteenMenu,
  setMenuItemAvailability,
  updateCategory,
  updateMenuItem,
} from './menu.service.js';
import { notify } from './notifications.js';
import { advanceOrderStatus, listCanteenOrders } from './orders.service.js';

/**
 * Staff API. Every canteen-scoped handler derives the canteen from the staff
 * member's PostgreSQL assignment (staffCanteenId); canteen ids sent by the
 * client are never used for authorization.
 */
export const staffRouter = Router();
staffRouter.use(requireRole('STAFF'));

staffRouter.get('/me', async (req, res) => {
  const user = currentUser(req);
  const profile = user.staffProfile;
  if (!profile) throw notFound('STAFF_PROFILE_NOT_FOUND', 'Staff profile missing.');
  const [canteen, pendingRequest] = await Promise.all([
    profile.canteenId ? prisma.canteen.findUnique({ where: { id: profile.canteenId } }) : null,
    prisma.staffCanteenRequest.findFirst({
      where: { staffId: user.id, status: 'PENDING' },
      include: { toCanteen: true },
      orderBy: { createdAt: 'desc' },
    }),
  ]);
  res.json({
    staff: {
      id: user.id,
      name: user.name,
      email: user.email,
      staffId: staffCode(profile.staffNumber),
      role: profile.title,
      canteen: canteen ? canteenDto(canteen) : null,
      pendingRequest: pendingRequest
        ? { ...canteenRequestDto(pendingRequest), requestedCanteenName: pendingRequest.toCanteen.name }
        : null,
    },
  });
});

/* ---------------------------------------------------------- canteen requests */

const canteenRequestSchema = z.object({ toCanteenId: uuid, reason: z.string().trim().max(300).optional() });

staffRouter.post('/canteen-requests', async (req, res) => {
  const user = currentUser(req);
  const body = parse(canteenRequestSchema, req.body);
  const request = await prisma.$transaction(async (tx) => {
    // Serialise requests per staff member so only one can be pending.
    await tx.$queryRaw`SELECT 1 FROM "StaffProfile" WHERE "userId" = ${user.id}::uuid FOR UPDATE`;
    const profile = await tx.staffProfile.findUniqueOrThrow({ where: { userId: user.id } });
    const target = await tx.canteen.findUnique({ where: { id: body.toCanteenId } });
    if (!target || target.status !== 'ACTIVE') throw notFound('CANTEEN_NOT_FOUND', 'Canteen not found.');
    if (profile.canteenId === target.id) {
      throw badRequest('ALREADY_ASSIGNED', 'You are already assigned to this canteen.');
    }
    const pending = await tx.staffCanteenRequest.findFirst({ where: { staffId: user.id, status: 'PENDING' } });
    if (pending) throw conflict('REQUEST_ALREADY_PENDING', 'You already have a pending canteen request.');
    return tx.staffCanteenRequest.create({
      data: {
        staffId: user.id,
        fromCanteenId: profile.canteenId,
        toCanteenId: target.id,
        reason:
          body.reason && body.reason.length > 0
            ? body.reason
            : profile.canteenId
              ? 'Canteen change request'
              : 'Initial canteen access request',
      },
    });
  });
  const dto = canteenRequestDto(request);
  publishChangeRequest(user.id, dto, true);
  const admins = await prisma.user.findMany({ where: { role: 'ADMIN', status: 'ACTIVE' }, select: { id: true } });
  await notify(
    admins.map((admin) => ({
      userId: admin.id,
      type: 'ALERT' as const,
      title: 'Canteen Request',
      message: `${user.name} requested access to a canteen`,
    })),
  );
  res.status(201).json({ request: dto });
});

staffRouter.get('/canteen-requests', async (req, res) => {
  const requests = await prisma.staffCanteenRequest.findMany({
    where: { staffId: currentUser(req).id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  res.json({ requests: requests.map(canteenRequestDto) });
});

/* ---------------------------------------------------- assigned-canteen scope */

staffRouter.get('/canteen', async (req, res) => {
  const canteen = await prisma.canteen.findUniqueOrThrow({ where: { id: staffCanteenId(req) } });
  res.json({ canteen: canteenDto(canteen) });
});

staffRouter.patch('/canteen/order-taking', async (req, res) => {
  const canteenId = staffCanteenId(req);
  const { isAcceptingOrders } = parse(z.object({ isAcceptingOrders: z.boolean() }), req.body);
  const canteen = await prisma.canteen.update({ where: { id: canteenId }, data: { isAcceptingOrders } });
  const dto = canteenDto(canteen);
  publishCanteen(canteen, dto, true);
  res.json({ canteen: dto });
});

staffRouter.get('/orders', async (req, res) => {
  const orders = await listCanteenOrders(staffCanteenId(req));
  res.json({ orders: orders.map((order) => orderDto(order, { includeStudent: true })) });
});

const statusSchema = z.object({ status: z.enum(['PREPARING', 'READY', 'COLLECTED']) });

staffRouter.patch('/orders/:orderId/status', async (req, res) => {
  const canteenId = staffCanteenId(req);
  const { orderId } = parse(idParam('orderId'), req.params);
  const { status } = parse(statusSchema, req.body);
  const order = await advanceOrderStatus(canteenId, orderId, status);
  res.json({ order: orderDto(order, { includeStudent: true }) });
});

staffRouter.get('/menu', async (req, res) => {
  const canteenId = staffCanteenId(req);
  res.json(await getCanteenMenu(canteenId));
});

const categorySchema = z.object({ name: trimmed(1, 60), sortOrder: z.number().int().min(0).max(1000).optional() });

staffRouter.post('/menu/categories', async (req, res) => {
  const canteenId = staffCanteenId(req);
  const body = parse(categorySchema, req.body);
  res.status(201).json({ category: await createCategory(canteenId, body) });
});

staffRouter.patch('/menu/categories/:categoryId', async (req, res) => {
  const canteenId = staffCanteenId(req);
  const { categoryId } = parse(idParam('categoryId'), req.params);
  const body = parse(categorySchema.partial(), req.body);
  res.json({ category: await updateCategory(canteenId, categoryId, body) });
});

const imageUrlSchema = z
  .string()
  .trim()
  .max(500)
  .refine((value) => value === '' || /^https:\/\//.test(value) || /^assets\/[\w/.-]+$/.test(value), {
    message: 'Image must be an https URL or a bundled asset path',
  })
  .transform((value) => (value === '' ? null : value));

const menuItemSchema = z.object({
  categoryId: uuid,
  name: trimmed(1, 100),
  description: z.string().trim().max(500).optional(),
  price: priceSchema,
  prepTimeMinutes: z.number().int().min(0).max(240).optional(),
  imageUrl: imageUrlSchema.nullable().optional(),
  isAvailable: z.boolean().optional(),
});

staffRouter.post('/menu/items', async (req, res) => {
  const canteenId = staffCanteenId(req);
  const body = parse(menuItemSchema, req.body);
  res.status(201).json({ item: await createMenuItem(canteenId, body) });
});

staffRouter.patch('/menu/items/:itemId', async (req, res) => {
  const canteenId = staffCanteenId(req);
  const { itemId } = parse(idParam('itemId'), req.params);
  const body = parse(menuItemSchema.partial(), req.body);
  res.json({ item: await updateMenuItem(canteenId, itemId, body) });
});

staffRouter.patch('/menu/items/:itemId/availability', async (req, res) => {
  const canteenId = staffCanteenId(req);
  const { itemId } = parse(idParam('itemId'), req.params);
  const { isAvailable } = parse(z.object({ isAvailable: z.boolean() }), req.body);
  res.json({ item: await setMenuItemAvailability(canteenId, itemId, isAvailable) });
});

staffRouter.delete('/menu/items/:itemId', async (req, res) => {
  const canteenId = staffCanteenId(req);
  const { itemId } = parse(idParam('itemId'), req.params);
  await deleteMenuItem(canteenId, itemId);
  res.status(204).end();
});
