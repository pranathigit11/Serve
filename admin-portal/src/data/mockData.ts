import type { Canteen, StaffMember, ChangeRequest } from '../types';

export const mockCanteens: Canteen[] = [
  {
    id: 'c1',
    name: 'Krishna & Godavari Night Canteen',
    location: 'Near Krishna Hostel',
    hostelsServed: ['Krishna', 'Godavari'],
    status: 'ACTIVE',
  },
  {
    id: 'c2',
    name: 'Yamuna & Narmada Night Canteen',
    location: 'Near Yamuna Hostel',
    hostelsServed: ['Yamuna', 'Narmada'],
    status: 'ACTIVE',
  },
  {
    id: 'c3',
    name: 'New Hostel Night Canteen',
    location: 'New Hostel Block',
    hostelsServed: ['New Hostel'],
    status: 'ACTIVE',
  },
  {
    id: 'c4',
    name: 'Vedavathi Night Canteen',
    location: 'Vedavathi Block',
    hostelsServed: ['Vedavathi'],
    status: 'ACTIVE',
  },
  {
    id: 'c5',
    name: 'Ganga A & Ganga B Night Canteen',
    location: 'Ganga Block',
    hostelsServed: ['Ganga A', 'Ganga B'],
    status: 'ACTIVE',
  },
];

export const mockStaff: StaffMember[] = [
  {
    id: 's1',
    name: 'Rahul',
    staffId: 'ST-001',
    email: 'rahul@serve.edu',
    role: 'Staff',
    canteenId: 'c1',
    status: 'ACTIVE',
  },
  {
    id: 's2',
    name: 'Priya',
    staffId: 'ST-002',
    email: 'priya@serve.edu',
    role: 'Manager',
    canteenId: 'c2',
    status: 'ACTIVE',
  },
  {
    id: 's3',
    name: 'Amit',
    staffId: 'ST-003',
    email: 'amit@serve.edu',
    role: 'Staff',
    canteenId: 'c3',
    status: 'INACTIVE',
  },
];

export const mockChangeRequests: ChangeRequest[] = [
  {
    id: 'r1',
    staffId: 's1',
    currentCanteenId: 'c1',
    requestedCanteenId: 'c2',
    reason: 'Shift requirement',
    status: 'PENDING',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
  },
  {
    id: 'r2',
    staffId: 's2',
    currentCanteenId: 'c2',
    requestedCanteenId: 'c1',
    reason: 'Temporary coverage',
    status: 'APPROVED',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
  },
];
