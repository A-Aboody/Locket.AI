// Utility functions for managing user mode (personal vs organization)

const MODE_STORAGE_KEY = 'user_mode_preference';

export const MODES = {
  PERSONAL: 'personal',
  ORGANIZATION: 'organization',
};

/**
 * Get the current user's mode preference
 * @returns {string} 'personal' or 'organization'
 */
export const getUserMode = () => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    // If user is not in an organization, they can only use personal mode
    if (!user.organization_id) {
      return MODES.PERSONAL;
    }

    // If user is in an organization, check their preference
    const savedMode = localStorage.getItem(MODE_STORAGE_KEY);
    return savedMode === MODES.ORGANIZATION ? MODES.ORGANIZATION : MODES.PERSONAL;
  } catch (error) {
    console.error('Error getting user mode:', error);
    return MODES.PERSONAL;
  }
};

/**
 * Set the user's mode preference
 * @param {string} mode - 'personal' or 'organization'
 */
export const setUserMode = (mode) => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    // Only allow organization mode if user is in an organization
    if (mode === MODES.ORGANIZATION && !user.organization_id) {
      console.warn('Cannot set organization mode for users not in an organization');
      return;
    }

    localStorage.setItem(MODE_STORAGE_KEY, mode);

    // Dispatch custom event so components can react to mode changes
    window.dispatchEvent(new CustomEvent('modeChanged', { detail: { mode } }));
  } catch (error) {
    console.error('Error setting user mode:', error);
  }
};

/**
 * Check if the user is currently in personal mode
 * @returns {boolean}
 */
export const isPersonalMode = () => {
  return getUserMode() === MODES.PERSONAL;
};

/**
 * Check if the user is currently in organization mode
 * @returns {boolean}
 */
export const isOrganizationMode = () => {
  return getUserMode() === MODES.ORGANIZATION;
};

/**
 * Check if the user can switch modes (i.e., they're in an organization)
 * @returns {boolean}
 */
export const canSwitchModes = () => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return !!user.organization_id;
  } catch (error) {
    return false;
  }
};

/**
 * Get the user's organization name
 * @returns {string|null}
 */
export const getOrganizationName = () => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user.organization_name || null;
  } catch (error) {
    return null;
  }
};
