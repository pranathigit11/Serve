import type { Order } from '../types';

export const mockOrders: Order[] = [
  {
    id: 'o_1',
    orderNumber: '124',
    studentName: 'Aryan',
    hostel: 'Krishna',
    items: [
      { foodItemName: 'Veg Grilled Sandwich', quantity: 2, priceAtTime: 50 },
      { foodItemName: 'Cold Coffee', quantity: 1, priceAtTime: 30 },
    ],
    totalAmount: 130,
    status: 'PREPARING',
    createdAt: new Date(Date.now() - 1000 * 60 * 15), // 15 mins ago
    canteenId: 'canteen_krishna_godavari',
  },
  {
    id: 'o_2',
    orderNumber: '125',
    studentName: 'Rahul',
    hostel: 'Godavari',
    items: [
      { foodItemName: 'Chicken Roll', quantity: 1, priceAtTime: 80 },
      { foodItemName: 'Lemon Tea', quantity: 2, priceAtTime: 30 },
    ],
    totalAmount: 140,
    status: 'READY',
    createdAt: new Date(Date.now() - 1000 * 60 * 25), // 25 mins ago
    canteenId: 'canteen_krishna_godavari',
  },
  {
    id: 'o_3',
    orderNumber: '126',
    studentName: 'Sneha',
    hostel: 'Krishna',
    items: [
      { foodItemName: 'Masala Dosa', quantity: 1, priceAtTime: 60 },
    ],
    totalAmount: 60,
    status: 'PLACED',
    createdAt: new Date(Date.now() - 1000 * 60 * 2), // 2 mins ago
    canteenId: 'canteen_krishna_godavari',
  },
  {
    id: 'o_4',
    orderNumber: '127',
    studentName: 'Rohan',
    hostel: 'Godavari',
    items: [
      { foodItemName: 'Paneer Grilled Sandwich', quantity: 1, priceAtTime: 75 },
      { foodItemName: 'Fresh Lime Soda', quantity: 1, priceAtTime: 40 },
    ],
    totalAmount: 115,
    status: 'PLACED',
    createdAt: new Date(Date.now() - 1000 * 60 * 1), // 1 min ago
    canteenId: 'canteen_krishna_godavari',
  },
];
