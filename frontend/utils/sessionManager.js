/**
 * Session Manager - Handles session data export and cleanup
 * Pre-Phase 2: Uses localStorage with manual export on logout
 */

// Session storage keys
export const SESSION_KEYS = {
  ALERTS: 'liveMonitorAlerts',
  QUEUE: 'processingQueue',
  SESSION_ID: 'sessionId',
  USER_PROFILE: 'userProfile',
  USER_PASSWORD: 'userPassword',
  SESSION_SETTINGS: 'sessionSettings',
  NOTIFICATION_THRESHOLDS: 'notificationThresholds',
  EMAIL_NOTIFICATIONS: 'emailNotifications',
  SMS_ALERTS: 'smsAlerts',
};

// Default values
export const DEFAULTS = {
  PROFILE: {
    name: 'Officer James',
    email: 'james@sentinelai.net',
  },
  SESSION: {
    timeout: '30', // minutes
    concurrent: false,
  },
  NOTIFICATION_THRESHOLDS: {
    high: 90,
    medium: 60,
  },
  EMAIL_NOTIFICATIONS: {
    enabled: true,
    address: 'alerts@sentinelai.net',
    onHigh: true,
    onMedium: false,
  },
  SMS_ALERTS: {
    enabled: false,
    phone: '',
  },
};

/**
 * Generate a unique session ID based on current timestamp
 */
export const generateSessionId = () => {
  const now = new Date();
  return now.toISOString().replace(/[:.]/g, '-').substring(0, 19);
};

/**
 * Get or create session ID
 */
export const getSessionId = () => {
  let sessionId = localStorage.getItem(SESSION_KEYS.SESSION_ID);
  if (!sessionId) {
    sessionId = generateSessionId();
    localStorage.setItem(SESSION_KEYS.SESSION_ID, sessionId);
  }
  return sessionId;
};

/**
 * Collect all session data
 */
export const collectSessionData = () => {
  const alerts = JSON.parse(localStorage.getItem(SESSION_KEYS.ALERTS) || '[]');
  const queue = JSON.parse(localStorage.getItem(SESSION_KEYS.QUEUE) || '[]');
  const sessionId = getSessionId();
  
  return {
    sessionId,
    exportedAt: new Date().toISOString(),
    alerts,
    processingQueue: queue,
    summary: {
      totalAlerts: alerts.length,
      totalQueueItems: queue.length,
      activeAlerts: alerts.filter(a => !a.dismissed).length,
      completedItems: queue.filter(q => q.stage === 'COMPLETE').length,
    }
  };
};

/**
 * Export session data as downloadable JSON file
 */
export const exportSessionData = () => {
  const sessionData = collectSessionData();
  const sessionId = sessionData.sessionId;
  
  // Create formatted filename with date
  const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const filename = `SentinelAI_Session_${dateStr}_${sessionId.replace(/:/g, '-')}.json`;
  
  // Create JSON blob
  const blob = new Blob([JSON.stringify(sessionData, null, 2)], { 
    type: 'application/json' 
  });
  
  // Create download link
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  
  // Trigger download
  document.body.appendChild(link);
  link.click();
  
  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  
  console.log('Session data exported:', filename);
  return filename;
};

/**
 * Clear all session data
 */
export const clearSessionData = () => {
  localStorage.removeItem(SESSION_KEYS.ALERTS);
  localStorage.removeItem(SESSION_KEYS.QUEUE);
  localStorage.removeItem(SESSION_KEYS.SESSION_ID);
  console.log('Session data cleared');
};

/**
 * Full logout flow: export → download → clear
 */
export const handleLogout = () => {
  // Export and download session data
  const filename = exportSessionData();
  
  // Clear all session data
  clearSessionData();
  
  return filename;
};

// ============================================
// USER PROFILE MANAGEMENT
// ============================================

/**
 * Get user profile from localStorage
 */
export const getUserProfile = () => {
  const saved = localStorage.getItem(SESSION_KEYS.USER_PROFILE);
  return saved ? JSON.parse(saved) : DEFAULTS.PROFILE;
};

/**
 * Save user profile to localStorage
 */
export const setUserProfile = (profile) => {
  localStorage.setItem(SESSION_KEYS.USER_PROFILE, JSON.stringify(profile));
};

// ============================================
// PASSWORD MANAGEMENT
// ============================================

