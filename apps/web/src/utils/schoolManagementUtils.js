
import Papa from 'papaparse';
import pb from '@/lib/apiClient.js';

export const SCHOOL_STATUSES = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  DEACTIVATED: 'Deactivated',
  PENDING: 'Pending'
};

export function formatSchoolData(school) {
  if (!school) return null;
  
  let status = SCHOOL_STATUSES.PENDING; // Default or infer from rules
  if (school.isActive) {
    status = SCHOOL_STATUSES.ACTIVE;
  } else if (school.deactivationMessage) {
    status = SCHOOL_STATUSES.DEACTIVATED;
  } else if (school.isActive === false) {
    status = SCHOOL_STATUSES.INACTIVE;
  }

  // Parse location if it contains comma-separated city/state
  const locationParts = (school.location || '').split(',').map(s => s.trim());
  const city = locationParts[0] || 'Unknown';
  const state = locationParts[1] || 'Unknown';

  return {
    ...school,
    computedStatus: status,
    city,
    state,
    isDeactivated: status === SCHOOL_STATUSES.DEACTIVATED,
    isActive: status === SCHOOL_STATUSES.ACTIVE
  };
}

export function validateSchoolCode(code) {
  const re = /^[A-Z0-9-]{5,15}$/;
  return re.test(String(code).toUpperCase());
}

export function generateSchoolCode() {
  const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `SCH-${randomStr}`;
}

export async function calculateSchoolStats(schoolId) {
  try {
    const [usersRes, pdfsRes, downloadsRes] = await Promise.all([
      pb.collection('users').getList(1, 1, { filter: `schoolId="${schoolId}"`, $autoCancel: false }),
      pb.collection('pdfs').getList(1, 1, { filter: `schoolId="${schoolId}"`, $autoCancel: false }), // Assuming pdfs have schoolId or are linked via collections
      pb.collection('downloadLogs').getList(1, 1, { filter: `schoolId="${schoolId}"`, $autoCancel: false })
    ]);

    return {
      totalUsers: usersRes.totalItems,
      totalPdfs: pdfsRes.totalItems,
      totalDownloads: downloadsRes.totalItems,
      avgDownloads: pdfsRes.totalItems > 0 ? (downloadsRes.totalItems / pdfsRes.totalItems).toFixed(1) : 0
    };
  } catch (error) {
    console.error("Failed to calculate school stats", error);
    return { totalUsers: 0, totalPdfs: 0, totalDownloads: 0, avgDownloads: 0 };
  }
}

export function exportSchoolsToCSV(schools, filename = 'schools_export.csv') {
  const data = schools.map(school => ({
    ID: school.id,
    Code: school.schoolId,
    Name: school.schoolName || '',
    Principal: school.pointOfContactName || '',
    Email: school.email,
    Phone: school.mobileNumber || '',
    City: school.city,
    State: school.state,
    Status: school.computedStatus,
    Created: new Date(school.created).toLocaleString()
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

export function getStatesList(schools) {
  const states = new Set(schools.map(s => s.state).filter(Boolean));
  return Array.from(states).sort();
}

export function getCitiesList(schools, selectedState) {
  let filtered = schools;
  if (selectedState && selectedState !== 'all') {
    filtered = schools.filter(s => s.state === selectedState);
  }
  const cities = new Set(filtered.map(s => s.city).filter(Boolean));
  return Array.from(cities).sort();
}

export function getPermissionLevel(currentUser) {
  if (!currentUser) return 0;
  if (currentUser.role === 'admin' && currentUser.email === 'superadmin@example.com') return 2; // Super Admin
  if (currentUser.role === 'admin') return 1; // Admin
  return 0; // Other
}
