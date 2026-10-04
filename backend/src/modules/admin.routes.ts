import { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '../generated/prisma/client.js';
import { badRequest, conflict, notFound } from '../lib/errors.js';
import { prisma, type TransactionClient } from '../lib/prisma.js';
import { idParam, parse, trimmed, uuid } from '../lib/validation.js';
import { currentUser, requireRole } from '../middleware/auth.js';
import { publishCanteen, publishChangeRequest, publishStaffAssignment, publishStaffUpdated } from '../realtime/events.js';
import { disconnectUser, syncUserRooms } from '../realtime/io.js';
import { canteenDto, canteenRequestDto, staffMemberDto } from './dto.js';
import { notify } from './notifications.js';

export const adminRouter = Router();
adminRouter.use(requireRole('ADMIN'));

/* ------------------------------------------------------------------ canteens */

const canteenSchema = z.object({
  name: trimmed(1, 120),
  location: trimmed(1, 200),
  hostelsServed: z.array(trimmed(1, 80)).min(1).max(20),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

function duplicateCanteen(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    throw conflict('CANTEEN_EXISTS', 'A canteen with this name already exists.');
  }
  throw error;
}

adminRouter.get('/canteens', async (_req, res) => {
  const canteens = await prisma.canteen.findMany({ orderBy: { name: 'asc' } });
  res.json({ canteens: canteens.map(canteenDto) });
});

adminRouter.post('/canteens', async (req, res) => {
  const body = parse(canteenSchema, req.body);
  const canteen = await prisma.canteen
    .create({
      data: {
        name: body.name,
        location: body.location,
        hostelsServed: [...new Set(body.hostelsServed)],
        ...(body.status ? { status: body.status } : {}),
      },
    })
    .catch(duplicateCanteen);
  const dto = canteenDto(canteen);
  publishCanteen(canteen, dto, false);
  res.status(201).json({ canteen: dto });
});

adminRouter.patch('/canteens/:canteenId', async (req, res) => {
  const { canteenId } = parse(idParam('canteenId'), req.params);
  const body = parse(canteenSchema.partial(), req.body);
  const existing = await prisma.canteen.findUnique({ where: { id: canteenId } });
  if (!existing) throw notFound('CANTEEN_NOT_FOUND', 'Canteen not found.');
  const canteen = await prisma.canteen
    .update({
      where: { id: canteenId },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.location !== undefined ? { location: body.location } : {}),
        ...(body.hostelsServed !== undefined ? { hostelsServed: [...new Set(body.hostelsServed)] } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
      },
    })
    .catch(duplicateCanteen);
  const dto = canteenDto(canteen);
  publishCanteen(canteen, dto, existing.status !== canteen.status);
  res.json({ canteen: dto });
});

/* --------------------------------------------------------------------- staff */

adminRouter.get('/staff', async (_req, res) => {
  const staff = await prisma.user.findMany({
    where: { role: 'STAFF' },
    include: { staffProfile: true },
    orderBy: { createdAt: 'asc' },
  });
  res.json({ staff: staff.map(staffMemberDto) });
});

async function assignStaff(staffId: string, canteenId: string, tx: TransactionClient = prisma) {
  const canteen = await tx.canteen.findUnique({ where: { id: canteenId } });
  if (!canteen) throw notFound('CANTEEN_NOT_FOUND', 'Canteen not found.');
  if (canteen.status !== 'ACTIVE') throw conflict('CANTEEN_INACTIVE', 'Staff can only be assigned to active canteens.');
  return tx.user.update({
    where: { id: staffId },
    data: { staffProfile: { update: { canteenId, assignedAt: new Date() } } },
    include: { staffProfile: true },
  });
}

async function findStaff(staffId: string) {
  const staff = await prisma.user.findUnique({ where: { id: staffId }, include: { staffProfile: true } });
  if (!staff || staff.role !== 'STAFF' || !staff.staffProfile) throw notFound('STAFF_NOT_FOUND', 'Staff member not found.');
  return staff;
}

async function announceAssignment(staff: Awaited<ReturnType<typeof findStaff>>) {
  await syncUserRooms(staff.id);
  const dto = staffMemberDto(staff);
  publishStaffAssignment(staff.id, dto);
  const canteen = staff.staffProfile?.canteenId
    ? await prisma.canteen.findUnique({ where: { id: staff.staffProfile.canteenId } })
    : null;
  if (canteen) {
    await notify([
      { userId: staff.id, type: 'SUCCESS', title: 'Canteen Assigned', message: `You are now assigned to ${canteen.name}` },
    ]);
  }
  return dto;
}

adminRouter.patch('/staff/:staffId/assignment', async (req, res) => {
  const { staffId } = parse(idParam('staffId'), req.params);
  const { canteenId } = parse(z.object({ canteenId: uuid }), req.body);
  await findStaff(staffId);
  const staff = await assignStaff(staffId, canteenId);
  res.json({ staff: await announceAssignment(staff) });
});

adminRouter.patch('/staff/:staffId/status', async (req, res) => {
  const { staffId } = parse(idParam('staffId'), req.params);
  const { status } = parse(z.object({ status: z.enum(['ACTIVE', 'INACTIVE']) }), req.body);
  await findStaff(staffId);
  const staff = await prisma.user.update({ where: { id: staffId }, data: { status }, include: { staffProfile: true } });
  if (status === 'INACTIVE') await disconnectUser(staffId);
  const dto = staffMemberDto(staff);
  publishStaffUpdated(dto);
  res.json({ staff: dto });
});

/* ---------------------------------------------------------- canteen requests */

adminRouter.get('/canteen-requests', async (req, res) => {
  const { status } = parse(z.object({ status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional() }), req.query);
  const requests = await prisma.staffCanteenRequest.findMany({
    where: status ? { status } : {},
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  res.json({ requests: requests.map(canteenRequestDto) });
});

adminRouter.post('/canteen-requests/:requestId/:decision', async (req, res) => {
  const admin = currentUser(req);
  const { requestId, decision } = parse(
    z.object({ requestId: uuid, decision: z.enum(['approve', 'reject']) }),
    req.params,
  );

  const request = await prisma.$transaction(async (tx) => {
    // Lock the request so two admins cannot resolve it concurrently.
    await tx.$queryRaw`SELECT 1 FROM "StaffCanteenRequest" WHERE id = ${requestId}::uuid FOR UPDATE`;
    const current = await tx.staffCanteenRequest.findUnique({ where: { id: requestId } });
    if (!current) throw notFound('REQUEST_NOT_FOUND', 'Request not found.');
    if (current.status !== 'PENDING') {
      throw conflict('REQUEST_ALREADY_RESOLVED', `This request was already ${current.status.toLowerCase()}.`);
    }
    const staff = await tx.user.findUnique({ where: { id: current.staffId } });
    if (!staff || staff.role !== 'STAFF') throw badRequest('STAFF_NOT_FOUND', 'The requesting staff member no longer exists.');
    if (decision === 'approve') await assignStaff(current.staffId, current.toCanteenId, tx);
    return tx.staffCanteenRequest.update({
      where: { id: requestId },
      data: {
        status: decision === 'approve' ? 'APPROVED' : 'REJECTED',
        reviewedById: admin.id,
        reviewedAt: new Date(),
      },
      include: { toCanteen: true },
    });
  });

  const dto = canteenRequestDto(request);
  publishChangeRequest(request.staffId, dto, false);
  if (request.status === 'APPROVED') {
    await announceAssignment(await findStaff(request.staffId));
  } else {
    await notify([
      {
        userId: request.staffId,
        type: 'ALERT',
        title: 'Canteen Request Rejected',
        message: `Your request for ${request.toCanteen.name} was rejected`,
      },
    ]);
  }
  res.json({ request: dto });
});
