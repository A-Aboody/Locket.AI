import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:8001/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 second timeout for longer operations
});

// Request interceptor - Add token to requests automatically
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add content type for non-form-data requests
    if (!config.headers['Content-Type'] && !(config.data instanceof FormData)) {
      config.headers['Content-Type'] = 'application/json';
    }
    
    return config;
  },
  (error) => {
    console.error('[API] Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor - Handle token expiration and verification
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('[API] Response error:', error.response?.status, error.response?.data);
    
    if (error.response?.status === 401) {
      // Token expired or invalid
      console.log('[API] Token invalid, redirecting to auth');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('refresh_token');
      
      // Only redirect if not already on auth page
      if (!window.location.pathname.includes('/auth')) {
        window.location.href = '/auth';
      }
    } else if (error.response?.status === 403) {
      // Check if it's an email verification error
      const errorDetail = error.response?.data?.detail;
      if (errorDetail && (
        errorDetail.includes('verification') || 
        errorDetail.includes('verified') ||
        errorDetail.includes('email verification')
      )) {
        console.log('[API] Email verification required, redirecting to auth');
        // Redirect to auth page for verification
        window.location.href = '/auth';
        return;
      }
      
      // Regular forbidden access
      console.warn('[API] Access forbidden:', errorDetail);
    } else if (error.code === 'NETWORK_ERROR' || error.code === 'ECONNREFUSED') {
      console.error('[API] Network error - backend may be down');
      // You could show a notification here that the backend is unavailable
    }
    
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  // Login with email/username and password
  login: (credentials) => api.post('/auth/login', credentials),
  
  // Register new user
  register: (userData) => api.post('/auth/register', userData),
  
  // Verify email with code
  verifyEmail: (verificationData) => api.post('/auth/verify-email', verificationData),
  
  // Forgot password - request reset
  forgotPassword: (emailData) => api.post('/auth/forgot-password', emailData),
  
  // Reset password with token
  resetPassword: (resetData) => api.post('/auth/reset-password', resetData),
  
  // Change password (authenticated)
  changePassword: (passwordData) => api.post('/auth/change-password', passwordData),
  
  // Resend verification code
  resendVerification: () => api.post('/auth/resend-verification'),
  
  // Refresh access token
  refreshToken: (refreshToken) => api.post('/auth/refresh', { refresh_token: refreshToken }),
  
  // Get current user info
  getCurrentUser: () => api.get('/auth/me'),
  
  // Verify token validity
  verifyToken: () => api.get('/auth/verify'),
  
  // Logout (client-side only)
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('refresh_token');
    return Promise.resolve();
  }
};

