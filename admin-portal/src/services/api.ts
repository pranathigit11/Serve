const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';

// Temporary dev ID for Admin actions
export const DEV_ADMIN_ID = '95bc36ad-e893-4e85-abcd-aa905c7fbfbb';

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

// ---------------------------
// ADMIN SUMMARY & ACTIONS
// ---------------------------
export const adminService = {
  getSummary: () => fetchAPI('/admin/summary'),
  getPendingActions: () => fetchAPI('/admin/pending-actions'),

  // ---------------------------
  // CANTEENS
  // ---------------------------
  getCanteens: () => fetchAPI('/admin/canteens'),
  createCanteen: (data: any) => fetchAPI('/admin/canteens', { method: 'POST', body: JSON.stringify(data) }),
  updateCanteen: (id: string, data: any) => fetchAPI(`/admin/canteens/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  activateCanteen: (id: string) => fetchAPI(`/admin/canteens/${id}/activate`, { method: 'PATCH' }),
  deactivateCanteen: (id: string) => fetchAPI(`/admin/canteens/${id}/deactivate`, { method: 'PATCH' }),
  
  getCanteenHostels: (id: string) => fetchAPI(`/admin/canteens/${id}/hostels`),
  updateCanteenHostels: (id: string, hostelIds: string[]) => fetchAPI(`/admin/canteens/${id}/hostels`, { method: 'PUT', body: JSON.stringify({ hostelIds }) }),

  // ---------------------------
  // STAFF
  // ---------------------------
  getStaff: () => fetchAPI('/admin/staff'),
  getStaffById: (id: string) => fetchAPI(`/admin/staff/${id}`),
  createStaff: (data: any) => fetchAPI('/admin/staff', { method: 'POST', body: JSON.stringify(data) }),
  updateStaff: (id: string, data: any) => fetchAPI(`/admin/staff/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  activateStaff: (id: string) => fetchAPI(`/admin/staff/${id}/activate`, { method: 'PATCH' }),
  deactivateStaff: (id: string) => fetchAPI(`/admin/staff/${id}/deactivate`, { method: 'PATCH' }),
  changeStaffCanteen: (id: string, canteenId: string) => fetchAPI(`/admin/staff/${id}/canteen`, { method: 'PATCH', body: JSON.stringify({ canteenId }) }),

  // ---------------------------
  // CHANGE REQUESTS
  // ---------------------------
  getChangeRequests: (status?: string) => fetchAPI(`/admin/canteen-change-requests${status ? `?status=${status}` : ''}`),
  approveChangeRequest: (id: string) => fetchAPI(`/admin/canteen-change-requests/${id}/approve`, { method: 'PATCH', body: JSON.stringify({ adminId: DEV_ADMIN_ID }) }),
  rejectChangeRequest: (id: string, reason: string) => fetchAPI(`/admin/canteen-change-requests/${id}/reject`, { method: 'PATCH', body: JSON.stringify({ adminId: DEV_ADMIN_ID, reason }) }),
};

// ---------------------------
// HOSTELS (Global context)
// ---------------------------
export const hostelService = {
  getHostels: () => fetchAPI('/hostels'),
};
