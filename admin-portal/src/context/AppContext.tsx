import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { Canteen, StaffMember, ChangeRequest, CanteenStatus, RequestStatus, StaffStatus } from '../types';
import { adminService } from '../services/api';
import { socketService } from '../services/socket';

interface AppContextType {
  canteens: Canteen[];
  staff: StaffMember[];
  changeRequests: ChangeRequest[];
  hostels: any[];
  isLoading: boolean;
  
  refreshData: () => Promise<void>;
  addCanteen: (canteen: any) => Promise<void>;
  updateCanteen: (canteen: any) => Promise<void>;
  toggleCanteenStatus: (canteenId: string, newStatus: CanteenStatus) => Promise<void>;
  
  updateStaffAssignment: (staffId: string, newCanteenId: string) => Promise<void>;
  toggleStaffStatus: (staffId: string, newStatus: StaffStatus) => Promise<void>;
  
  updateChangeRequestStatus: (requestId: string, newStatus: RequestStatus) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Map backend to frontend models
const mapCanteen = (c: any): Canteen => ({
  id: c.id,
  name: c.name,
  location: c.location,
  hostelsServed: c.hostels ? c.hostels.map((h: any) => h.name) : [],
  status: c.isActive ? 'ACTIVE' : 'INACTIVE'
});

const mapStaff = (s: any): StaffMember => ({
  id: s.id,
  name: s.name,
  staffId: s.staffId,
  email: s.email,
  role: 'Staff',
  canteenId: s.assignedCanteenId,
  status: s.isActive ? 'ACTIVE' : 'INACTIVE'
});

const mapChangeRequest = (r: any): ChangeRequest => ({
  id: r.id,
  staffId: r.staffId,
  currentCanteenId: r.currentCanteenId,
  requestedCanteenId: r.requestedCanteenId,
  reason: r.reason || '',
  status: r.status,
  createdAt: new Date(r.requestedAt)
});

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [canteens, setCanteens] = useState<Canteen[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);
  const [hostels, setHostels] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshData = async () => {
    try {
      setIsLoading(true);
      const [canteensData, staffData, requestsData, hostelsData] = await Promise.all([
        adminService.getCanteens(),
        adminService.getStaff(),
        adminService.getChangeRequests(),
        fetch('http://localhost:5001/api/hostels').then(res => res.json()).then(d => d.data)
      ]);
      
      setHostels(hostelsData || []);
      setCanteens(canteensData.map(mapCanteen));
      setStaff(staffData.map(mapStaff));
      setChangeRequests(requestsData.map(mapChangeRequest));
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshData();

    // The user identity is an admin
    socketService.connect('', ''); // Provide empty staff/canteen ID
    socketService.on('connect', () => {
      // Connect handles this internally but for admin we join the admin room
      // Since our socketService in admin-portal is just a copy, let's explicitly emit join:admin
      // Wait, socket.ts connect() does not join admin room.
    });

    socketService.on('change_request:created', () => {
      refreshData();
    });

    socketService.on('change_request:updated', () => {
      refreshData();
    });

    socketService.on('staff:canteen_assignment_updated', () => {
      refreshData();
    });

    return () => {
      // no disconnect needed for now
    };
  }, []);

  const addCanteen = async (canteen: any) => {
    await adminService.createCanteen(canteen);
    await refreshData();
  };

  const updateCanteen = async (updatedCanteen: any) => {
    await adminService.updateCanteen(updatedCanteen.id, updatedCanteen);
    await refreshData();
  };

  const toggleCanteenStatus = async (canteenId: string, newStatus: CanteenStatus) => {
    if (newStatus === 'ACTIVE') {
      await adminService.activateCanteen(canteenId);
    } else {
      await adminService.deactivateCanteen(canteenId);
    }
    await refreshData();
  };

  const updateStaffAssignment = async (staffId: string, newCanteenId: string) => {
    await adminService.changeStaffCanteen(staffId, newCanteenId);
    await refreshData();
  };

  const toggleStaffStatus = async (staffId: string, newStatus: StaffStatus) => {
    if (newStatus === 'ACTIVE') {
      await adminService.activateStaff(staffId);
    } else {
      await adminService.deactivateStaff(staffId);
    }
    await refreshData();
  };

  const updateChangeRequestStatus = async (requestId: string, newStatus: RequestStatus) => {
    if (newStatus === 'APPROVED') {
      await adminService.approveChangeRequest(requestId);
    } else if (newStatus === 'REJECTED') {
      await adminService.rejectChangeRequest(requestId, 'Admin decision via dashboard');
    }
    await refreshData();
  };

  return (
    <AppContext.Provider value={{
      canteens,
      staff,
      changeRequests,
      hostels,
      isLoading,
      refreshData,
      addCanteen,
      updateCanteen,
      toggleCanteenStatus,
      updateStaffAssignment,
      toggleStaffStatus,
      updateChangeRequestStatus
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
