import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:8001/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add token to requests automatically
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getCurrentUser: () => api.get('/auth/me'),
  verifyToken: () => api.get('/auth/verify'),
};

// Documents API
export const documentsAPI = {
  upload: (file, onProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    
    return api.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(percentCompleted);
        }
      },
    });
  },
  
  list: (params) => api.get('/documents', { params }),
  
  get: (documentId) => api.get(`/documents/${documentId}`),
  
  getContent: (documentId) => api.get(`/documents/${documentId}/content`),
  
  delete: (documentId) => api.delete(`/documents/${documentId}`),
  
  reindex: () => api.post('/documents/reindex'),
};

// Search API
export const searchAPI = {
  search: (query, options = {}) => {
    return api.post('/search', {
      query,
      min_score: options.min_score || 0.1,
      limit: options.limit || 20,
    });
  },
};

export default api;