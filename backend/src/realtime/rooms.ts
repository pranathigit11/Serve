import type { UserRole } from '../generated/prisma/client.js';

/**
 * Room naming. Clients never choose rooms: the server derives membership from
 * the authenticated account's PostgreSQL state (see realtime/io.ts).
 */
export const rooms = {
  /** Private events for one account (their orders, notifications, requests). */
  user: (userId: string) => `user:${userId}`,
  /** Private order stream for staff assigned to one canteen. */
  canteenStaff: (canteenId: string) => `canteen:${canteenId}:staff`,
  /** Public menu / order-taking updates for anyone browsing one canteen. */
  canteenPublic: (canteenId: string) => `canteen:${canteenId}:public`,
  admins: 'admins',
} as const;

export interface RoomSubject {
  id: string;
  role: UserRole;
  studentCanteenId: string | null;
  staffCanteenId: string | null;
}

export function roomsFor(subject: RoomSubject): string[] {
  const result = [rooms.user(subject.id)];
  if (subject.role === 'STUDENT' && subject.studentCanteenId) {
    result.push(rooms.canteenPublic(subject.studentCanteenId));
  }
  if (subject.role === 'STAFF' && subject.staffCanteenId) {
    result.push(rooms.canteenStaff(subject.staffCanteenId), rooms.canteenPublic(subject.staffCanteenId));
  }
  if (subject.role === 'ADMIN') {
    result.push(rooms.admins);
  }
  return result;
}
