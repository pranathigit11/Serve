import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { StaffProfile, StudentProfile, User, UserRole } from '../generated/prisma/client.js';
import { forbidden, unauthorized } from '../lib/errors.js';
import { verifyIdToken, type VerifiedIdentity } from '../lib/firebase.js';
import { logger } from '../lib/logger.js';
import { prisma } from '../lib/prisma.js';

export type AuthenticatedUser = User & {
  studentProfile: StudentProfile | null;
  staffProfile: StaffProfile | null;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      identity?: VerifiedIdentity;
      user?: AuthenticatedUser;
    }
  }
}

function bearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
  return token.trim();
}

/** Verifies a Firebase ID token string. Throws 401 AppErrors. */
export async function identityFromToken(token: string | null | undefined): Promise<VerifiedIdentity> {
  if (!token) throw unauthorized('AUTH_REQUIRED', 'Authentication is required.');
  try {
    return await verifyIdToken(token);
  } catch (error) {
    logger.debug({ err: error }, 'ID token verification failed');
    throw unauthorized('INVALID_TOKEN', 'Your session is invalid or has expired. Please sign in again.');
  }
}

/** Loads the database account for a verified identity and enforces account status. */
export async function userFromIdentity(identity: VerifiedIdentity): Promise<AuthenticatedUser> {
  const user = await prisma.user.findUnique({
    where: { firebaseUid: identity.uid },
    include: { studentProfile: true, staffProfile: true },
  });
  if (!user) {
    throw forbidden('ACCOUNT_NOT_REGISTERED', 'No SERVE account is registered for this sign-in.');
  }
  if (user.status !== 'ACTIVE') {
    throw forbidden('ACCOUNT_INACTIVE', 'This account has been deactivated.');
  }
  return user;
}

/** Only verifies the Firebase token (used by registration and canteen lookup). */
export const requireIdentity: RequestHandler = async (req, _res, next) => {
  req.identity = await identityFromToken(bearerToken(req));
  next();
};

/**
 * Verifies the token, loads the PostgreSQL account and checks its role. The
 * role stored in PostgreSQL is authoritative.
 */
export function requireRole(...roles: UserRole[]): RequestHandler {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const identity = await identityFromToken(bearerToken(req));
    const user = await userFromIdentity(identity);
    if (roles.length > 0 && !roles.includes(user.role)) {
      throw forbidden('FORBIDDEN', 'Your account is not allowed to perform this action.');
    }
    req.identity = identity;
    req.user = user;
    next();
  };
}

export function currentUser(req: Request): AuthenticatedUser {
  if (!req.user) throw unauthorized('AUTH_REQUIRED', 'Authentication is required.');
  return req.user;
}

export function currentIdentity(req: Request): VerifiedIdentity {
  if (!req.identity) throw unauthorized('AUTH_REQUIRED', 'Authentication is required.');
  return req.identity;
}

/** Canteen the authenticated staff member is assigned to (never taken from the request). */
export function staffCanteenId(req: Request): string {
  const user = currentUser(req);
  const canteenId = user.staffProfile?.canteenId;
  if (user.role !== 'STAFF' || !canteenId) {
    throw forbidden('NO_CANTEEN_ASSIGNED', 'You are not assigned to a canteen yet. Request access from your profile.');
  }
  return canteenId;
}
