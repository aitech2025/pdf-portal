
export const DEFAULT_SETTINGS = {
  appName: 'EduPortal',
  appDescription: 'Educational Resource Management System',
  primaryColor: '#4f46e5',
  secondaryColor: '#10b981',
  supportEmail: 'support@example.com',
  supportPhone: '',
  supportWebsite: '',
  timezone: 'UTC',
  language: 'en',
  dateFormat: 'YYYY-MM-DD',
  timeFormat: '24-hour',
  maintenanceMode: false,
  maintenanceMessage: 'System is currently undergoing maintenance. Please check back later.',
  emailProvider: 'smtp',
  smtpHost: '',
  smtpPort: 587,
  smtpUsername: '',
  smtpPassword: '',
  emailFromAddress: 'noreply@example.com',
  emailFromName: 'EduPortal System',
  enableTLS: true,
  enableSSL: false,
  featureFlags: {
    userRegistration: true,
    socialLogin: false,
    twoFactorAuth: true,
    pdfAnnotations: false,
    pdfSharing: true,
    bulkUpload: true,
    advancedSearch: true,
    analytics: true,
    notifications: true,
    webhooks: false,
    apiAccess: false,
    offlineMode: false
  },
  integrations: {
    googleOAuth: { enabled: false, clientId: '', clientSecret: '' },
    githubOAuth: { enabled: false, clientId: '', clientSecret: '' },
    slack: { enabled: false, webhookUrl: '' },
    teams: { enabled: false, webhookUrl: '' },
    stripe: { enabled: false, apiKey: '' },
    customWebhook: { enabled: false, url: '', events: [] }
  },
  securitySettings: {
    passwordMinLength: 8,
    requireUppercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    passwordExpirationDays: 90,
    passwordHistoryCount: 3,
    sessionTimeoutMinutes: 60,
    maxConcurrentSessions: 3,
    enableSessionTracking: true,
    apiRateLimit: 100,
    loginAttemptsLimit: 5,
    loginLockoutMinutes: 15,
    enableIpWhitelist: false,
    whitelistedIps: [],
    require2faAdmins: true,
    require2faAll: false,
    twoFactorMethod: 'totp'
  },
  backupSettings: {
    frequency: 'daily',
    retentionDays: 30,
    includeUserData: true,
    includePdfFiles: true,
    includeAuditLogs: true,
    compressBackup: true,
    encryptBackup: false,
    encryptionPassword: ''
  }
};

export function validateEmail(email) {
  if (!email) return true; // Optional fields
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
}

export function validateURL(url) {
  if (!url) return true;
  try {
    new URL(url);
    return true;
  } catch (_) {
    return false;
  }
}

export function formatSettingsForSave(settings) {
  // JSON fields are passed as objects; the API handles serialization
  return {
    ...settings,
    featureFlags: settings.featureFlags || DEFAULT_SETTINGS.featureFlags,
    integrations: settings.integrations || DEFAULT_SETTINGS.integrations,
    securitySettings: settings.securitySettings || DEFAULT_SETTINGS.securitySettings,
    backupSettings: settings.backupSettings || DEFAULT_SETTINGS.backupSettings,
  };
}

export function formatSettingsForDisplay(settings) {
  if (!settings) return DEFAULT_SETTINGS;
  return {
    ...DEFAULT_SETTINGS,
    ...settings,
    featureFlags: { ...DEFAULT_SETTINGS.featureFlags, ...(settings.featureFlags || {}) },
    integrations: { ...DEFAULT_SETTINGS.integrations, ...(settings.integrations || {}) },
    securitySettings: { ...DEFAULT_SETTINGS.securitySettings, ...(settings.securitySettings || {}) },
    backupSettings: { ...DEFAULT_SETTINGS.backupSettings, ...(settings.backupSettings || {}) },
  };
}
