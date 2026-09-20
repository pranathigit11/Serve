export type CanteenStatus = 'ACTIVE' | 'INACTIVE';
export type StaffStatus = 'ACTIVE' | 'INACTIVE';
export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Canteen {
  id: string;
  name: string;
  location: string;
  hostelsServed: string[];
  status: CanteenStatus;
}

export interface StaffMember {
  id: string;
  name: string;
  staffId: string;
  email: string;
  role: string;
  canteenId: string; // The ID of the currently assigned canteen
  status: StaffStatus;
}

export interface ChangeRequest {
  id: string;
  staffId: string; // References StaffMember.id
  currentCanteenId: string;
  requestedCanteenId: string;
  reason: string;
  status: RequestStatus;
  createdAt: Date;
}
