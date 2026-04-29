
import Papa from 'papaparse';

export const USER_ROLES = {
  ADMIN: 'admin',
  SCHOOL: 'school',
  TEACHER: 'teacher'
};

export const USER_STATUSES = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  PENDING: 'Pending',
  SUSPENDED: 'Suspended'
};

export function formatUserData(user) {
  if (!user) return null;
  
  let status = USER_STATUSES.ACTIVE;
  const now = new Date().toISOString();
  
  if (user.lockedUntil && user.lockedUntil > now) {
    status = USER_STATUSES.SUSPENDED;
  } else if (!user.verified) {
    status = USER_STATUSES.PENDING;
  } else if (!user.isActive) {
    status = USER_STATUSES.INACTIVE;
  }

  return {
    ...user,
    displayName: user.name || 'Unnamed User',
    computedStatus: status,
    isSuspended: status === USER_STATUSES.SUSPENDED,
    isPending: status === USER_STATUSES.PENDING,
    isActive: status === USER_STATUSES.ACTIVE
  };
}

export function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
}

export function validatePassword(password) {
  return {
    length: password.length >= 8,
    hasNumber: /\d/.test(password),
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    isValid: password.length >= 8 && /\d/.test(password) && /[A-Z]/.test(password) && /[a-z]/.test(password) && /[!@#$%^&*(),.?":{}|<>]/.test(password)
  };
}

export function generatePassword(length = 12) {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
  let password = "";
  // Ensure at least one of each required type
  password += "A"; // upper
  password += "a"; // lower
  password += "1"; // number
  password += "!"; // special
  
  for (let i = 4; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  // Shuffle
  return password.split('').sort(() => 0.5 - Math.random()).join('');
}

export function exportUsersToCSV(users, filename = 'users_export.csv') {
  const data = users.map(user => ({
    ID: user.id,
    Name: user.name || '',
    Email: user.email,
    Role: user.role,
    SchoolID: user.schoolId || '',
    Status: user.computedStatus,
    Verified: user.verified ? 'Yes' : 'No',
    LastLogin: user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never',
    Created: new Date(user.created).toLocaleString()
  }));

  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (navigator.msSaveBlob) {
    navigator.msSaveBlob(blob, filename);
  } else {
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

export function getPermissionLevel(currentUser) {
  // Mocking super admin vs regular admin check based on email or a specific flag
  // Assuming specific super admin email for demonstration, or default admin
  if (!currentUser) return 0;
  if (currentUser.role === 'admin' && currentUser.email === 'superadmin@example.com') return 2; // Super Admin
  if (currentUser.role === 'admin') return 1; // Admin
  return 0; // Other
}
