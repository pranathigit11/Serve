import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { Order, MenuItem, AppNotification, OrderStatus, MenuAvailability } from '../types';
import { mockOrders } from '../data/mockOrders';
import { mockMenu } from '../data/mockMenu';
import { mockNotifications } from '../data/mockNotifications';

interface ProfileData {
  name: string;
  id: string;
  role: string;
  canteen: string;
  pendingCanteenRequest: string | null;
}

interface AppContextType {
  orders: Order[];
  updateOrderStatus: (id: string, status: OrderStatus) => void;
  menuItems: MenuItem[];
  updateMenuAvailability: (id: string, availability: MenuAvailability) => void;
  addMenuItem: (item: MenuItem) => void;
  updateMenuItem: (item: MenuItem) => void;
  notifications: AppNotification[];
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  isAcceptingOrders: boolean;
  setIsAcceptingOrders: (val: boolean) => void;
  profile: ProfileData;
  requestCanteenChange: (newCanteen: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [orders, setOrders] = useState<Order[]>(mockOrders);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(mockMenu);
  const [notifications, setNotifications] = useState<AppNotification[]>(mockNotifications);
  const [isAcceptingOrders, setIsAcceptingOrders] = useState(true);
  const [profile, setProfile] = useState<ProfileData>({
    name: 'Admin Staff',
    id: 'ST-001',
    role: 'Canteen Manager',
    canteen: 'Krishna & Godavari Night Canteen',
    pendingCanteenRequest: null,
  });

  const updateOrderStatus = (id: string, status: OrderStatus) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
  };

  const updateMenuAvailability = (id: string, availability: MenuAvailability) => {
    setMenuItems(prev => prev.map(m => m.id === id ? { ...m, availability } : m));
  };

  const addMenuItem = (item: MenuItem) => {
    setMenuItems(prev => [...prev, item]);
  };

  const updateMenuItem = (item: MenuItem) => {
    setMenuItems(prev => prev.map(m => m.id === item.id ? item : m));
  };

  const markNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const requestCanteenChange = (newCanteen: string) => {
    setProfile(prev => ({ ...prev, pendingCanteenRequest: newCanteen }));
  };

  return (
    <AppContext.Provider value={{
      orders, updateOrderStatus,
      menuItems, updateMenuAvailability, addMenuItem, updateMenuItem,
      notifications, markNotificationRead, markAllNotificationsRead,
      isAcceptingOrders, setIsAcceptingOrders,
      profile, requestCanteenChange
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
