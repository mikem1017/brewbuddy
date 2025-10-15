import axios from 'axios';

// Create axios instance
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auth disabled - no token needed
api.interceptors.request.use((config) => {
  // Authentication disabled for open access
  return config;
});

// Handle errors - auth disabled
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // No redirect on 401 - auth disabled
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  login: (username, password) =>
    api.post('/auth/login', new URLSearchParams({ username, password }), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }),
  register: (data) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
};

// Fermenter APIs
export const fermenterAPI = {
  list: () => api.get('/fermenters'),
  get: (id) => api.get(`/fermenters/${id}`),
  create: (data) => api.post('/fermenters', data),
  update: (id, data) => api.put(`/fermenters/${id}`, data),
  delete: (id) => api.delete(`/fermenters/${id}`),
};

// Profile APIs
export const profileAPI = {
  list: () => api.get('/profiles'),
  get: (id) => api.get(`/profiles/${id}`),
  create: (data) => api.post('/profiles', data),
  update: (id, data) => api.put(`/profiles/${id}`, data),
  delete: (id) => api.delete(`/profiles/${id}`),
  addPhase: (profileId, data) => api.post(`/profiles/${profileId}/phases`, data),
  deletePhase: (profileId, phaseId) => api.delete(`/profiles/${profileId}/phases/${phaseId}`),
};

// Batch APIs
export const batchAPI = {
  list: (status) => api.get('/batches', { params: { status } }),
  get: (id) => api.get(`/batches/${id}`),
  create: (data) => api.post('/batches', data),
  update: (id, data) => api.put(`/batches/${id}`, data),
  delete: (id) => api.delete(`/batches/${id}`),
  start: (id) => api.post(`/batches/${id}/start`),
  stop: (id) => api.post(`/batches/${id}/stop`),
  clone: (id, fermenterId) => api.post(`/batches/${id}/clone`, null, { params: { fermenter_id: fermenterId } }),
  getLogs: (id, params) => api.get(`/batches/${id}/logs`, { params }),
};

// Dashboard APIs
export const dashboardAPI = {
  get: () => api.get('/dashboard'),
};

// Settings APIs
export const settingsAPI = {
  getAll: () => api.get('/settings'),
  get: (key) => api.get(`/settings/${key}`),
  update: (key, value) => api.put(`/settings/${key}`, value, {
    headers: { 'Content-Type': 'text/plain' },
  }),
  updateBulk: (settings) => api.post('/settings/bulk', settings),
};

// System APIs
export const systemAPI = {
  health: () => api.get('/system/health'),
  sensors: () => api.get('/system/sensors'),
  manualControlHeater: (fermenterId, state) => 
    api.post(`/system/manual-control/${fermenterId}/heater/${state}`),
  manualControlChiller: (fermenterId, state) => 
    api.post(`/system/manual-control/${fermenterId}/chiller/${state}`),
};

// Alert APIs
export const alertAPI = {
  listRules: () => api.get('/alerts/rules'),
  createRule: (data) => api.post('/alerts/rules', data),
  updateRule: (id, data) => api.put(`/alerts/rules/${id}`, data),
  deleteRule: (id) => api.delete(`/alerts/rules/${id}`),
  listHistory: (limit) => api.get('/alerts/history', { params: { limit } }),
  acknowledgeAlert: (id) => api.post(`/alerts/history/${id}/acknowledge`),
};

// Extra APIs
export const extraAPI = {
  // Gravity readings
  addGravityReading: (batchId, data) => api.post(`/batches/${batchId}/gravity`, data),
  getGravityReadings: (batchId) => api.get(`/batches/${batchId}/gravity`),
  
  // Journal
  addJournalEntry: (batchId, data) => api.post(`/batches/${batchId}/journal`, data),
  getJournalEntries: (batchId) => api.get(`/batches/${batchId}/journal`),
  
  // Brew session
  createBrewSession: (batchId, data) => api.post(`/batches/${batchId}/brew-session`, data),
  getBrewSession: (batchId) => api.get(`/batches/${batchId}/brew-session`),
  
  // Maintenance
  createMaintenance: (fermenterId, data) => api.post(`/fermenters/${fermenterId}/maintenance`, data),
  getMaintenance: (fermenterId) => api.get(`/fermenters/${fermenterId}/maintenance`),
  
  // Export
  exportBatchCSV: (batchId) => api.get(`/export/batch/${batchId}/csv`, { responseType: 'blob' }),
  
  // Webhooks
  listWebhooks: () => api.get('/webhooks'),
  createWebhook: (data) => api.post('/webhooks', data),
  deleteWebhook: (id) => api.delete(`/webhooks/${id}`),
};

export default api;

