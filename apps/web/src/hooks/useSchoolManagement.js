import { useState, useEffect, useCallback } from 'react';
import client from '@/lib/apiClient.js';
import { formatSchoolData, SCHOOL_STATUSES, calculateSchoolStats } from '@/utils/schoolManagementUtils.js';
import { toast } from 'sonner';
import { useDebounce } from '@/hooks/useDebounce.js';

export function useSchoolManagement() {
  const [schools, setSchools] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const [schoolStats, setSchoolStats] = useState({});

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [sortField, setSortField] = useState('created');
  const [sortDir, setSortDir] = useState('-');

  const [searchTerm, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 500);
  const [statusFilter, setStatusFilter] = useState('all');
  const [stateFilter, setStateFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');

  const fetchSchools = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        per_page: perPage,
        sort: `${sortDir}${sortField}`,
      };

      if (debouncedSearch) params.filter = debouncedSearch;
      if (statusFilter === SCHOOL_STATUSES.ACTIVE) params.is_active = true;
      else if (statusFilter === SCHOOL_STATUSES.INACTIVE) params.is_active = false;

      const result = await client.fetch('/schools', 'GET', null, params);
      const items = result.items || [];
      const formattedSchools = items.map(formatSchoolData);
      setSchools(formattedSchools);
      setTotalItems(result.totalItems || items.length);

      // Fetch per-school stats asynchronously
      formattedSchools.forEach(async (school) => {
        try {
          const stats = await calculateSchoolStats(school.id);
          setSchoolStats(prev => ({ ...prev, [school.id]: stats }));
        } catch (_) { }
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

  const updateSchoolStatus = async (id, isActive, deactivationMessage = '') => {
    try {
      await client.fetch(`/schools/${id}`, 'PATCH', { isActive, deactivationMessage });
      toast.success(`School ${isActive ? 'activated' : 'deactivated'} successfully`);
      fetchSchools();
    } catch (e) {
      toast.error('Failed to update school status');
    }
  };

  const deleteSchool = async (id) => {
    try {
      await client.fetch(`/schools/${id}`, 'DELETE');
      toast.success('School deleted successfully');
      setSelectedIds(prev => prev.filter(sid => sid !== id));
      fetchSchools();
    } catch (e) {
      toast.error('Failed to delete school');
    }
  };

  const bulkDelete = async (ids) => {
    let successCount = 0;
    for (const id of ids) {
      try {
        await client.fetch(`/schools/${id}`, 'DELETE');
        successCount++;
      } catch (e) {
        console.error(`Failed to delete school ${id}`, e);
      }
    }
    setSelectedIds([]);
    fetchSchools();
    return successCount;
  };

  const bulkUpdateStatus = async (ids, isActive, deactivationMessage = '') => {
    let successCount = 0;
    for (const id of ids) {
      try {
        await client.fetch(`/schools/${id}`, 'PATCH', { isActive, deactivationMessage });
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
