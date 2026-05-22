import { useEffect, useRef, useState } from 'react';
import client from '@/lib/apiClient';

/**
 * Load PDF bytes from the API for react-pdf.
 * Uses Uint8Array (avoids blob URL revoke bugs with <Document />).
 */
export function usePdfDocument({ pdfId, versionId }) {
  const [file, setFile] = useState(null);
  const [blobUrl, setBlobUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const blobUrlRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    const revokeBlobUrl = () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
      setBlobUrl(null);
    };

    const load = async () => {
      if (!pdfId && !versionId) {
        setFile(null);
        revokeBlobUrl();
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      setFile(null);
      revokeBlobUrl();

      try {
        const blob = versionId
          ? await client.fetchPdfVersionBlob(versionId)
          : await client.fetchPdfBlob(pdfId, { preview: true });

        if (cancelled) return;

        const typedBlob =
          blob.type === 'application/pdf'
            ? blob
            : new Blob([await blob.arrayBuffer()], { type: 'application/pdf' });

        const buffer = await typedBlob.arrayBuffer();
        if (cancelled) return;

        setFile({ data: new Uint8Array(buffer) });

        blobUrlRef.current = URL.createObjectURL(typedBlob);
        setBlobUrl(blobUrlRef.current);
      } catch (err) {
        if (!cancelled) {
          const msg = err?.message || err?.data?.detail || 'Failed to load PDF document.';
          setError(typeof msg === 'string' ? msg : 'Failed to load PDF document.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
      revokeBlobUrl();
    };
  }, [pdfId, versionId]);

  return { file, blobUrl, loading, error };
}
