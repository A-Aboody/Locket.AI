//frontend/src/utils/api.js
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
  
  // List documents with optional filters (pass mode: 'personal' or 'organization')
  list: (params = {}) => api.get('/documents', { params }),
  
  // Get only user's documents (always returns ALL user uploads regardless of mode)
  listMyDocuments: (params = {}) => api.get('/documents', { 
    params: { ...params, user_only: true } 
  }),

  // Get recently viewed/interacted documents
  getRecentActivity: (params = {}) => api.get('/documents/recent-activity', { params }),

  // Record a document interaction (view, preview, download)
  recordActivity: (documentId, activityType = 'view') =>
    api.post(`/documents/${documentId}/activity`, null, { params: { activity_type: activityType } }),
  
  // Get document metadata
  get: (documentId) => api.get(`/documents/${documentId}`),
  
  // Get document content
  getContent: (documentId) => api.get(`/documents/${documentId}/content`),

  // Get AI-generated document summary
  getSummary: (documentId) => api.get(`/documents/${documentId}/summary`),

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
      headers: {
        'Cache-Control': 'no-cache'
      }
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
  
  // Search text within a specific document (client-side fallback, optional backend)
  searchText: (documentId, query, caseSensitive = false) => {
    return api.post('/search/text', null, {
      params: { 
        document_id: documentId, 
        query, 
        case_sensitive: caseSensitive 
      },
      timeout: 10000, // 10 second timeout for search
    });
  },
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
  
  // Search text within a document (alternative location)
  searchInDocument: (documentId, query, caseSensitive = false) => {
    return api.post('/search/text', null, {
      params: { 
        document_id: documentId, 
        query, 
        case_sensitive: caseSensitive 
      },
      timeout: 10000,
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

// Chats API
export const chatsAPI = {
  // Create a new chat
  create: (chatData = {}) => api.post('/chats', chatData),

  // List all chats for current user
  list: (params = {}) => api.get('/chats', { params }),

  // Get specific chat with all messages
  get: (chatId) => api.get(`/chats/${chatId}`),

  // Send a message in a chat
  sendMessage: (chatId, content) =>
    api.post(`/chats/${chatId}/messages`, { content }),

  // Update chat (title, archive status)
  update: (chatId, updateData) =>
    api.patch(`/chats/${chatId}`, updateData),

  // Delete a chat
  delete: (chatId) => api.delete(`/chats/${chatId}`),

  // Archive a chat
  archive: (chatId) =>
    api.patch(`/chats/${chatId}`, { is_archived: true }),

  // Unarchive a chat
  unarchive: (chatId) =>
    api.patch(`/chats/${chatId}`, { is_archived: false }),

  // Rename a chat
  rename: (chatId, title) =>
    api.patch(`/chats/${chatId}`, { title }),
};

// Organizations API
export const organizationsAPI = {
  // ===================================
  // Organization CRUD
  // ===================================

  // Create a new organization (user becomes admin)
  create: (orgData) => api.post('/organizations', orgData),

  // Get current user's organization with full details
  getMy: () => api.get('/organizations/my'),

  // Get organization details by ID (requires membership)
  get: (orgId) => api.get(`/organizations/${orgId}`),

  // Update organization settings (admin only)
  update: (orgId, updateData) => api.put(`/organizations/${orgId}`, updateData),

  // Delete organization (creator only)
  delete: (orgId) => api.delete(`/organizations/${orgId}`),

  // ===================================
  // Member Management
  // ===================================

  // List members of an organization (paginated)
  listMembers: (orgId, params = {}) => api.get(`/organizations/${orgId}/members`, { params }),

  // Update a member's role (promote/demote)
  updateMemberRole: (orgId, userId, role) =>
    api.put(`/organizations/${orgId}/members/${userId}/role`, { role }),

  // Remove a member from the organization (admin or self)
  removeMember: (orgId, userId) =>
    api.delete(`/organizations/${orgId}/members/${userId}`),

  // Leave the organization (members only, creator cannot leave)
  leave: (orgId) => api.post(`/organizations/${orgId}/leave`),

  // ===================================
  // Invitation System
  // ===================================

  // Generate a shareable invite code
  generateInviteCode: (orgId, options = {}) =>
    api.post(`/organizations/${orgId}/invites/generate-code`, options),

  // Send an email invitation (admin only)
  sendEmailInvite: (orgId, email) =>
    api.post(`/organizations/${orgId}/invites/email`, { email }),

  // Join organization via invite code
  joinViaCode: (inviteCode) =>
    api.post(`/organizations/join/${inviteCode}`),

  // List organization invites (admin only, paginated)
  listInvites: (orgId, activeOnly = true, params = {}) =>
    api.get(`/organizations/${orgId}/invites`, { params: { active_only: activeOnly, ...params } }),

  // Revoke an invite (admin only)
  revokeInvite: (orgId, inviteId) =>
    api.delete(`/organizations/${orgId}/invites/${inviteId}`),

  // Resend an email invite (admin only)
  resendInvite: (orgId, inviteId) =>
    api.post(`/organizations/${orgId}/invites/${inviteId}/resend`),

  // ===================================
  // Helper Functions
  // ===================================

  // Generate shareable invite link from invite code
  getInviteLink: (inviteCode) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/join/${inviteCode}`;
  },

  // Check if current user is organization admin
  isOrgAdmin: () => {
    const user = apiUtils.getCurrentUser();
    return user && user.org_role === 'admin';
  },

  // Check if current user is in an organization
  isInOrganization: () => {
    const user = apiUtils.getCurrentUser();
    return user && user.organization_id !== null;
  },

  // Get organization role display name
  getRoleDisplayName: (role) => {
    const roleNames = {
      'admin': 'Administrator',
      'member': 'Member'
    };
    return roleNames[role] || role;
  },
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
  prepareUploadData: (file, visibility = 'private', userGroupId = null, organizationId = null) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('visibility', visibility);

    if (visibility === 'group' && userGroupId) {
      formData.append('user_group_id', userGroupId.toString());
    }

    // Organization ID is auto-set by backend from user context
    // but we can optionally pass it explicitly
    if (visibility === 'organization' && organizationId) {
      formData.append('organization_id', organizationId.toString());
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
  getVisibilityOptions: (userGroups = [], currentUser = null) => {
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

    // Add organization option if user is in an organization
    if (currentUser?.organization_id) {
      options.push({
        value: 'organization',
        label: 'Organization',
        description: 'All organization members can see this document',
        color: 'blue',
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

    return apiUtils.formatDate(dateString);
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

  // ===================================
  // Organization Utility Helpers
  // ===================================

  // Prepare organization creation data
  prepareOrganizationData: (name, description = '') => {
    return {
      name: name.trim(),
      description: description.trim(),
    };
  },

  // Check if current user can perform organization action
  canPerformOrgAction: (action, currentUser, organization = null, targetMember = null) => {
    if (!currentUser) return false;

    // System admin can do everything
    if (currentUser.role === 'admin') return true;

    // Must be in an organization for most actions
    const isInOrg = currentUser.organization_id !== null;
    const isOrgAdmin = currentUser.org_role === 'admin';
    const isCreator = organization && organization.created_by_id === currentUser.id;

    switch (action) {
      case 'create_organization':
        // Must not be in an organization
        return !isInOrg && currentUser.email_verified;

      case 'join_organization':
        // Must not be in an organization
        return !isInOrg && currentUser.email_verified;

      case 'leave_organization':
        // Members can leave, but creator cannot
        return isInOrg && !isCreator;

      case 'delete_organization':
        // Only creator can delete
        return isCreator;

      case 'update_organization':
        // Only admins can update settings
        return isInOrg && isOrgAdmin;

      case 'invite_members':
        // Admins always can, members if settings allow
        if (isOrgAdmin) return true;
        return isInOrg && organization?.settings?.allow_member_invites === true;

      case 'promote_member':
      case 'demote_member':
        // Only admins can change roles
        if (!isOrgAdmin) return false;
        // Cannot demote creator
        if (targetMember && organization && targetMember.user_id === organization.created_by_id) {
          return false;
        }
        return true;

      case 'remove_member':
        // Admins can remove anyone except creator
        if (isOrgAdmin) {
          if (targetMember && organization && targetMember.user_id === organization.created_by_id) {
            return false;
          }
          return true;
        }
        // Members can only remove themselves
        return targetMember && targetMember.user_id === currentUser.id;

      case 'view_invites':
      case 'revoke_invite':
        // Only admins can manage invites
        return isOrgAdmin;

      case 'view_members':
        // All org members can view
        return isInOrg;

      default:
        return false;
    }
  },

  // Get organization badge color based on role
  getOrgRoleBadgeColor: (role) => {
    const colors = {
      'admin': 'purple',
      'member': 'blue',
    };
    return colors[role] || 'gray';
  },

  // Validate organization name
  validateOrgName: (name) => {
    if (!name || name.trim().length === 0) {
      return { valid: false, error: 'Organization name is required' };
    }
    if (name.trim().length < 3) {
      return { valid: false, error: 'Organization name must be at least 3 characters' };
    }
    if (name.length > 100) {
      return { valid: false, error: 'Organization name must be less than 100 characters' };
    }
    return { valid: true };
  },

  // Validate invite code format
  validateInviteCode: (code) => {
    if (!code || code.trim().length === 0) {
      return { valid: false, error: 'Invite code is required' };
    }
    // Invite codes should be alphanumeric and of reasonable length
    const cleaned = code.trim();
    if (cleaned.length < 8 || cleaned.length > 32) {
      return { valid: false, error: 'Invalid invite code format' };
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(cleaned)) {
      return { valid: false, error: 'Invite code can only contain letters, numbers, hyphens, and underscores' };
    }
    return { valid: true, code: cleaned };
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