import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type {
  AppNotification,
  CanteenOption,
  MenuAvailability,
  MenuCategory,
  MenuItem,
  Order,
  OrderStatus,
} from '../types';
import { api, errorMessage } from '../lib/api';
import {
  isStaffVisible,
  toCategory,
  toMenuItem,
  toNotification,
  toOrder,
  type ApiCanteen,
  type ApiCategory,
  type ApiMenuItem,
  type ApiNotification,
  type ApiOrder,
} from '../lib/mappers';
import { connectRealtime } from '../lib/socket';
import { useAuth } from './AuthContext';

interface ProfileData {
  name: string;
  id: string;
  email: string;
  role: string;
  canteen: string;
  canteenId: string | null;
  pendingCanteenRequest: string | null;
}

interface AppContextType {
  loading: boolean;
  orders: Order[];
  updateOrderStatus: (id: string, status: OrderStatus) => Promise<void>;
  menuItems: MenuItem[];
  categories: MenuCategory[];
  updateMenuAvailability: (id: string, availability: MenuAvailability) => Promise<void>;
  addMenuItem: (item: MenuItem) => Promise<boolean>;
  updateMenuItem: (item: MenuItem) => Promise<boolean>;
  addCategory: (name: string) => Promise<MenuCategory | null>;
  notifications: AppNotification[];
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  isAcceptingOrders: boolean;
  setIsAcceptingOrders: (val: boolean) => Promise<void>;
  profile: ProfileData;
  canteens: CanteenOption[];
  requestCanteenChange: (canteenId: string) => Promise<void>;
}

interface StaffMe {
  id: string;
  name: string;
  email: string;
  staffId: string;
  role: string;
  canteen: ApiCanteen | null;
  pendingRequest: { requestedCanteenName: string } | null;
}

const emptyProfile: ProfileData = {
  name: '',
  id: '',
  email: '',
  role: '',
  canteen: 'No canteen assigned',
  canteenId: null,
  pendingCanteenRequest: null,
};

const AppContext = createContext<AppContextType | undefined>(undefined);

const upsert = <T extends { id: string }>(list: T[], item: T) =>
  list.some((existing) => existing.id === item.id)
    ? list.map((existing) => (existing.id === item.id ? item : existing))
    : [item, ...list];

const sortOrders = (orders: Order[]) => [...orders].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

