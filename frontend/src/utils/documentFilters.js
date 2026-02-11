// Utility functions for filtering documents based on user mode

import { isPersonalMode } from './modeUtils';

/**
 * Filter documents based on current mode (personal vs organization)
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
