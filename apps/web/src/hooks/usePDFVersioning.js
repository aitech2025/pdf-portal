
import { useState } from 'react';
import pb from '@/lib/apiClient';
import { toast } from 'sonner';

export const usePDFVersioning = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const uploadNewVersion = async (pdfId, file, notes, uploadedBy) => {
    setLoading(true);
    setError(null);
    try {
      // Get current PDF to find the next version number
      const pdf = await pb.collection('pdfs').getOne(pdfId, { $autoCancel: false });
      const nextVersion = (pdf.currentVersion || 0) + 1;

      // Create new version record
      const formData = new FormData();
      formData.append('pdfId', pdfId);
      formData.append('versionNumber', nextVersion);
      formData.append('uploadedBy', uploadedBy);
      formData.append('fileSize', file.size);
      formData.append('versionNotes', notes || '');
      formData.append('pdfFile', file);
      formData.append('isCurrent', true);

      const versionRecord = await pb.collection('pdfVersions').create(formData, { $autoCancel: false });

      // Update previous current versions to false
      const previousVersions = await pb.collection('pdfVersions').getFullList({
        filter: `pdfId = "${pdfId}" && id != "${versionRecord.id}" && isCurrent = true`,
        $autoCancel: false
      });

      for (const prev of previousVersions) {
        await pb.collection('pdfVersions').update(prev.id, { isCurrent: false }, { $autoCancel: false });
      }

      // Update main PDF record
      const pdfUpdateData = new FormData();
      pdfUpdateData.append('currentVersion', nextVersion);
      pdfUpdateData.append('versionNotes', notes || '');
      pdfUpdateData.append('pdfFile', file); // Update the main file as well for easy access
      pdfUpdateData.append('fileSize', file.size);

      await pb.collection('pdfs').update(pdfId, pdfUpdateData, { $autoCancel: false });

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
      const records = await pb.collection('pdfVersions').getFullList({
        filter: `pdfId = "${pdfId}"`,
        sort: '-versionNumber',
        expand: 'uploadedBy',
        $autoCancel: false
      });
      return records;
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
      const allVersions = await pb.collection('pdfVersions').getFullList({
        filter: `pdfId = "${pdfId}"`,
        $autoCancel: false
      });

      for (const v of allVersions) {
        await pb.collection('pdfVersions').update(v.id, { isCurrent: v.id === versionId }, { $autoCancel: false });
      }

      // We need to fetch the actual file from the version to update the main PDF record
      // In a real scenario, you might just update the reference or re-upload the file
      // For simplicity here, we just update the metadata. The actual file might need re-uploading or 
      // the viewer should be smart enough to load from the current version record.
      // Assuming the viewer loads from the main `pdfs` collection, we should ideally copy the file.
      // Since we can't easily copy files between records in client-side JS without downloading/uploading,
      // we will just update the metadata and rely on the viewer to check `currentVersion`.

      await pb.collection('pdfs').update(pdfId, {
        currentVersion: versionNumber,
      }, { $autoCancel: false });

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
      const versions = await pb.collection('pdfVersions').getFullList({
        filter: `pdfId = "${pdfId}"`,
        $autoCancel: false
      });

      if (versions.length <= 1) {
        throw new Error('Cannot delete the only version of a PDF.');
      }

      const versionToDelete = versions.find(v => v.id === versionId);

      await pb.collection('pdfVersions').delete(versionId, { $autoCancel: false });

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
      const records = await pb.collection('pdfVersions').getList(1, 1, {
        filter: `pdfId = "${pdfId}" && isCurrent = true`,
        expand: 'uploadedBy',
        $autoCancel: false
      });
      return records.items[0] || null;
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
