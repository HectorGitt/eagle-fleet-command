import axios from 'axios';

/**
 * Axios instance configured for EagleSight API endpoints
 * Base URL points to demo/mock API - replace with production endpoint when ready
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth tokens
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('auth_token');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

/**
 * API endpoints for EagleSight
 * Currently returns demo data - integrate with real endpoints as needed
 */
export const tractorAPI = {
  getAll: () => api.get('/tractors'),
  getById: (id: string) => api.get(`/tractors/${id}`),
  getTelemetry: (id: string) => api.get(`/tractors/${id}/telemetry`),
  updateStatus: (id: string, status: string) => api.patch(`/tractors/${id}/status`, { status }),
};

export const maintenanceAPI = {
  getSchedule: () => api.get('/maintenance/schedule'),
  getPredictions: () => api.get('/maintenance/predictions'),
  createWorkOrder: (data: any) => api.post('/maintenance/work-orders', data),
};

export const analyticsAPI = {
  getFuelData: (period: string) => api.get(`/analytics/fuel?period=${period}`),
  getUtilization: () => api.get('/analytics/utilization'),
  getAlerts: () => api.get('/analytics/alerts'),
};

export default api;
