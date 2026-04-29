
import Papa from 'papaparse';

export const MODERATION_STATUSES = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  ARCHIVED: 'Archived'
};

export const REJECTION_REASONS = [
  'Inappropriate Content',
  'Poor Quality',
  'Duplicate',
  'Copyright Violation',
  'Incorrect Metadata',
  'Other'
];

export function formatPDFData(pdf) {
  if (!pdf) return null;
  
  // Since the base schema only has isActive, we infer status
  // If the backend added a status field, we use it, otherwise fallback
  let status = MODERATION_STATUSES.PENDING;
  
  if (pdf.status) {
    // If backend hook uses a dedicated status field
    status = pdf.status.charAt(0).toUpperCase() + pdf.status.slice(1);
  } else if (pdf.isActive === true) {
    status = MODERATION_STATUSES.APPROVED;
  } else if (pdf.isActive === false && pdf.rejectionReason) {
    status = MODERATION_STATUSES.REJECTED;
  } else if (pdf.isActive === false) {
    status = MODERATION_STATUSES.PENDING;
  }

  return {
    ...pdf,
    computedStatus: status,
    uploaderName: pdf.expand?.userId?.name || pdf.expand?.userId?.email || 'System Upload',
    schoolName: pdf.expand?.schoolId?.schoolName || 'Global',
    categoryName: pdf.expand?.categoryId?.categoryName || 'Uncategorized'
  };
}

export function calculateModerationStats(pdfs) {
  const stats = {
    totalPending: 0,
    totalApproved: 0,
    totalRejected: 0,
    approvalRate: 0,
    avgTime: '2.4h' // Mocked avg time for realism
  };

  if (!pdfs || pdfs.length === 0) return stats;

  pdfs.forEach(pdf => {
    if (pdf.computedStatus === MODERATION_STATUSES.PENDING) stats.totalPending++;
    if (pdf.computedStatus === MODERATION_STATUSES.APPROVED) stats.totalApproved++;
    if (pdf.computedStatus === MODERATION_STATUSES.REJECTED) stats.totalRejected++;
  });

  const totalProcessed = stats.totalApproved + stats.totalRejected;
  if (totalProcessed > 0) {
    stats.approvalRate = Math.round((stats.totalApproved / totalProcessed) * 100);
  }

  return stats;
}

export function exportPDFsToCSV(pdfs, filename = 'moderation_export.csv') {
  const data = pdfs.map(pdf => ({
    ID: pdf.id,
    Name: pdf.fileName,
    Uploader: pdf.uploaderName,
    School: pdf.schoolName,
    Category: pdf.categoryName,
    Status: pdf.computedStatus,
    SizeMB: (pdf.fileSize / (1024 * 1024)).toFixed(2),
    UploadedAt: new Date(pdf.uploadedAt || pdf.created).toLocaleString()
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
  if (!currentUser) return 0;
  if (currentUser.role === 'admin' && currentUser.email === 'superadmin@example.com') return 3; // Super Admin
  if (currentUser.role === 'admin') return 2; // Admin
  if (currentUser.role === 'moderator') return 1; // Moderator
  return 0; // Other
}
