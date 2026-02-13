// Utility functions for filtering documents based on user mode
//
// NOTE: Mode-aware filtering is now primarily handled by the backend via the
// `mode` query parameter on GET /api/documents. These client-side utilities
// are kept for edge cases (e.g., search results filtering) but should NOT be
// used for the main document list or My Uploads — those are handled server-side.

import { isPersonalMode, getUserMode } from './modeUtils';

/**
 * Get the current mode string for API calls
 * @returns {string} 'personal' or 'organization'
 */
export const getCurrentMode = () => {
  return getUserMode();
};

/**
 * Filter documents based on current mode (personal vs organization)
 * Used for search results and other client-side filtering needs.
 *
 * @param {Array} documents - Array of documents to filter
 * @param {number} currentUserId - Current user's ID
 * @returns {Array} - Filtered documents
 */
export const filterDocumentsByMode = (documents, currentUserId) => {
  if (!documents || !Array.isArray(documents)) {
    return [];
  }

  // In personal mode, only show user's private documents
  if (isPersonalMode()) {
    return documents.filter(doc =>
      doc.visibility === 'private' && doc.uploaded_by_id === currentUserId
    );
  }

  // In organization mode, show all accessible documents
  // (backend already filters by organization, so show everything returned)
  return documents;
};

/**
 * Check if a document should be visible in current mode
 *
 * @param {Object} document - Document to check
 * @param {number} currentUserId - Current user's ID
 * @returns {boolean} - True if document should be visible
 */
export const isDocumentVisibleInMode = (document, currentUserId) => {
  if (!document) {
    return false;
  }

  // In personal mode, only show user's private documents
  if (isPersonalMode()) {
    return document.visibility === 'private' && document.uploaded_by_id === currentUserId;
  }

  // In organization mode, all documents returned by backend are visible
  return true;
};
