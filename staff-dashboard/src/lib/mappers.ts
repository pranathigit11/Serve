import type { AppNotification, MenuCategory, MenuItem, Order, OrderStatus } from '../types';

/** Backend payload shapes (see backend/src/modules/dto.ts). */
export interface ApiCanteen {
  id: string;
  name: string;
  location: string;
  hostelsServed: string[];
  status: 'ACTIVE' | 'INACTIVE';
  isAcceptingOrders: boolean;
}

export interface ApiOrder {
  id: string;
  orderNumber: string;
  canteenId: string;
  status: string;
  totalAmount: number;
  items: { name: string; quantity: number; unitPrice: number }[];
  createdAt: string;
  placedAt: string | null;
  student?: { name: string; hostel: string };
}

export interface ApiMenuItem {
  id: string;
  canteenId: string;
  categoryId: string;
  category: string;
  name: string;
  description: string;
  price: number;
  prepTimeMinutes: number;
  imageUrl: string | null;
  isAvailable: boolean;
}

export interface ApiCategory {
  id: string;
  canteenId: string;
  name: string;
  sortOrder: number;
}

export interface ApiNotification {
  id: string;
  type: 'INFO' | 'ALERT' | 'SUCCESS';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

const STAFF_STATUSES: OrderStatus[] = ['PLACED', 'PREPARING', 'READY', 'COLLECTED'];

export const isStaffVisible = (order: ApiOrder) => STAFF_STATUSES.includes(order.status as OrderStatus);

export function toOrder(order: ApiOrder): Order {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    studentName: order.student?.name ?? '',
    hostel: order.student?.hostel ?? '',
    items: order.items.map((item) => ({
      foodItemName: item.name,
      quantity: item.quantity,
      priceAtTime: item.unitPrice,
    })),
    totalAmount: order.totalAmount,
    status: order.status as OrderStatus,
    createdAt: new Date(order.placedAt ?? order.createdAt),
    canteenId: order.canteenId,
  };
}

export function toMenuItem(item: ApiMenuItem): MenuItem {
  return {
    id: item.id,
    name: item.name,
    category: item.category,
    categoryId: item.categoryId,
    price: item.price,
    availability: item.isAvailable ? 'AVAILABLE' : 'OUT_OF_STOCK',
    description: item.description,
    prepTime: String(item.prepTimeMinutes),
    imageUrl: item.imageUrl ?? undefined,
  };
}

export const toCategory = (category: ApiCategory): MenuCategory => ({
  id: category.id,
  name: category.name,
  sortOrder: category.sortOrder,
});

export function toNotification(notification: ApiNotification): AppNotification {
  return {
    id: notification.id,
    message: notification.message,
    type: notification.type === 'ALERT' ? 'alert' : notification.type === 'SUCCESS' ? 'success' : 'info',
    createdAt: new Date(notification.createdAt),
    read: notification.isRead,
  };
}
