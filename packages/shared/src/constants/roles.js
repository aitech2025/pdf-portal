export const ROLES = {
  PLATFORM_ADMIN: 'platform_admin',
  PLATFORM_VIEWER: 'platform_viewer',
  ADMIN: 'admin',
  MODERATOR: 'moderator',
  SCHOOL_ADMIN: 'school_admin',
  SCHOOL_VIEWER: 'school_viewer',
  TEACHER: 'teacher',
  SCHOOL: 'school',
};

export const ROLE_LABELS = {
  platform_admin: 'Platform Admin',
  platform_viewer: 'Platform Viewer',
  admin: 'Admin',
  moderator: 'Moderator',
  school_admin: 'School Admin',
  school_viewer: 'School Viewer',
  teacher: 'Teacher',
  school: 'School',
};

export function isPlatformRole(role) {
  return ['platform_admin', 'admin', 'moderator', 'platform_viewer'].includes(role);
}

export function isSchoolRole(role) {
  return ['school_admin', 'school_viewer', 'teacher', 'school'].includes(role);
}

export function canWrite(role) {
  return ['platform_admin', 'admin', 'school_admin', 'school'].includes(role);
}