// Documents API
export const documentsAPI = {
  // Upload document with progress tracking
  upload: (formData, onProgress) => {
    return api.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 120000, // 2 minutes for large uploads
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
  
  // List documents with optional filters
  list: (params = {}) => api.get('/documents', { params }),
  
  // Get only user's documents
  listMyDocuments: (params = {}) => api.get('/documents', { 
    params: { ...params, user_only: true } 
  }),
  
  // Get document metadata
  get: (documentId) => api.get(`/documents/${documentId}`),
  
  // Get document content
  getContent: (documentId) => api.get(`/documents/${documentId}/content`),
  
  // Generate file download URL
  getFileUrl: (documentId) => {
    const token = localStorage.getItem('token');
    return `${API_BASE_URL}/documents/${documentId}/download?token=${token}`;
  },
  
  // Download file as blob
  downloadFile: (documentId) => {
    return api.get(`/documents/${documentId}/download`, {
      responseType: 'blob',
      timeout: 60000, // 1 minute for downloads
    });
  },
  
  // Delete document
  delete: (documentId) => api.delete(`/documents/${documentId}`),
  
  // Reindex all documents (admin only)
  reindex: () => api.post('/documents/reindex'),
  
  // Update document visibility
  updateVisibility: (documentId, visibilityData) => 
    api.put(`/documents/${documentId}/visibility`, visibilityData),
  
  // Get document statistics
  getStats: (userId) => api.get(`/users/${userId}/stats`),
};

// Search API
export const searchAPI = {
  // Search documents with AI
  search: (query, options = {}) => {
    return api.post('/search', {
      query,
      min_score: options.min_score || 0.1,
      limit: options.limit || 20,
    });
  },
  
  // Advanced search with filters
  advancedSearch: (searchData) => api.post('/search/advanced', searchData),
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
  addMember: (groupId, userId) => api.post(`/user-groups/${groupId}/members`, { user_id: userId }),
  removeMember: (groupId, userId) => api.delete(`/user-groups/${groupId}/members/${userId}`),
  listMembers: (groupId) => api.get(`/user-groups/${groupId}/members`),
  
  // Current user actions
  leaveGroup: (groupId) => {
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    return api.delete(`/user-groups/${groupId}/members/${currentUser.id}`);
  },
  
  // Group documents
  getGroupDocuments: (groupId, params = {}) => 
    api.get(`/user-groups/${groupId}/documents`, { params }),
  
  // Statistics
  getGroupStats: (groupId) => api.get(`/user-groups/${groupId}/stats`),
  
  // Transfer ownership
  transferOwnership: (groupId, newOwnerId) => 
    api.post(`/user-groups/${groupId}/transfer`, { new_owner_id: newOwnerId }),
};

// Users API for search and management
export const usersAPI = {
  // Search users
  search: (query, params = {}) => api.get('/users/search', { params: { query, ...params } }),
  
  // List users (admin only)
  list: (params = {}) => api.get('/users', { params }),
  
  // Get user by ID
  get: (userId) => api.get(`/users/${userId}`),
  
  // Update user (admin only)
  update: (userId, updateData) => api.put(`/users/${userId}`, updateData),
  
  // Deactivate user (admin only)
  deactivate: (userId) => api.post(`/users/${userId}/deactivate`),
  
  // Activate user (admin only)
  activate: (userId) => api.post(`/users/${userId}/activate`),
  
  // Get user statistics
  getStats: (userId) => api.get(`/users/${userId}/stats`),
};

// Admin API (admin only operations)
export const adminAPI = {
  // System management
  cleanupTokens: () => api.post('/auth/cleanup-tokens'),
  systemStats: () => api.get('/admin/stats'),
  userManagement: {
    list: (params = {}) => api.get('/admin/users', { params }),
    bulkAction: (actionData) => api.post('/admin/users/bulk', actionData),
  },
};

// Utility functions for API
export const apiUtils = {
  // Helper to format file upload data
  prepareUploadData: (file, visibility = 'private', userGroupId = null) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('visibility', visibility);
    
    if (visibility === 'group' && userGroupId) {
      formData.append('user_group_id', userGroupId.toString());
    }
    
    return formData;
  },
  
  // Helper to create group data
  prepareGroupData: (name, description = '', memberIds = []) => {
    return {
      name: name.trim(),
      description: description.trim(),
      member_ids: memberIds
    };
  },
  
  // Helper to handle API errors with user-friendly messages
  handleError: (error, defaultMessage = 'An error occurred') => {
    console.error('[API Error]', error);
    
    if (error.response?.data?.detail) {
      return error.response.data.detail;
    }
    
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    
    if (error.response?.data?.errors) {
      // Handle validation errors
      const errors = error.response.data.errors;
      if (Array.isArray(errors)) {
        return errors.map(err => err.msg || err.message).join(', ');
      }
      return JSON.stringify(errors);
    }
    
    if (error.message) {
      // Handle network errors
      if (error.message.includes('Network Error') || error.code === 'NETWORK_ERROR') {
        return 'Unable to connect to the server. Please check your connection and try again.';
      }
      
      if (error.message.includes('timeout')) {
        return 'Request timed out. Please try again.';
      }
      
      return error.message;
    }
    
    return defaultMessage;
  },
  
  // Helper to check if user can perform action
  canPerformAction: (resource, action, currentUser) => {
    if (!currentUser) return false;
    
    // Admin can do everything
    if (currentUser.role === 'admin') return true;
    
    // Check if user email is verified for critical actions
    const criticalActions = ['upload', 'create_group', 'delete_document', 'update_visibility'];
    if (criticalActions.includes(action) && !currentUser.email_verified) {
      return false;
    }
    
    switch (action) {
      case 'delete_document':
        return resource.uploaded_by_id === currentUser.id;
      
      case 'edit_document':
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
      
      case 'transfer_ownership':
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
    
    // Add group option only if user has groups
    if (userGroups.length > 0) {
      options.push({
        value: 'group',
        label: 'Group',
        description: 'Only group members can see this document',
        color: 'accent',
      });
    }
    
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
        return 'red.500';
      case 'doc':
      case 'docx':
        return 'blue.500';
      case 'txt':
        return 'gray.500';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return 'green.500';
      default:
        return 'gray.500';
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
  },
  
  // Helper to get relative time (e.g., "2 hours ago")
  getRelativeTime: (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return this.formatDate(dateString);
  },
  
  // Check if user is authenticated and verified
  isAuthenticated: () => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (!token || !user) return false;
    
    try {
      const userData = JSON.parse(user);
      return userData.email_verified === true;
    } catch {
      return false;
    }
  },
  
  // Get current user data safely
  getCurrentUser: () => {
    try {
      const user = localStorage.getItem('user');
      return user ? JSON.parse(user) : null;
    } catch {
      return null;
    }
  },
  
  // Check if user is admin
  isAdmin: () => {
    const user = apiUtils.getCurrentUser();
    return user && user.role === 'admin';
  },
};

// Token management utilities
export const tokenUtils = {
  // Store tokens after login
  storeTokens: (accessToken, refreshToken = null) => {
    localStorage.setItem('token', accessToken);
    if (refreshToken) {
      localStorage.setItem('refresh_token', refreshToken);
    }
  },
  
  // Clear all tokens
  clearTokens: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  },
  
  // Get stored tokens
  getTokens: () => {
    return {
      accessToken: localStorage.getItem('token'),
      refreshToken: localStorage.getItem('refresh_token'),
    };
  },
  
  // Check if token is likely expired (basic check)
  isTokenExpired: (token) => {
    if (!token) return true;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload.exp * 1000; // Convert to milliseconds
      return Date.now() >= exp;
    } catch {
      return true;
    }
  },
};

// Export the base api instance for custom requests
export default api;