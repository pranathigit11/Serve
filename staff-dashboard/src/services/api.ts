const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';

export const DEV_STAFF_ID = 'd0860944-53db-4ab5-84eb-a785c977623c';

async function fetchAPI(endpoint: string, options?: RequestInit) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options?.headers || {}),
  };

  const response = await fetch(url, { ...options, headers });
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || 'An error occurred while fetching data');
  }
  
  return data.data;
}

export const staffService = {
  // Profile
  getProfile: () => fetchAPI(`/staff/${DEV_STAFF_ID}`),
  
  // Orders
  getOrders: (canteenId: string, status?: string) => fetchAPI(`/orders/canteen/${canteenId}${status && status !== 'ALL' ? `?status=${status}` : ''}`),
  updateOrderStatus: (orderId: string, canteenId: string, status: string) => fetchAPI(`/orders/${orderId}/status`, { 
    method: 'PATCH', 
    body: JSON.stringify({ canteenId, status }) 
  }),

  // Canteen Control
  updateOrderTakingStatus: (canteenId: string, isAcceptingOrders: boolean) => fetchAPI(`/canteens/${canteenId}/order-taking`, {
    method: 'PATCH',
    body: JSON.stringify({ isAcceptingOrders })
  }),

  // Menu
  getMenu: (canteenId: string) => fetchAPI(`/menu/canteen/${canteenId}`),
  createMenuItem: (canteenId: string, data: any) => fetchAPI(`/menu/canteen/${canteenId}`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateMenuItem: (menuItemId: string, canteenId: string, data: any) => fetchAPI(`/menu/${menuItemId}`, {
    method: 'PATCH',
    body: JSON.stringify({ canteenId, ...data })
  }),
  updateMenuAvailability: (menuItemId: string, canteenId: string, isAvailable: boolean) => fetchAPI(`/menu/${menuItemId}/availability`, {
    method: 'PATCH',
    body: JSON.stringify({ canteenId, isAvailable })
  }),

  // Change Requests
  getChangeRequests: () => fetchAPI(`/staff/${DEV_STAFF_ID}/canteen-change-requests`),
  createChangeRequest: (requestedCanteenId: string, reason: string) => fetchAPI(`/staff/${DEV_STAFF_ID}/canteen-change-requests`, {
    method: 'POST',
    body: JSON.stringify({ requestedCanteenId, reason })
  }),

  // Global Canteens
  getAllCanteens: () => fetchAPI(`/canteens`),
};
