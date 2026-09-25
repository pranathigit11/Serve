import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { Order, MenuItem, AppNotification, OrderStatus, MenuAvailability } from '../types';
import { staffService } from '../services/api';
import { socketService } from '../services/socket';
import { mockNotifications } from '../data/mockNotifications';

interface ProfileData {
  name: string;
  id: string; // This is the user's staffId (e.g. ST-001) for UI purposes. Or the real ID. We will store real ID in profile.backendId
  backendId: string;
  role: string;
  canteen: string;
  canteenId: string;
  pendingCanteenRequest: string | null;
}

interface AppContextType {
  orders: Order[];
  updateOrderStatus: (id: string, status: OrderStatus) => Promise<void>;
  menuItems: MenuItem[];
  updateMenuAvailability: (id: string, availability: MenuAvailability) => Promise<void>;
  addMenuItem: (item: any) => Promise<void>;
  updateMenuItem: (item: any) => Promise<void>;
  notifications: AppNotification[];
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  isAcceptingOrders: boolean;
  setIsAcceptingOrders: (val: boolean) => Promise<void>;
  profile: ProfileData | null;
  requestCanteenChange: (newCanteenId: string, reason: string) => Promise<void>;
  isLoading: boolean;
  canteens: any[];
  categories: any[];
  refreshOrders: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Map backend order to frontend order
const mapOrder = (o: any): Order => ({
  id: o.id,
  orderNumber: o.orderNumber,
  studentName: o.student.name,
  hostel: o.student.hostel.name,
  items: o.items.map((i: any) => ({
    foodItemName: i.menuItem.name,
    quantity: i.quantity,
    priceAtTime: parseFloat(i.priceAtTime)
  })),
  totalAmount: parseFloat(o.totalAmount),
  status: o.status,
  createdAt: new Date(o.createdAt),
  canteenId: o.canteenId
});

// Map backend menu to frontend menu
const mapMenu = (m: any): MenuItem => ({
  id: m.id,
  name: m.name,
  category: m.category?.name || 'General',
  price: parseFloat(m.price),
  availability: m.isAvailable ? 'AVAILABLE' : 'OUT_OF_STOCK',
  description: m.description || '',
  imageUrl: m.imageUrl || ''
});

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>(mockNotifications);
  const [isAcceptingOrders, setIsAcceptingOrdersState] = useState(true);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [canteens, setCanteens] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    try {
      setIsLoading(true);
      // Load profile first
      const profileData = await staffService.getProfile();
      
      const assignedCanteenId = profileData.canteen.id;
      
      // Load pending requests
      const requests = await staffService.getChangeRequests();
      const pendingReq = requests.find((r: any) => r.status === 'PENDING');

      setProfile({
        name: profileData.name,
        id: profileData.staffId,
        backendId: profileData.id,
        role: 'Staff',
        canteen: profileData.canteen.name,
        canteenId: assignedCanteenId,
        pendingCanteenRequest: pendingReq ? pendingReq.requestedCanteenId : null
      });

      setIsAcceptingOrdersState(profileData.canteen.isAcceptingOrders);

      // Load orders, menu, and canteens
      const [ordersData, menuData, canteensData] = await Promise.all([
        staffService.getOrders(assignedCanteenId),
        staffService.getMenu(assignedCanteenId),
        staffService.getAllCanteens()
      ]);

      setOrders(ordersData.map(mapOrder));
      
      // Menu endpoints return categories with menuItems inside them.
      let flatMenu: MenuItem[] = [];
      let catList: any[] = [];
      if (Array.isArray(menuData)) {
        menuData.forEach((cat: any) => {
          catList.push({ id: cat.id, name: cat.name });
          if (cat.menuItems) {
            cat.menuItems.forEach((m: any) => {
              flatMenu.push(mapMenu({ ...m, category: { name: cat.name } }));
            });
          }
        });
      }
      setCategories(catList);
      setMenuItems(flatMenu);
      setCanteens(canteensData);
    } catch (err) {
      console.error('Failed to load staff data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (profile) {
      socketService.connect(profile.backendId, profile.canteenId);

      socketService.on('order:created', (order: any) => {
        setOrders(prev => {
          if (prev.find(o => o.id === order.id)) return prev;
          return [mapOrder(order), ...prev];
        });
      });

      socketService.on('order:status_updated', (order: any) => {
        setOrders(prev => prev.map(o => o.id === order.id ? mapOrder(order) : o));
      });

      socketService.on('order:cancelled', (order: any) => {
        setOrders(prev => prev.map(o => o.id === order.id ? mapOrder(order) : o));
      });

      socketService.on('canteen:order_taking_updated', (data: any) => {
        if (data.canteenId === profile.canteenId) {
          setIsAcceptingOrdersState(data.isAcceptingOrders);
        }
      });

      socketService.on('menu:availability_updated', (data: any) => {
        if (data.canteenId === profile.canteenId) {
          setMenuItems(prev => prev.map(m => m.id === data.menuItemId ? { ...m, availability: data.isAvailable ? 'AVAILABLE' : 'OUT_OF_STOCK' } : m));
        }
      });

      socketService.on('change_request:updated', (data: any) => {
        if (data.staffId === profile.backendId) {
          if (data.status === 'APPROVED' || data.status === 'REJECTED') {
            setProfile(prev => prev ? { ...prev, pendingCanteenRequest: null } : null);
          }
        }
      });

      socketService.on('staff:canteen_assignment_updated', (data: any) => {
        if (data.staffId === profile.backendId) {
          socketService.leaveCanteen(profile.canteenId);
          socketService.joinCanteen(data.assignedCanteenId);
          loadData(); // Reload everything
        }
      });
    }

    return () => {
      // Cleanup listeners is possible but we might reconnect often. Let's just disconnect on unmount
      // Actually we'll keep it simple for this exercise
    };
  }, [profile?.backendId, profile?.canteenId]);

  const refreshOrders = async () => {
    if (profile?.canteenId) {
      const ordersData = await staffService.getOrders(profile.canteenId);
      setOrders(ordersData.map(mapOrder));
    }
  };

  const updateOrderStatus = async (id: string, status: OrderStatus) => {
    if (!profile) return;
    await staffService.updateOrderStatus(id, profile.canteenId, status);
    await refreshOrders();
  };

  const updateMenuAvailability = async (id: string, availability: MenuAvailability) => {
    if (!profile) return;
    await staffService.updateMenuAvailability(id, profile.canteenId, availability === 'AVAILABLE');
    const menuData = await staffService.getMenu(profile.canteenId);
    let flatMenu: MenuItem[] = [];
    if (Array.isArray(menuData)) {
      menuData.forEach((cat: any) => {
        if (cat.menuItems) {
          cat.menuItems.forEach((m: any) => {
            flatMenu.push(mapMenu({ ...m, category: { name: cat.name } }));
          });
        }
      });
    }
    setMenuItems(flatMenu);
  };

  const addMenuItem = async (item: any) => {
    if (!profile) return;
    // Assume item has name, price, categoryId, etc.
    await staffService.createMenuItem(profile.canteenId, item);
    // Reload menu
    loadData();
  };

  const updateMenuItem = async (item: any) => {
    if (!profile) return;
    await staffService.updateMenuItem(item.id, profile.canteenId, item);
    loadData();
  };

  const markNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const requestCanteenChange = async (newCanteenId: string, reason: string) => {
    if (!profile) return;
    await staffService.createChangeRequest(newCanteenId, reason);
    setProfile(prev => prev ? { ...prev, pendingCanteenRequest: newCanteenId } : null);
  };

  const setIsAcceptingOrders = async (val: boolean) => {
    if (!profile) return;
    await staffService.updateOrderTakingStatus(profile.canteenId, val);
    setIsAcceptingOrdersState(val);
  };

  return (
    <AppContext.Provider value={{
      orders, updateOrderStatus,
      menuItems, updateMenuAvailability, addMenuItem, updateMenuItem,
      notifications, markNotificationRead, markAllNotificationsRead,
      isAcceptingOrders, setIsAcceptingOrders,
      profile, requestCanteenChange,
      isLoading, canteens, categories, refreshOrders
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
