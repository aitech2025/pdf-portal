
import { useState } from 'react';
import client from '@/lib/apiClient';
import { toast } from 'sonner';

export const usePDFVersioning = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const uploadNewVersion = async (pdfId, file, notes, uploadedBy) => {
    setLoading(true);
    setError(null);
    try {
      // Get current PDF to find the next version number
      const pdf = await client.fetch(`/pdfs/${pdfId}`);
      const nextVersion = (pdf.currentVersion || 0) + 1;

      // All text fields MUST come before the file field so @fastify/multipart
      // can read them before hitting the file boundary in the stream.
      const formData = new FormData();
      formData.append('pdfId', pdfId);
      formData.append('versionNumber', String(nextVersion));
      formData.append('uploadedBy', uploadedBy);
      formData.append('fileSize', String(file.size));
      formData.append('versionNotes', notes || '');
      formData.append('isCurrent', 'true');
      formData.append('pdfFile', file);  // file LAST

      const versionRecord = await client.fetch('/pdfVersions', 'POST', formData);

      toast.success(`Version ${nextVersion} uploaded successfully`);
      return versionRecord;
    } catch (err) {
      console.error('Error uploading new version:', err);
      setError(err);
      toast.error('Failed to upload new version');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getVersionHistory = async (pdfId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await client.fetch('/pdfVersions', 'GET', null, {
        filter: `pdfId = "${pdfId}"`,
        sort: '-versionNumber',
        expand: 'uploadedBy'
      });
      return response.items || response;
    } catch (err) {
      console.error('Error fetching version history:', err);
      setError(err);
      toast.error('Failed to fetch version history');
      return [];
    } finally {
      setLoading(false);
    }
  };

  const makeVersionCurrent = async (pdfId, versionId, versionNumber, fileUrl) => {
    setLoading(true);
    setError(null);
    try {
      // Set all to not current
      const response = await client.fetch('/pdfVersions', 'GET', null, {
        filter: `pdfId = "${pdfId}"`
      });
      const allVersions = response.items || response;

      for (const v of allVersions) {
        await client.fetch(`/pdfVersions/${v.id}`, 'PATCH', { isCurrent: v.id === versionId });
      }

      // We need to fetch the actual file from the version to update the main PDF record
      // In a real scenario, you might just update the reference or re-upload the file
      // For simplicity here, we just update the metadata. The actual file might need re-uploading or 
      // the viewer should be smart enough to load from the current version record.
      // Assuming the viewer loads from the main `pdfs` collection, we should ideally copy the file.
      // Since we can't easily copy files between records in client-side JS without downloading/uploading,
      // we will just update the metadata and rely on the viewer to check `currentVersion`.

      await client.fetch(`/pdfs/${pdfId}`, 'PATCH', {
        currentVersion: versionNumber,
      });

      toast.success(`Version ${versionNumber} is now current`);
    } catch (err) {
      console.error('Error making version current:', err);
      setError(err);
      toast.error('Failed to update current version');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteVersion = async (pdfId, versionId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await client.fetch('/pdfVersions', 'GET', null, {
        filter: `pdfId = "${pdfId}"`
      });
      const versions = response.items || response;

      if (versions.length <= 1) {
        throw new Error('Cannot delete the only version of a PDF.');
      }

      const versionToDelete = versions.find(v => v.id === versionId);

      await client.fetch(`/pdfVersions/${versionId}`, 'DELETE');

      // If we deleted the current version, make the latest remaining one current
      if (versionToDelete?.isCurrent) {
        const remaining = versions.filter(v => v.id !== versionId).sort((a, b) => b.versionNumber - a.versionNumber);
        if (remaining.length > 0) {
          await makeVersionCurrent(pdfId, remaining[0].id, remaining[0].versionNumber);
        }
      }

      toast.success('Version deleted successfully');
    } catch (err) {
      console.error('Error deleting version:', err);
      setError(err);
      toast.error(err.message || 'Failed to delete version');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getCurrentVersion = async (pdfId) => {
    try {
      const response = await client.fetch('/pdfVersions', 'GET', null, {
        page: 1,
        per_page: 1,
        filter: `pdfId = "${pdfId}" && isCurrent = true`,
        expand: 'uploadedBy'
      });
      const items = response.items || response;
      return items[0] || null;
    } catch (err) {
      console.error('Error fetching current version:', err);
      return null;
    }
  };

  return {
    loading,
    error,
    uploadNewVersion,
    getVersionHistory,
    makeVersionCurrent,
    deleteVersion,
    getCurrentVersion
  };
};