function menuPayload(item: MenuItem) {
  const prepTime = Number.parseInt(String(item.prepTime ?? '').replace(/[^0-9]/g, ''), 10);
  return {
    categoryId: item.categoryId,
    name: item.name.trim(),
    price: Number(item.price),
    description: item.description ?? '',
    ...(Number.isFinite(prepTime) ? { prepTimeMinutes: prepTime } : {}),
    isAvailable: item.availability === 'AVAILABLE',
  };
}

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isAcceptingOrders, setAccepting] = useState(true);
  const [profile, setProfile] = useState<ProfileData>(emptyProfile);
  const [canteens, setCanteens] = useState<CanteenOption[]>([]);
  const canteenIdRef = useRef<string | null>(null);

  /** Loads everything from the backend; the database is the source of truth. */
  const refresh = useCallback(async () => {
    try {
      const [{ staff }, notificationRes, canteenRes] = await Promise.all([
        api.get<{ staff: StaffMe }>('/api/staff/me'),
        api.get<{ notifications: ApiNotification[] }>('/api/notifications'),
        api.get<{ canteens: ApiCanteen[] }>('/api/canteens'),
      ]);
      canteenIdRef.current = staff.canteen?.id ?? null;
      setProfile({
        name: staff.name,
        id: staff.staffId,
        email: staff.email,
        role: staff.role,
        canteen: staff.canteen?.name ?? 'No canteen assigned',
        canteenId: staff.canteen?.id ?? null,
        pendingCanteenRequest: staff.pendingRequest?.requestedCanteenName ?? null,
      });
      setAccepting(staff.canteen?.isAcceptingOrders ?? false);
      setNotifications(notificationRes.notifications.map(toNotification));
      setCanteens(canteenRes.canteens.map((c) => ({ id: c.id, name: c.name })));

      if (staff.canteen) {
        const [orderRes, menuRes] = await Promise.all([
          api.get<{ orders: ApiOrder[] }>('/api/staff/orders'),
          api.get<{ categories: ApiCategory[]; items: ApiMenuItem[] }>('/api/staff/menu'),
        ]);
        setOrders(sortOrders(orderRes.orders.map(toOrder)));
        setCategories(menuRes.categories.map(toCategory));
        setMenuItems(menuRes.items.map(toMenuItem));
      } else {
        setOrders([]);
        setCategories([]);
        setMenuItems([]);
      }
    } catch (error) {
      console.error('Failed to load staff data', error);
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
    // Catch up on anything missed while disconnected.
    socket.io.on('reconnect', () => void refresh());

    const onOrder = (order: ApiOrder) => {
      if (order.canteenId !== canteenIdRef.current) return;
      setOrders((prev) =>
        isStaffVisible(order) ? sortOrders(upsert(prev, toOrder(order))) : prev.filter((o) => o.id !== order.id),
      );
    };
    socket.on('order:created', onOrder);
    socket.on('order:status_updated', onOrder);
    socket.on('order:cancelled', (order: ApiOrder) => setOrders((prev) => prev.filter((o) => o.id !== order.id)));

    socket.on('menu:item_updated', (item: ApiMenuItem) => {
      if (item.canteenId === canteenIdRef.current) setMenuItems((prev) => upsert(prev, toMenuItem(item)));
    });
    socket.on('menu:item_deleted', ({ id }: { id: string }) => setMenuItems((prev) => prev.filter((m) => m.id !== id)));
    socket.on('menu:category_updated', (category: ApiCategory) => {
      if (category.canteenId === canteenIdRef.current) {
        setCategories((prev) => upsert(prev, toCategory(category)).sort((a, b) => a.sortOrder - b.sortOrder));
      }
    });
    socket.on('canteen:updated', (canteen: ApiCanteen) => {
      if (canteen.id === canteenIdRef.current) {
        setAccepting(canteen.isAcceptingOrders);
        setProfile((prev) => ({ ...prev, canteen: canteen.name }));
      }
    });
    socket.on('notification:created', (notification: ApiNotification) =>
      setNotifications((prev) => upsert(prev, toNotification(notification))),
    );
    // Assignment changed by an admin: the server already moved this socket; reload data.
    socket.on('staff:canteen_assignment_updated', () => void refresh());
    socket.on('change_request:updated', () => void refresh());

    return () => {
      socket.removeAllListeners();
      socket.io.removeAllListeners();
      socket.disconnect();
    };
  }, [refresh, signOut]);

  const updateOrderStatus = async (id: string, status: OrderStatus) => {
    try {
      const { order } = await api.patch<{ order: ApiOrder }>(`/api/staff/orders/${id}/status`, { status });
      setOrders((prev) => sortOrders(upsert(prev, toOrder(order))));
    } catch (error) {
      alert(errorMessage(error));
      void refresh();
    }
  };

  const updateMenuAvailability = async (id: string, availability: MenuAvailability) => {
    try {
      const { item } = await api.patch<{ item: ApiMenuItem }>(`/api/staff/menu/items/${id}/availability`, {
        isAvailable: availability === 'AVAILABLE',
      });
      setMenuItems((prev) => upsert(prev, toMenuItem(item)));
    } catch (error) {
      alert(errorMessage(error));
    }
  };

  const addMenuItem = async (item: MenuItem) => {
    try {
      const { item: created } = await api.post<{ item: ApiMenuItem }>('/api/staff/menu/items', menuPayload(item));
      setMenuItems((prev) => upsert(prev, toMenuItem(created)));
      return true;
    } catch (error) {
      alert(errorMessage(error));
      return false;
    }
  };

  const updateMenuItem = async (item: MenuItem) => {
    try {
      const { item: updated } = await api.patch<{ item: ApiMenuItem }>(
        `/api/staff/menu/items/${item.id}`,
        menuPayload(item),
      );
      setMenuItems((prev) => upsert(prev, toMenuItem(updated)));
      return true;
    } catch (error) {
      alert(errorMessage(error));
      return false;
    }
  };

  const addCategory = async (name: string) => {
    try {
      const { category } = await api.post<{ category: ApiCategory }>('/api/staff/menu/categories', { name });
      const mapped = toCategory(category);
      setCategories((prev) => upsert(prev, mapped).sort((a, b) => a.sortOrder - b.sortOrder));
      return mapped;
    } catch (error) {
      alert(errorMessage(error));
      return null;
    }
  };

  const markNotificationRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    api.post(`/api/notifications/${id}/read`).catch(() => void refresh());
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    api.post('/api/notifications/read-all').catch(() => void refresh());
  };

  const setIsAcceptingOrders = async (val: boolean) => {
    try {
      const { canteen } = await api.patch<{ canteen: ApiCanteen }>('/api/staff/canteen/order-taking', {
        isAcceptingOrders: val,
      });
      setAccepting(canteen.isAcceptingOrders);
    } catch (error) {
      alert(errorMessage(error));
    }
  };

  const requestCanteenChange = async (canteenId: string) => {
    try {
      await api.post('/api/staff/canteen-requests', { toCanteenId: canteenId });
      await refresh();
    } catch (error) {
      alert(errorMessage(error));
    }
  };

  return (
    <AppContext.Provider
      value={{
        loading,
        orders,
        updateOrderStatus,
        menuItems,
        categories,
        updateMenuAvailability,
        addMenuItem,
        updateMenuItem,
        addCategory,
        notifications,
        markNotificationRead,
        markAllNotificationsRead,
        isAcceptingOrders,
        setIsAcceptingOrders,
        profile,
        canteens,
        requestCanteenChange,
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
