import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { Canteen, StaffMember, ChangeRequest, CanteenStatus, RequestStatus, StaffStatus } from '../types';
import { api, errorMessage } from '../lib/api';
import { connectRealtime } from '../lib/socket';
import { useAuth } from './AuthContext';

interface AppContextType {
  loading: boolean;
  canteens: Canteen[];
  staff: StaffMember[];
  changeRequests: ChangeRequest[];

  addCanteen: (canteen: Canteen) => Promise<boolean>;
  updateCanteen: (canteen: Canteen) => Promise<boolean>;
  toggleCanteenStatus: (canteenId: string, newStatus: CanteenStatus) => Promise<void>;

  updateStaffAssignment: (staffId: string, newCanteenId: string) => Promise<void>;
  toggleStaffStatus: (staffId: string, newStatus: StaffStatus) => Promise<void>;

  updateChangeRequestStatus: (requestId: string, newStatus: RequestStatus) => Promise<void>;
}

interface ApiChangeRequest extends Omit<ChangeRequest, 'createdAt'> {
  createdAt: string;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const upsert = <T extends { id: string }>(list: T[], item: T) =>
  list.some((existing) => existing.id === item.id)
    ? list.map((existing) => (existing.id === item.id ? item : existing))
    : [...list, item];

const toRequest = (request: ApiChangeRequest): ChangeRequest => ({ ...request, createdAt: new Date(request.createdAt) });

const canteenPayload = (canteen: Canteen) => ({
  name: canteen.name.trim(),
  location: canteen.location.trim(),
  hostelsServed: canteen.hostelsServed,
  status: canteen.status,
});

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [canteens, setCanteens] = useState<Canteen[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);

  /** PostgreSQL (via the API) is the source of truth for everything shown. */
  const refresh = useCallback(async () => {
    try {
      const [canteenRes, staffRes, requestRes] = await Promise.all([
        api.get<{ canteens: Canteen[] }>('/api/admin/canteens'),
        api.get<{ staff: StaffMember[] }>('/api/admin/staff'),
        api.get<{ requests: ApiChangeRequest[] }>('/api/admin/canteen-requests'),
      ]);
      setCanteens(canteenRes.canteens);
      setStaff(staffRes.staff);
      setChangeRequests(requestRes.requests.map(toRequest));
    } catch (error) {
      console.error('Failed to load admin data', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const socket = connectRealtime();
    socket.on('connect_error', (error) => {
      if (error.message === 'ACCOUNT_INACTIVE' || error.message === 'ACCOUNT_NOT_REGISTERED') void signOut();
    });
    socket.io.on('reconnect', () => void refresh());
    // New requests may come from newly registered staff: reload staff as well.
    socket.on('change_request:created', () => void refresh());
    socket.on('change_request:updated', (request: ApiChangeRequest) =>
      setChangeRequests((prev) => upsert(prev, toRequest(request))),
    );
    socket.on('staff:canteen_assignment_updated', (member: StaffMember) => setStaff((prev) => upsert(prev, member)));
    socket.on('staff:updated', (member: StaffMember) => setStaff((prev) => upsert(prev, member)));
    socket.on('canteen:updated', (canteen: Canteen & { isAcceptingOrders?: boolean }) => {
      const { isAcceptingOrders: _ignored, ...rest } = canteen;
      setCanteens((prev) => upsert(prev, rest));
    });
    return () => {
      socket.removeAllListeners();
      socket.io.removeAllListeners();
      socket.disconnect();
    };
  }, [refresh, signOut]);

  const addCanteen = async (canteen: Canteen) => {
    try {
      const res = await api.post<{ canteen: Canteen }>('/api/admin/canteens', canteenPayload(canteen));
      setCanteens((prev) => upsert(prev, res.canteen));
      return true;
    } catch (error) {
      alert(errorMessage(error));
      return false;
    }
  };

  const updateCanteen = async (updatedCanteen: Canteen) => {
    try {
      const res = await api.patch<{ canteen: Canteen }>(
        `/api/admin/canteens/${updatedCanteen.id}`,
        canteenPayload(updatedCanteen),
      );
      setCanteens((prev) => upsert(prev, res.canteen));
      return true;
    } catch (error) {
      alert(errorMessage(error));
      return false;
    }
  };

  const toggleCanteenStatus = async (canteenId: string, newStatus: CanteenStatus) => {
    try {
      const res = await api.patch<{ canteen: Canteen }>(`/api/admin/canteens/${canteenId}`, { status: newStatus });
      setCanteens((prev) => upsert(prev, res.canteen));
    } catch (error) {
      alert(errorMessage(error));
    }
  };

  const updateStaffAssignment = async (staffId: string, newCanteenId: string) => {
    try {
      const res = await api.patch<{ staff: StaffMember }>(`/api/admin/staff/${staffId}/assignment`, {
        canteenId: newCanteenId,
      });
      setStaff((prev) => upsert(prev, res.staff));
    } catch (error) {
      alert(errorMessage(error));
    }
  };

  const toggleStaffStatus = async (staffId: string, newStatus: StaffStatus) => {
    try {
      const res = await api.patch<{ staff: StaffMember }>(`/api/admin/staff/${staffId}/status`, { status: newStatus });
      setStaff((prev) => upsert(prev, res.staff));
    } catch (error) {
      alert(errorMessage(error));
    }
  };

  // Approval and the resulting staff assignment happen atomically on the server.
  const updateChangeRequestStatus = async (requestId: string, newStatus: RequestStatus) => {
    const decision = newStatus === 'APPROVED' ? 'approve' : newStatus === 'REJECTED' ? 'reject' : null;
    if (!decision) return;
    try {
      const res = await api.post<{ request: ApiChangeRequest }>(`/api/admin/canteen-requests/${requestId}/${decision}`);
      setChangeRequests((prev) => upsert(prev, toRequest(res.request)));
      if (decision === 'approve') {
        const staffRes = await api.get<{ staff: StaffMember[] }>('/api/admin/staff');
        setStaff(staffRes.staff);
      }
    } catch (error) {
      alert(errorMessage(error));
      void refresh();
    }
  };

  return (
    <AppContext.Provider
      value={{
        loading,
        canteens,
        staff,
        changeRequests,
        addCanteen,
        updateCanteen,
        toggleCanteenStatus,
        updateStaffAssignment,
        toggleStaffStatus,
        updateChangeRequestStatus,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
