import { emitTo } from './io.js';
import { rooms } from './rooms.js';

/**
 * Every domain event the backend publishes. Clients only listen; they never
 * emit domain state changes over the socket.
 */
export const SocketEvents = {
  orderCreated: 'order:created',
  orderStatusUpdated: 'order:status_updated',
  orderCancelled: 'order:cancelled',
  canteenOrderTakingUpdated: 'canteen:order_taking_updated',
  canteenUpdated: 'canteen:updated',
  menuAvailabilityUpdated: 'menu:availability_updated',
  menuItemUpdated: 'menu:item_updated',
  menuItemDeleted: 'menu:item_deleted',
  menuCategoryUpdated: 'menu:category_updated',
  changeRequestCreated: 'change_request:created',
  changeRequestUpdated: 'change_request:updated',
  staffAssignmentUpdated: 'staff:canteen_assignment_updated',
  staffUpdated: 'staff:updated',
  notificationCreated: 'notification:created',
} as const;

/** Paid order becomes visible to the canteen's staff. */
export function publishOrderPlaced(order: { canteenId: string }, staffView: unknown, studentId: string, studentView: unknown) {
  emitTo(rooms.canteenStaff(order.canteenId), SocketEvents.orderCreated, staffView);
  emitTo(rooms.user(studentId), SocketEvents.orderStatusUpdated, studentView);
}

export function publishOrderStatus(
  order: { canteenId: string; status: string },
  staffView: unknown,
  studentId: string,
  studentView: unknown,
  visibleToStaff: boolean,
) {
  const event = order.status === 'CANCELLED' ? SocketEvents.orderCancelled : SocketEvents.orderStatusUpdated;
  if (visibleToStaff) emitTo(rooms.canteenStaff(order.canteenId), event, staffView);
  emitTo(rooms.user(studentId), event, studentView);
}

export function publishCanteen(canteen: { id: string }, payload: unknown, orderTakingChanged: boolean) {
  const targets = [rooms.canteenPublic(canteen.id), rooms.canteenStaff(canteen.id), rooms.admins];
  emitTo(targets, SocketEvents.canteenUpdated, payload);
  if (orderTakingChanged) emitTo(targets, SocketEvents.canteenOrderTakingUpdated, payload);
}

export function publishMenuItem(canteenId: string, item: unknown, availabilityChanged: boolean) {
  const targets = [rooms.canteenPublic(canteenId), rooms.canteenStaff(canteenId)];
  emitTo(targets, SocketEvents.menuItemUpdated, item);
  if (availabilityChanged) emitTo(targets, SocketEvents.menuAvailabilityUpdated, item);
}

export function publishMenuItemDeleted(canteenId: string, payload: { id: string; canteenId: string }) {
  emitTo([rooms.canteenPublic(canteenId), rooms.canteenStaff(canteenId)], SocketEvents.menuItemDeleted, payload);
}

export function publishMenuCategory(canteenId: string, category: unknown) {
  emitTo([rooms.canteenPublic(canteenId), rooms.canteenStaff(canteenId)], SocketEvents.menuCategoryUpdated, category);
}

export function publishChangeRequest(staffId: string, request: unknown, created: boolean) {
  emitTo(
    [rooms.admins, rooms.user(staffId)],
    created ? SocketEvents.changeRequestCreated : SocketEvents.changeRequestUpdated,
    request,
  );
}

export function publishStaffAssignment(staffId: string, payload: unknown) {
  emitTo([rooms.admins, rooms.user(staffId)], SocketEvents.staffAssignmentUpdated, payload);
}

export function publishStaffUpdated(payload: unknown) {
  emitTo(rooms.admins, SocketEvents.staffUpdated, payload);
}

export function publishNotification(userId: string, notification: unknown) {
  emitTo(rooms.user(userId), SocketEvents.notificationCreated, notification);
}
