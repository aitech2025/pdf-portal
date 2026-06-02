/** Granular permissions per FRD §3.3 */
export const PERMISSIONS = {
  SCHOOL_MANAGE: "school.manage",
  USER_MANAGE: "user.manage",
  CATEGORY_MANAGE: "category.manage",
  PDF_UPLOAD: "pdf.upload",
  PDF_VIEW: "pdf.view",
  PDF_DOWNLOAD: "pdf.download",
  PDF_PRINT: "pdf.print",
  NOTIFICATION_SEND: "notification.send",
  ANALYTICS_VIEW: "analytics.view",
  AUDIT_VIEW: "audit.view",
  SETTINGS_MANAGE: "settings.manage",
  VIDEO_MANAGE: "video.manage"
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/** FRD SUPER_ADMIN maps to platform_admin/admin in this codebase */
export const SUPER_ADMIN_ROLES = ["platform_admin", "admin", "super_admin"] as const;
export const SCHOOL_ADMIN_ROLES = ["school_admin", "school"] as const;
export const SCHOOL_USER_ROLES = ["school_viewer", "teacher"] as const;
export const PLATFORM_ROLES = [...SUPER_ADMIN_ROLES, "moderator", "platform_viewer"] as const;

const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  super_admin: Object.values(PERMISSIONS),
  platform_admin: Object.values(PERMISSIONS),
  admin: Object.values(PERMISSIONS),
  moderator: [
    PERMISSIONS.CATEGORY_MANAGE,
    PERMISSIONS.PDF_UPLOAD,
    // VIDEO_MANAGE intentionally excluded — platform admins only
    PERMISSIONS.PDF_VIEW,
    PERMISSIONS.PDF_DOWNLOAD,
    PERMISSIONS.PDF_PRINT,
    PERMISSIONS.NOTIFICATION_SEND,
    PERMISSIONS.ANALYTICS_VIEW,
    PERMISSIONS.AUDIT_VIEW
  ],
  platform_viewer: [PERMISSIONS.PDF_VIEW, PERMISSIONS.ANALYTICS_VIEW, PERMISSIONS.AUDIT_VIEW],
  school_admin: [
    PERMISSIONS.USER_MANAGE,
    PERMISSIONS.PDF_VIEW,
    PERMISSIONS.PDF_DOWNLOAD,
    PERMISSIONS.PDF_PRINT,
    PERMISSIONS.ANALYTICS_VIEW
  ],
  school: [
    PERMISSIONS.USER_MANAGE,
    PERMISSIONS.PDF_VIEW,
    PERMISSIONS.PDF_DOWNLOAD,
    PERMISSIONS.PDF_PRINT,
    PERMISSIONS.ANALYTICS_VIEW
  ],
  school_viewer: [PERMISSIONS.PDF_VIEW, PERMISSIONS.PDF_DOWNLOAD, PERMISSIONS.PDF_PRINT],
  teacher: [PERMISSIONS.PDF_VIEW, PERMISSIONS.PDF_DOWNLOAD, PERMISSIONS.PDF_PRINT]
};

export const hasPermission = (role: string, permission: Permission): boolean =>
  (ROLE_PERMISSIONS[role] ?? []).includes(permission);

export const isSuperAdmin = (role: string): boolean =>
  SUPER_ADMIN_ROLES.includes(role as (typeof SUPER_ADMIN_ROLES)[number]);

export const isSchoolRole = (role: string): boolean =>
  [...SCHOOL_ADMIN_ROLES, ...SCHOOL_USER_ROLES].includes(role as never);
