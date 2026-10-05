import { Router } from 'express';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { badRequest, notFound } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';
import { idParam, parse, uuid } from '../lib/validation.js';
import { currentUser, requireRole } from '../middleware/auth.js';
import { syncUserRooms } from '../realtime/io.js';
import { accountDto, canteenDto, orderDto, paymentDto } from './dto.js';
import { getCanteenMenu } from './menu.service.js';
import {
  cancelUnpaidOrder,
  createOrder,
  getStudentOrder,
  listStudentOrders,
  MAX_QUANTITY_PER_ITEM,
} from './orders.service.js';
import { cancelPayment, completeMockPayment, createPayment, verifyPayment } from './payments.service.js';

// Keyed by account, not IP: many students share one campus NAT address.
const checkoutLimiter = rateLimit({
  windowMs: 60_000,
  limit: 30,
  keyGenerator: (req) => req.user?.id ?? ipKeyGenerator(req.ip ?? ''),
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'RATE_LIMITED', message: 'Too many attempts. Please wait a moment.' },
});

/* ------------------------------------------------------------------ canteens */

export const canteensRouter = Router();

// Public, read-only list of active canteens: the student sign-up form needs the
// hostel list before an account exists. Contains no private data.
canteensRouter.get('/', async (_req, res) => {
  const canteens = await prisma.canteen.findMany({ where: { status: 'ACTIVE' }, orderBy: { name: 'asc' } });
  res.json({ canteens: canteens.map(canteenDto) });
});

canteensRouter.get('/:canteenId/menu', requireRole('STUDENT', 'STAFF', 'ADMIN'), async (req, res) => {
  const { canteenId } = parse(idParam('canteenId'), req.params);
  const user = currentUser(req);
  const canteen = await prisma.canteen.findUnique({ where: { id: canteenId } });
  // Inactive canteens are hidden from students.
  if (!canteen || (canteen.status !== 'ACTIVE' && user.role === 'STUDENT')) {
    throw notFound('CANTEEN_NOT_FOUND', 'Canteen not found.');
  }
  res.json({ canteen: canteenDto(canteen), ...(await getCanteenMenu(canteenId)) });
});

/* ------------------------------------------------------------------ students */

export const studentsRouter = Router();
studentsRouter.use(requireRole('STUDENT'));

const updateStudentSchema = z.object({ selectedCanteenId: uuid });

studentsRouter.patch('/me', async (req, res) => {
  const user = currentUser(req);
  const { selectedCanteenId } = parse(updateStudentSchema, req.body);
  const canteen = await prisma.canteen.findUnique({ where: { id: selectedCanteenId } });
  if (!canteen || canteen.status !== 'ACTIVE') throw notFound('CANTEEN_NOT_FOUND', 'Canteen not found.');
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { studentProfile: { update: { selectedCanteenId } } },
    include: { studentProfile: true, staffProfile: true },
  });
  // Move this student's live connections to the new canteen's public room.
  await syncUserRooms(user.id);
  res.json({ account: accountDto(updated) });
});

studentsRouter.get('/me/orders', async (req, res) => {
  const orders = await listStudentOrders(currentUser(req).id);
  res.json({ orders: orders.map((order) => orderDto(order)) });
});

/* -------------------------------------------------------------------- orders */

export const ordersRouter = Router();
ordersRouter.use(requireRole('STUDENT'));

const createOrderSchema = z.object({
  canteenId: uuid,
  items: z
    .array(z.object({ menuItemId: uuid, quantity: z.number().int().min(1).max(MAX_QUANTITY_PER_ITEM) }))
    .min(1, 'Your cart is empty.')
    .max(50),
  // Any client-sent prices, totals or student ids are ignored (stripped).
});

const idempotencyKeySchema = z.string().trim().min(8).max(128).regex(/^[A-Za-z0-9_-]+$/);

ordersRouter.post('/', checkoutLimiter, async (req, res) => {
  const user = currentUser(req);
  const body = parse(createOrderSchema, req.body);
  const key = idempotencyKeySchema.safeParse(req.header('Idempotency-Key'));
  if (!key.success) {
    throw badRequest('IDEMPOTENCY_KEY_REQUIRED', 'A valid Idempotency-Key header is required.');
  }
  const { order, created } = await createOrder({
    studentId: user.id,
    canteenId: body.canteenId,
    idempotencyKey: key.data,
    items: body.items,
  });
  res.status(created ? 201 : 200).json({ order: orderDto(order) });
});

ordersRouter.get('/:orderId', async (req, res) => {
  const { orderId } = parse(idParam('orderId'), req.params);
  const order = await getStudentOrder(currentUser(req).id, orderId);
  res.json({ order: orderDto(order) });
});

ordersRouter.post('/:orderId/cancel', async (req, res) => {
  const { orderId } = parse(idParam('orderId'), req.params);
  const order = await cancelUnpaidOrder(currentUser(req).id, orderId);
  res.json({ order: orderDto(order) });
});

/* ------------------------------------------------------------------ payments */

export const paymentsRouter = Router();
paymentsRouter.use(requireRole('STUDENT'));

paymentsRouter.post('/', checkoutLimiter, async (req, res) => {
  const { orderId } = parse(z.object({ orderId: uuid }), req.body);
  const payment = await createPayment(currentUser(req).id, orderId);
  res.status(201).json({ payment: paymentDto(payment) });
});

const mockCompleteSchema = z.object({
  outcome: z.enum(['SUCCESS', 'FAILURE']),
  // Lets tests simulate a gateway capturing a different amount.
  amount: z.number().positive().optional(),
});

paymentsRouter.post('/mock/:paymentId/complete', checkoutLimiter, async (req, res) => {
  const { paymentId } = parse(idParam('paymentId'), req.params);
  const body = parse(mockCompleteSchema, req.body);
  const result = await completeMockPayment(currentUser(req).id, paymentId, body.outcome, body.amount);
  res.json({ result });
});

const verifySchema = z.object({
  paymentId: uuid,
  providerOrderId: z.string().min(1).max(100),
  providerPaymentId: z.string().min(1).max(100),
  amountPaise: z.number().int().nonnegative(),
  status: z.enum(['CAPTURED', 'FAILED']),
  signature: z.string().min(1).max(200),
});

paymentsRouter.post('/verify', checkoutLimiter, async (req, res) => {
  const body = parse(verifySchema, req.body);
  const order = await verifyPayment(currentUser(req).id, body);
  res.json({ status: 'CONFIRMED', order });
});

paymentsRouter.post('/:paymentId/cancel', async (req, res) => {
  const { paymentId } = parse(idParam('paymentId'), req.params);
  res.json({ payment: await cancelPayment(currentUser(req).id, paymentId) });
});
