
import { useState, useEffect, useCallback } from 'react';
import pb from '@/lib/apiClient.js';
import { formatPDFData, MODERATION_STATUSES, calculateModerationStats } from '@/utils/contentModerationUtils.js';
import { toast } from 'sonner';
import { useDebounce } from '@/hooks/useDebounce.js';

export function useContentModeration() {
  const [pdfs, setPdfs] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const [stats, setStats] = useState(calculateModerationStats([]));
  
  // Pagination & Sorting
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [sortField, setSortField] = useState('created');
  const [sortDir, setSortDir] = useState('-');

  // Filters
  const [searchTerm, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 500);
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  
  const fetchPDFs = useCallback(async () => {
    setLoading(true);
    try {
      let filterString = [];
      
      if (debouncedSearch) {
        filterString.push(`(fileName ~ "${debouncedSearch}")`);
      }
      
      if (categoryFilter !== 'all') {
        filterString.push(`categoryId = "${categoryFilter}"`);
      }
      
      if (statusFilter !== 'all') {
        if (statusFilter === MODERATION_STATUSES.APPROVED) {
          filterString.push(`isActive = true`);
        } else if (statusFilter === MODERATION_STATUSES.PENDING) {
          filterString.push(`isActive = false && status != 'rejected'`);
        } else if (statusFilter === MODERATION_STATUSES.REJECTED) {
          filterString.push(`status = 'rejected'`);
        }
      }
      
      const result = await pb.collection('pdfs').getList(page, perPage, {
        sort: `${sortDir}${sortField}`,
        filter: filterString.join(' && '),
        expand: 'categoryId,subCategoryId', // Attempting to expand relations
        $autoCancel: false
      });
      
      const formatted = result.items.map(formatPDFData);
      setPdfs(formatted);
      setTotalItems(result.totalItems);
      
      // Calculate stats based on current view or fetch a summary
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

  const updatePDFStatus = async (id, status, reason = '', comment = '') => {
    try {
      const isActive = status === 'approved';
      // We pass status and rejectionReason to trigger the backend mailer hooks
      await pb.collection('pdfs').update(id, { 
        isActive, 
        status, 
        rejectionReason: reason,
        moderationComment: comment 
      }, { $autoCancel: false });
      
      toast.success(`PDF ${status} successfully`);
      fetchPDFs();
    } catch (e) {
      console.error(e);
      toast.error(`Failed to mark PDF as ${status}`);
    }
  };

  const deletePDF = async (id) => {
    try {
      await pb.collection('pdfs').delete(id, { $autoCancel: false });
      toast.success('PDF deleted successfully');
      setSelectedIds(prev => prev.filter(sid => sid !== id));
      fetchPDFs();
    } catch (e) {
      toast.error('Failed to delete PDF');
    }
  };

  const bulkUpdateStatus = async (ids, status, reason = '', comment = '') => {
    let count = 0;
    const isActive = status === 'approved';
    for (const id of ids) {
      try {
        await pb.collection('pdfs').update(id, { 
          isActive, 
          status, 
          rejectionReason: reason,
          moderationComment: comment 
        }, { $autoCancel: false });
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
        await pb.collection('pdfs').delete(id, { $autoCancel: false });
        count++;
      } catch (e) {}
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
