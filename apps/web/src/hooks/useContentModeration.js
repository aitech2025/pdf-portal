import { useState, useEffect, useCallback } from 'react';
import client from '@/lib/apiClient.js';
import { formatPDFData, MODERATION_STATUSES, calculateModerationStats } from '@/utils/contentModerationUtils.js';
import { toast } from 'sonner';
import { useDebounce } from '@/hooks/useDebounce.js';

export function useContentModeration() {
  const [pdfs, setPdfs] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const [stats, setStats] = useState(calculateModerationStats([]));

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [sortField, setSortField] = useState('created');
  const [sortDir, setSortDir] = useState('-');

  const [searchTerm, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 500);
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const fetchPDFs = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        per_page: perPage,
        sort: `${sortDir}${sortField}`,
      };

      if (debouncedSearch) params.q = debouncedSearch;
      if (categoryFilter !== 'all') params.categoryId = categoryFilter;
      if (statusFilter !== 'all') {
        if (statusFilter === MODERATION_STATUSES.APPROVED) {
          params.status = 'approved';
          params.is_active = true;
        } else if (statusFilter === MODERATION_STATUSES.PENDING) {
          params.status = 'pending';
        } else if (statusFilter === MODERATION_STATUSES.REJECTED) {
          params.status = 'rejected';
        }
      }

      const result = await client.fetch('/pdfs', 'GET', null, params);
      const items = result.items || [];
      const formatted = items.map(formatPDFData);
      setPdfs(formatted);
      setTotalItems(result.totalItems || items.length);
      setStats(calculateModerationStats(formatted));
    } catch (error) {
      console.error('Error fetching PDFs:', error);
      toast.error('Failed to load content');
    } finally {
      setLoading(false);
    }
  }, [page, perPage, sortField, sortDir, debouncedSearch, statusFilter, categoryFilter]);

  useEffect(() => {
    fetchPDFs();
  }, [fetchPDFs]);

  const updatePDFStatus = async (id, status, reason = '') => {
    try {
      const isActive = status === 'approved';
      await client.fetch(`/pdfs/${id}`, 'PATCH', {
        isActive,
        status,
        rejectionReason: reason,
      });
      toast.success(`PDF ${status} successfully`);
      fetchPDFs();
    } catch (e) {
      console.error(e);
      toast.error(`Failed to mark PDF as ${status}`);
    }
  };

  const deletePDF = async (id) => {
    try {
      await client.fetch(`/pdfs/${id}`, 'DELETE');
      toast.success('PDF deleted successfully');
      setSelectedIds(prev => prev.filter(sid => sid !== id));
      fetchPDFs();
    } catch (e) {
      toast.error('Failed to delete PDF');
    }
  };

  const bulkUpdateStatus = async (ids, status, reason = '') => {
    let count = 0;
    const isActive = status === 'approved';
    for (const id of ids) {
      try {
        await client.fetch(`/pdfs/${id}`, 'PATCH', { isActive, status, rejectionReason: reason });
        count++;
      } catch (e) {
        console.error(`Failed to update ${id}`, e);
      }
    }
    setSelectedIds([]);
    fetchPDFs();
    return count;
  };

  const bulkDelete = async (ids) => {
    let count = 0;
    for (const id of ids) {
      try {
        await client.fetch(`/pdfs/${id}`, 'DELETE');
        count++;
      } catch (e) { }
    }
    setSelectedIds([]);
    fetchPDFs();
    return count;
  };

  const clearFilters = () => {
    setSearchInput('');
    setStatusFilter('all');
    setCategoryFilter('all');
    setPage(1);
  };

  return {
    pdfs, totalItems, loading, stats,
    selectedIds, setSelectedIds,
    page, setPage, perPage, setPerPage,
    searchTerm, setSearchInput,
    statusFilter, setStatusFilter,
    categoryFilter, setCategoryFilter,
    clearFilters,
    actions: { updatePDFStatus, deletePDF, bulkUpdateStatus, bulkDelete, refresh: fetchPDFs }
  };
}
