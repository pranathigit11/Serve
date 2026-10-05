/**
 * Grants the ADMIN role to an existing Firebase Authentication user.
 *
 *   npm run admin:create -- --email admin@college.edu [--name "Canteen Admin"]
 *   npm run admin:create -- --uid <firebase-uid> --email admin@college.edu
 *
 * Admins can never self-register through the API. With --email only, the
 * Firebase user is looked up via the Admin SDK (requires service-account
 * credentials, or the Auth emulator in development). No passwords are created
 * or stored here: the person signs in with their own Firebase credentials.
 */
import { parseArgs } from 'node:util';
import { firebaseAuth } from '../src/lib/firebase.js';
import { prisma } from '../src/lib/prisma.js';

async function main() {
  const { values } = parseArgs({
    options: { email: { type: 'string' }, uid: { type: 'string' }, name: { type: 'string' } },
  });
  if (!values.email && !values.uid) throw new Error('Pass --email and/or --uid');

  const firebaseUser = values.uid
    ? await firebaseAuth().getUser(values.uid)
    : await firebaseAuth().getUserByEmail(values.email!);
  const email = (firebaseUser.email ?? values.email ?? '').toLowerCase();
  if (!email) throw new Error('The Firebase user has no email address');

  const existing = await prisma.user.findUnique({ where: { firebaseUid: firebaseUser.uid } });
  if (existing && existing.role !== 'ADMIN') {
    throw new Error(`This Firebase user is already registered as ${existing.role}; refusing to change roles.`);
  }

  const admin = await prisma.user.upsert({
    where: { firebaseUid: firebaseUser.uid },
    update: { status: 'ACTIVE' },
    create: {
      firebaseUid: firebaseUser.uid,
      email,
      name: values.name ?? firebaseUser.displayName ?? 'Administrator',
      role: 'ADMIN',
    },
  });
  console.log(`Admin ready: ${admin.email} (${admin.id})`);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
