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

// Add response interceptor to handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/auth';
    }
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
  upload: (formData, onProgress) => {
    return api.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(percentCompleted);
        }
      },
    });
  },
  
  list: (params = {}) => api.get('/documents', { params }),
  
  // Add new method to get only user's documents
  listMyDocuments: (params = {}) => api.get('/documents', { 
    params: { ...params, user_only: true } 
  }),
  
  get: (documentId) => api.get(`/documents/${documentId}`),
  
  getContent: (documentId) => api.get(`/documents/${documentId}/content`),
  
  getFileUrl: (documentId) => {
    const token = localStorage.getItem('token');
    return `${API_BASE_URL}/documents/${documentId}/download?token=${token}`;
  },
  
  downloadFile: (documentId) => {
    return api.get(`/documents/${documentId}/download`, {
      responseType: 'blob',
    });
  },
  
  delete: (documentId) => api.delete(`/documents/${documentId}`),
  
  reindex: () => api.post('/documents/reindex'),
  
  updateVisibility: (documentId, visibilityData) => 
    api.put(`/documents/${documentId}/visibility`, visibilityData),
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

// User Groups API
export const userGroupsAPI = {
  // Group management
  create: (groupData) => api.post('/user-groups', groupData),
  
  list: () => api.get('/user-groups'),
  
  get: (groupId) => api.get(`/user-groups/${groupId}`),
  
  update: (groupId, updateData) => api.put(`/user-groups/${groupId}`, updateData),
  
  delete: (groupId) => api.delete(`/user-groups/${groupId}`),
  
  // Member management
  addMember: (groupId, userId) => api.post(`/user-groups/${groupId}/members/${userId}`),
  
  removeMember: (groupId, userId) => api.delete(`/user-groups/${groupId}/members/${userId}`),
  
  leaveGroup: (groupId) => {
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    return api.delete(`/user-groups/${groupId}/members/${currentUser.id}`);
  },
  
  // Group documents
  getGroupDocuments: (groupId, params = {}) => 
    api.get(`/user-groups/${groupId}/documents`, { params }),
  
  // Statistics
  getGroupStats: (groupId) => api.get(`/user-groups/${groupId}/stats`),
};

// Users API for search and management
export const usersAPI = {
  search: (query) => api.get('/users/search', { params: { query } }),
  
  list: (params = {}) => api.get('/users', { params }),
  
  get: (userId) => api.get(`/users/${userId}`),
};

// Utility functions for API
export const apiUtils = {
  // Helper to format file upload data
  prepareUploadData: (file, visibility = 'private', userGroupId = null) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('visibility', visibility);
    
    if (visibility === 'group' && userGroupId) {
      formData.append('user_group_id', userGroupId);
    }
    
    return formData;
  },
  
  // Helper to create group data
  prepareGroupData: (name, description = '', memberIds = []) => {
    return {
      name,
      description,
      member_ids: memberIds
    };
  },
  
  // Helper to handle API errors
  handleError: (error, defaultMessage = 'An error occurred') => {
    if (error.response?.data?.detail) {
      return error.response.data.detail;
    }
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    if (error.message) {
      return error.message;
    }
    return defaultMessage;
  },
  
  // Helper to check if user can perform action
  canPerformAction: (resource, action, currentUser) => {
    if (!currentUser) return false;
    
    // Admin can do everything
    if (currentUser.role === 'admin') return true;
    
    switch (action) {
      case 'delete_document':
        return resource.uploaded_by_id === currentUser.id;
      
      case 'edit_group':
        return resource.created_by_id === currentUser.id;
      
      case 'delete_group':
        return resource.created_by_id === currentUser.id;
      
      case 'add_member':
        // Any group member can add members
        return resource.members?.some(member => member.user_id === currentUser.id) || 
               resource.created_by_id === currentUser.id;
      
      case 'remove_member':
        // Only creator can remove other members, anyone can remove themselves
        return resource.created_by_id === currentUser.id;
      
      default:
        return false;
    }
  },
  
  // Helper to get visibility options
  getVisibilityOptions: (userGroups = []) => {
    const options = [
      {
        value: 'private',
        label: 'Private',
        description: 'Only you can see this document',
        color: 'gray'
      },
      {
        value: 'public',
        label: 'Public',
        description: 'All users can see this document',
        color: 'green'
      }
    ];
    
    options.push({
      value: 'group',
      label: 'Group',
      description: userGroups.length > 0 
        ? 'Only group members can see this document' 
        : 'Create a group first to use this option',
      color: 'accent',
      disabled: userGroups.length === 0
    });
    
    return options;
  },
  
  // Helper to format file size
  formatFileSize: (bytes) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },
  
  // Helper to get file type color
  getFileTypeColor: (filename) => {
    const extension = filename.split('.').pop().toLowerCase();
    
    switch (extension) {
      case 'pdf':
        return 'red';
      case 'doc':
      case 'docx':
        return 'blue';
      case 'txt':
        return 'gray';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return 'green';
      default:
        return 'gray';
    }
  },
  
  // Helper to format date
  formatDate: (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
};

// Export the base api instance for custom requests
export default api;