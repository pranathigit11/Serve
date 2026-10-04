import { Router } from 'express';
import { z } from 'zod';
import { env } from '../config/env.js';
import { Prisma } from '../generated/prisma/client.js';
import { badRequest, conflict, forbidden } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';
import { parse, trimmed } from '../lib/validation.js';
import { currentIdentity, currentUser, requireIdentity, requireRole } from '../middleware/auth.js';
import { accountDto } from './dto.js';

/** Routes mounted at /api: the caller's own account and self-registration. */
export const accountRouter = Router();

accountRouter.get('/me', requireRole(), (req, res) => {
  res.json({ account: accountDto(currentUser(req)) });
});

const studentRegistrationSchema = z.object({
  name: trimmed(1, 100),
  rollNumber: trimmed(1, 40).transform((value) => value.toUpperCase()),
  hostel: trimmed(1, 80),
  phone: z.string().trim().max(20).optional(),
});

const staffRegistrationSchema = z.object({
  name: trimmed(1, 100),
  phone: z.string().trim().max(20).optional(),
});

function registrationEmail(req: Parameters<typeof currentIdentity>[0]): string {
  const identity = currentIdentity(req);
  if (!identity.email) throw badRequest('EMAIL_REQUIRED', 'Your sign-in account has no email address.');
  if (env.REQUIRE_EMAIL_VERIFIED && !identity.emailVerified) {
    throw forbidden('EMAIL_NOT_VERIFIED', 'Please verify your email address before registering.');
  }
  return identity.email;
}

async function ensureNotRegistered(firebaseUid: string, email: string) {
  const existing = await prisma.user.findFirst({ where: { OR: [{ firebaseUid }, { email }] } });
  if (existing) throw conflict('ALREADY_REGISTERED', 'An account is already registered for this sign-in.');
}

function rethrowUniqueViolation(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    const target = JSON.stringify(error.meta ?? {});
    if (target.includes('rollNumber')) {
      throw conflict('ROLL_NUMBER_TAKEN', 'This roll number is already registered.');
    }
    throw conflict('ALREADY_REGISTERED', 'An account is already registered for this sign-in.');
  }
  throw error;
}

accountRouter.post('/students/register', requireIdentity, async (req, res) => {
  const identity = currentIdentity(req);
  const email = registrationEmail(req);
  const domains = env.STUDENT_EMAIL_DOMAINS;
  if (domains.length > 0 && !domains.some((domain) => email.endsWith(`@${domain.toLowerCase()}`))) {
    throw forbidden('EMAIL_DOMAIN_NOT_ALLOWED', 'Please sign in with your college email address.');
  }
  const body = parse(studentRegistrationSchema, req.body);
  await ensureNotRegistered(identity.uid, email);

  // Default the active canteen to the one serving the student's hostel.
  const defaultCanteen = await prisma.canteen.findFirst({
    where: { status: 'ACTIVE', hostelsServed: { has: body.hostel } },
    orderBy: { name: 'asc' },
  });

  const user = await prisma.user
    .create({
      data: {
        firebaseUid: identity.uid,
        email,
        name: body.name,
        phone: body.phone ?? null,
        role: 'STUDENT',
        studentProfile: {
          create: { rollNumber: body.rollNumber, hostel: body.hostel, selectedCanteenId: defaultCanteen?.id ?? null },
        },
      },
      include: { studentProfile: true, staffProfile: true },
    })
    .catch(rethrowUniqueViolation);

  res.status(201).json({ account: accountDto(user) });
});

/**
 * Staff self-registration creates an account with NO canteen access. Access is
 * only granted when an admin approves a canteen request.
 */
accountRouter.post('/staff/register', requireIdentity, async (req, res) => {
  const identity = currentIdentity(req);
  const email = registrationEmail(req);
  const body = parse(staffRegistrationSchema, req.body);
  await ensureNotRegistered(identity.uid, email);

  const user = await prisma.user
    .create({
      data: {
        firebaseUid: identity.uid,
        email,
        name: body.name,
        phone: body.phone ?? null,
        role: 'STAFF',
        staffProfile: { create: {} },
      },
      include: { studentProfile: true, staffProfile: true },
    })
    .catch(rethrowUniqueViolation);

  res.status(201).json({ account: accountDto(user) });
});
