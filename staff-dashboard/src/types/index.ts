export type OrderStatus = 'PLACED' | 'PREPARING' | 'READY' | 'COLLECTED';

export interface OrderItem {
  foodItemName: string;
  quantity: number;
  priceAtTime: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  studentName: string;
  hostel: string;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  createdAt: Date;
  canteenId: string;
}

export type MenuAvailability = 'AVAILABLE' | 'OUT_OF_STOCK';

export interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  availability: MenuAvailability;
  imageUrl?: string;
}

export interface AppNotification {
  id: string;
  message: string;
  type: 'info' | 'alert' | 'success';
  createdAt: Date;
  read: boolean;
}

export interface StaffProfile {
  id: string;
  name: string;
  staffId: string;
  email: string;
  role: string;
  currentCanteen: string;
  assignedHostels: string[];
}
