import type { AppNotification } from '../types';

export const mockNotifications: AppNotification[] = [
  {
    id: 'n_1',
    message: 'New order #128 received from Krishna Hostel',
    type: 'info',
    createdAt: new Date(Date.now() - 1000 * 60 * 1),
    read: false,
  },
  {
    id: 'n_2',
    message: 'Order #124 is ready for pickup',
    type: 'success',
    createdAt: new Date(Date.now() - 1000 * 60 * 5),
    read: true,
  },
  {
    id: 'n_3',
    message: 'Chicken Grilled Sandwich is running low on ingredients',
    type: 'alert',
    createdAt: new Date(Date.now() - 1000 * 60 * 10),
    read: false,
  },
];