/**
 * Get stored password hash (simple hash for demo)
 */
export const getPasswordHash = () => {
  return localStorage.getItem(SESSION_KEYS.USER_PASSWORD);
};

/**
 * Set password (simple hash for demo - use bcrypt in production)
 */
export const setPassword = (password) => {
  // Simple base64 encoding (NOT secure - for demo only)
  const hash = btoa(password);
  localStorage.setItem(SESSION_KEYS.USER_PASSWORD, hash);
};

/**
 * Validate password against stored hash
 */
export const validatePassword = (password) => {
  const storedHash = getPasswordHash();
  if (!storedHash) return true; // No password set yet
  return btoa(password) === storedHash;
};

/**
 * Change password with validation
 */
export const changePassword = (currentPassword, newPassword) => {
  if (!validatePassword(currentPassword)) {
    return { success: false, error: 'Current password is incorrect' };
  }
  
  if (newPassword.length < 8) {
    return { success: false, error: 'Password must be at least 8 characters' };
  }
  
  setPassword(newPassword);
  return { success: true };
};

// ============================================
// SESSION SETTINGS MANAGEMENT
// ============================================

/**
 * Get session settings from localStorage
 */
export const getSessionSettings = () => {
  const saved = localStorage.getItem(SESSION_KEYS.SESSION_SETTINGS);
  return saved ? JSON.parse(saved) : DEFAULTS.SESSION;
};

/**
 * Save session settings to localStorage
 */
export const setSessionSettings = (settings) => {
  localStorage.setItem(SESSION_KEYS.SESSION_SETTINGS, JSON.stringify(settings));
};

// ============================================
// NOTIFICATION SETTINGS MANAGEMENT
// ============================================

/**
 * Get notification thresholds from localStorage
 */
export const getNotificationThresholds = () => {
  const saved = localStorage.getItem(SESSION_KEYS.NOTIFICATION_THRESHOLDS);
  return saved ? JSON.parse(saved) : DEFAULTS.NOTIFICATION_THRESHOLDS;
};

/**
 * Save notification thresholds to localStorage
 */
export const setNotificationThresholds = (thresholds) => {
  localStorage.setItem(SESSION_KEYS.NOTIFICATION_THRESHOLDS, JSON.stringify(thresholds));
};

/**
 * Get email notification settings from localStorage
 */
export const getEmailNotifications = () => {
  const saved = localStorage.getItem(SESSION_KEYS.EMAIL_NOTIFICATIONS);
  return saved ? JSON.parse(saved) : DEFAULTS.EMAIL_NOTIFICATIONS;
};

/**
 * Save email notification settings to localStorage
 */
export const setEmailNotifications = (settings) => {
  localStorage.setItem(SESSION_KEYS.EMAIL_NOTIFICATIONS, JSON.stringify(settings));
};

/**
 * Get SMS alert settings from localStorage
 */
export const getSmsAlerts = () => {
  const saved = localStorage.getItem(SESSION_KEYS.SMS_ALERTS);
  return saved ? JSON.parse(saved) : DEFAULTS.SMS_ALERTS;
};

/**
 * Save SMS alert settings to localStorage
 */
export const setSmsAlerts = (settings) => {
  localStorage.setItem(SESSION_KEYS.SMS_ALERTS, JSON.stringify(settings));
};

// ============================================
// NOTIFICATION ALERT COUNT
// ============================================

/**
 * Get count of unread/dismissed alerts
 */
export const getUnreadAlertsCount = () => {
  const alerts = JSON.parse(localStorage.getItem(SESSION_KEYS.ALERTS) || '[]');
  return alerts.filter(a => !a.dismissed).length;
};

export default {
  SESSION_KEYS,
  DEFAULTS,
  generateSessionId,
  getSessionId,
  collectSessionData,
  exportSessionData,
  clearSessionData,
  handleLogout,
  // User Profile
  getUserProfile,
  setUserProfile,
  // Password
  getPasswordHash,
  setPassword,
  validatePassword,
  changePassword,
  // Session Settings
  getSessionSettings,
  setSessionSettings,
  // Notification Settings
  getNotificationThresholds,
  setNotificationThresholds,
  getEmailNotifications,
  setEmailNotifications,
  getSmsAlerts,
  setSmsAlerts,
  // Alert Count
  getUnreadAlertsCount,
};
