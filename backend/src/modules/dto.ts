import type {
  Canteen,
  MenuCategory,
  MenuItem,
  Notification,
  Order,
  OrderItem,
  Payment,
  StaffCanteenRequest,
  StaffProfile,
  StudentProfile,
  User,
} from '../generated/prisma/client.js';
import { moneyToNumber } from '../lib/money.js';

const iso = (date: Date | null | undefined) => (date ? date.toISOString() : null);

export const staffCode = (staffNumber: number) => `ST-${String(staffNumber).padStart(3, '0')}`;

export function canteenDto(canteen: Canteen) {
  return {
    id: canteen.id,
    name: canteen.name,
    location: canteen.location,
    hostelsServed: canteen.hostelsServed,
    status: canteen.status,
    isAcceptingOrders: canteen.isAcceptingOrders,
  };
}

export function categoryDto(category: MenuCategory) {
  return {
    id: category.id,
    canteenId: category.canteenId,
    name: category.name,
    sortOrder: category.sortOrder,
  };
}

export function menuItemDto(item: MenuItem & { category: MenuCategory }) {
  return {
    id: item.id,
    canteenId: item.canteenId,
    categoryId: item.categoryId,
    category: item.category.name,
    name: item.name,
    description: item.description,
    price: moneyToNumber(item.price),
    prepTimeMinutes: item.prepTimeMinutes,
    imageUrl: item.imageUrl,
    isAvailable: item.isAvailable,
    updatedAt: item.updatedAt.toISOString(),
  };
}

export type OrderWithRelations = Order & {
  items: OrderItem[];
  canteen: Canteen;
  student?: (User & { studentProfile: StudentProfile | null }) | null;
};

export function orderDto(order: OrderWithRelations, options: { includeStudent?: boolean } = {}) {
  return {
    id: order.id,
    orderNumber: String(order.orderNumber),
    canteenId: order.canteenId,
    canteenName: order.canteen.name,
    status: order.status,
    totalAmount: moneyToNumber(order.totalAmount),
    items: order.items.map((item) => ({
      menuItemId: item.menuItemId,
      name: item.itemName,
      quantity: item.quantity,
      unitPrice: moneyToNumber(item.unitPrice),
      lineTotal: moneyToNumber(item.lineTotal),
    })),
    createdAt: order.createdAt.toISOString(),
    placedAt: iso(order.placedAt),
    estimatedReadyAt: iso(order.estimatedReadyAt),
    preparingAt: iso(order.preparingAt),
    readyAt: iso(order.readyAt),
    collectedAt: iso(order.collectedAt),
    cancelledAt: iso(order.cancelledAt),
    cancellationReason: order.cancellationReason,
    ...(options.includeStudent && order.student
      ? {
          student: {
            name: order.student.name,
            hostel: order.student.studentProfile?.hostel ?? '',
          },
        }
      : {}),
  };
}

export function paymentDto(payment: Payment) {
  return {
    id: payment.id,
    orderId: payment.orderId,
    provider: payment.provider,
    providerOrderId: payment.providerOrderId,
    amount: moneyToNumber(payment.amount),
    currency: payment.currency,
    status: payment.status,
  };
}

export function notificationDto(notification: Notification) {
  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    isRead: notification.isRead,
    orderId: notification.orderId,
    createdAt: notification.createdAt.toISOString(),
  };
}

export function canteenRequestDto(request: StaffCanteenRequest) {
  return {
    id: request.id,
    staffId: request.staffId,
    currentCanteenId: request.fromCanteenId,
    requestedCanteenId: request.toCanteenId,
    reason: request.reason,
    status: request.status,
    createdAt: request.createdAt.toISOString(),
    reviewedAt: iso(request.reviewedAt),
  };
}

export function staffMemberDto(user: User & { staffProfile: StaffProfile | null }) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    staffId: user.staffProfile ? staffCode(user.staffProfile.staffNumber) : '',
    role: user.staffProfile?.title ?? 'Staff',
    canteenId: user.staffProfile?.canteenId ?? null,
    status: user.status,
  };
}

export function accountDto(
  user: User & { studentProfile: StudentProfile | null; staffProfile: StaffProfile | null },
) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    role: user.role,
    status: user.status,
    student: user.studentProfile
      ? {
          rollNumber: user.studentProfile.rollNumber,
          hostel: user.studentProfile.hostel,
          selectedCanteenId: user.studentProfile.selectedCanteenId,
        }
      : null,
    staff: user.staffProfile
      ? {
          staffId: staffCode(user.staffProfile.staffNumber),
          title: user.staffProfile.title,
          canteenId: user.staffProfile.canteenId,
        }
      : null,
  };
}
