
import { useState, useEffect, useCallback } from 'react';
import pb from '@/lib/apiClient.js';
import { formatSchoolData, SCHOOL_STATUSES, calculateSchoolStats } from '@/utils/schoolManagementUtils.js';
import { toast } from 'sonner';
import { useDebounce } from '@/hooks/useDebounce.js';

export function useSchoolManagement() {
  const [schools, setSchools] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  
  // Stats map: { schoolId: { totalUsers, totalPdfs, totalDownloads } }
  const [schoolStats, setSchoolStats] = useState({});

  // Pagination & Sorting
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [sortField, setSortField] = useState('created');
  const [sortDir, setSortDir] = useState('-');

  // Filters
  const [searchTerm, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 500);
  const [statusFilter, setStatusFilter] = useState('all');
  const [stateFilter, setStateFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');
  
  const fetchSchools = useCallback(async () => {
    setLoading(true);
    try {
      let filterString = [];
      
      if (debouncedSearch) {
        filterString.push(`(schoolName ~ "${debouncedSearch}" || schoolId ~ "${debouncedSearch}" || pointOfContactName ~ "${debouncedSearch}")`);
      }
      
      if (statusFilter !== 'all') {
        if (statusFilter === SCHOOL_STATUSES.ACTIVE) {
          filterString.push(`isActive = true`);
        } else if (statusFilter === SCHOOL_STATUSES.INACTIVE) {
          filterString.push(`isActive = false && deactivationMessage = ""`);
        } else if (statusFilter === SCHOOL_STATUSES.DEACTIVATED) {
          filterString.push(`deactivationMessage != ""`);
        }
      }
      
      // Since state and city are inside location, we might need a custom approach or just a simple text match for the demo
      if (stateFilter !== 'all') {
        filterString.push(`location ~ "${stateFilter}"`);
      }
      
      if (cityFilter !== 'all') {
        filterString.push(`location ~ "${cityFilter}"`);
      }
      
      const result = await pb.collection('schools').getList(page, perPage, {
        sort: `${sortDir}${sortField}`,
        filter: filterString.join(' && '),
        $autoCancel: false
      });
      
      const formattedSchools = result.items.map(formatSchoolData);
      setSchools(formattedSchools);
      setTotalItems(result.totalItems);

      // Async fetch stats for visible schools to avoid N+1 blocking the main render
      formattedSchools.forEach(async (school) => {
        const stats = await calculateSchoolStats(school.id);
        setSchoolStats(prev => ({ ...prev, [school.id]: stats }));
      });

    } catch (error) {
      console.error('Error fetching schools:', error);
      toast.error('Failed to load schools');
    } finally {
      setLoading(false);
    }
  }, [page, perPage, sortField, sortDir, debouncedSearch, statusFilter, stateFilter, cityFilter]);

  useEffect(() => {
    fetchSchools();
  }, [fetchSchools]);

  // Real-time updates
  useEffect(() => {
    const subscribe = async () => {
      try {
        await pb.collection('schools').subscribe('*', (e) => {
          if (e.action === 'create' || e.action === 'delete') {
            fetchSchools();
          } else if (e.action === 'update') {
            setSchools(prev => prev.map(s => s.id === e.record.id ? formatSchoolData(e.record) : s));
          }
        });
      } catch (err) {
        console.error("Subscription error", err);
      }
    };
    subscribe();
    return () => { pb.collection('schools').unsubscribe('*'); };
  }, [fetchSchools]);

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDir(sortDir === '-' ? '+' : '-');
    } else {
      setSortField(field);
      setSortDir('+');
    }
  };

  const clearFilters = () => {
    setSearchInput('');
    setStatusFilter('all');
    setStateFilter('all');
    setCityFilter('all');
    setPage(1);
  };

  const updateSchoolStatus = async (id, isActive, deactivationMessage = "") => {
    try {
      await pb.collection('schools').update(id, { isActive, deactivationMessage }, { $autoCancel: false });
      toast.success(`School ${isActive ? 'activated' : 'deactivated'} successfully`);
    } catch (e) {
      toast.error('Failed to update school status');
    }
  };

  const deleteSchool = async (id) => {
    try {
      await pb.collection('schools').delete(id, { $autoCancel: false });
      toast.success('School deleted successfully');
      setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
    } catch (e) {
      toast.error('Failed to delete school');
    }
  };

  const bulkDelete = async (ids) => {
    let successCount = 0;
    for (const id of ids) {
      try {
        await pb.collection('schools').delete(id, { $autoCancel: false });
        successCount++;
      } catch (e) {
        console.error(`Failed to delete school ${id}`, e);
      }
    }
    setSelectedIds([]);
    fetchSchools();
    return successCount;
  };

  const bulkUpdateStatus = async (ids, isActive, deactivationMessage = "") => {
    let successCount = 0;
    for (const id of ids) {
      try {
        await pb.collection('schools').update(id, { isActive, deactivationMessage }, { $autoCancel: false });
        successCount++;
      } catch (e) {
        console.error(`Failed to update school ${id}`, e);
      }
    }
    setSelectedIds([]);
    fetchSchools();
    return successCount;
  };

  return {
    schools,
    totalItems,
    loading,
    selectedIds,
    setSelectedIds,
    schoolStats,
    page,
    setPage,
    perPage,
    setPerPage,
    sortField,
    sortDir,
    toggleSort,
    searchTerm,
    setSearchInput,
    statusFilter,
    setStatusFilter,
    stateFilter,
    setStateFilter,
    cityFilter,
    setCityFilter,
    clearFilters,
    actions: {
      updateSchoolStatus,
      deleteSchool,
      bulkDelete,
      bulkUpdateStatus,
      refresh: fetchSchools
    }
  };
}
