import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { Canteen, StaffMember, ChangeRequest, CanteenStatus, RequestStatus, StaffStatus } from '../types';
import { mockCanteens, mockStaff, mockChangeRequests } from '../data/mockData';

interface AppContextType {
  canteens: Canteen[];
  staff: StaffMember[];
  changeRequests: ChangeRequest[];
  
  addCanteen: (canteen: Canteen) => void;
  updateCanteen: (canteen: Canteen) => void;
  toggleCanteenStatus: (canteenId: string, newStatus: CanteenStatus) => void;
  
  updateStaffAssignment: (staffId: string, newCanteenId: string) => void;
  toggleStaffStatus: (staffId: string, newStatus: StaffStatus) => void;
  
  updateChangeRequestStatus: (requestId: string, newStatus: RequestStatus) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [canteens, setCanteens] = useState<Canteen[]>(mockCanteens);
  const [staff, setStaff] = useState<StaffMember[]>(mockStaff);
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>(mockChangeRequests);

  const addCanteen = (canteen: Canteen) => {
    setCanteens([...canteens, canteen]);
  };

  const updateCanteen = (updatedCanteen: Canteen) => {
    setCanteens(canteens.map(c => c.id === updatedCanteen.id ? updatedCanteen : c));
  };

  const toggleCanteenStatus = (canteenId: string, newStatus: CanteenStatus) => {
    setCanteens(canteens.map(c => c.id === canteenId ? { ...c, status: newStatus } : c));
  };

  const updateStaffAssignment = (staffId: string, newCanteenId: string) => {
    setStaff(staff.map(s => s.id === staffId ? { ...s, canteenId: newCanteenId } : s));
  };

  const toggleStaffStatus = (staffId: string, newStatus: StaffStatus) => {
    setStaff(staff.map(s => s.id === staffId ? { ...s, status: newStatus } : s));
  };

  const updateChangeRequestStatus = (requestId: string, newStatus: RequestStatus) => {
    setChangeRequests(requests => requests.map(r => r.id === requestId ? { ...r, status: newStatus } : r));
    
    // Automatically update staff assignment if approved
    if (newStatus === 'APPROVED') {
      const request = changeRequests.find(r => r.id === requestId);
      if (request) {
        updateStaffAssignment(request.staffId, request.requestedCanteenId);
      }
    }
  };

  return (
    <AppContext.Provider value={{
      canteens,
      staff,
      changeRequests,
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
