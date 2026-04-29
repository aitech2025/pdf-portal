
import { useState, useEffect, useCallback } from 'react';
import pb from '@/lib/apiClient.js';
import { formatUserData, USER_STATUSES } from '@/utils/userManagementUtils.js';
import { toast } from 'sonner';
import { useDebounce } from '@/hooks/useDebounce.js';

export function useUserManagement() {
  const [users, setUsers] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  
  // Pagination & Sorting
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [sortField, setSortField] = useState('created');
  const [sortDir, setSortDir] = useState('-');

  // Filters
  const [searchTerm, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 500);
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [schoolFilter, setSchoolFilter] = useState('all');
  
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      let filterString = [];
      
      if (debouncedSearch) {
        filterString.push(`(name ~ "${debouncedSearch}" || email ~ "${debouncedSearch}")`);
      }
      
      if (roleFilter !== 'all') {
        filterString.push(`role = "${roleFilter}"`);
      }
      
      if (schoolFilter !== 'all') {
        filterString.push(`schoolId = "${schoolFilter}"`);
      }
      
      if (statusFilter !== 'all') {
        const now = new Date().toISOString();
        if (statusFilter === USER_STATUSES.ACTIVE) {
          filterString.push(`isActive = true && verified = true && (lockedUntil = "" || lockedUntil < "${now}")`);
        } else if (statusFilter === USER_STATUSES.INACTIVE) {
          filterString.push(`isActive = false && verified = true`);
        } else if (statusFilter === USER_STATUSES.PENDING) {
          filterString.push(`verified = false`);
        } else if (statusFilter === USER_STATUSES.SUSPENDED) {
          filterString.push(`lockedUntil != "" && lockedUntil >= "${now}"`);
        }
      }
      
      const result = await pb.collection('users').getList(page, perPage, {
        sort: `${sortDir}${sortField}`,
        filter: filterString.join(' && '),
        $autoCancel: false
      });
      
      setUsers(result.items.map(formatUserData));
      setTotalItems(result.totalItems);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [page, perPage, sortField, sortDir, debouncedSearch, roleFilter, statusFilter, schoolFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Real-time updates
  useEffect(() => {
    const subscribe = async () => {
      try {
        await pb.collection('users').subscribe('*', (e) => {
          if (e.action === 'create' || e.action === 'delete') {
            // Refetch to maintain pagination integrity for creates/deletes
            fetchUsers();
          } else if (e.action === 'update') {
            // Update in place if we have it
            setUsers(prev => prev.map(u => u.id === e.record.id ? formatUserData(e.record) : u));
          }
        });
      } catch (err) {
        console.error("Subscription error", err);
      }
    };
    
    subscribe();
    return () => {
      pb.collection('users').unsubscribe('*');
    };
  }, [fetchUsers]);

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
    setRoleFilter('all');
    setStatusFilter('all');
    setSchoolFilter('all');
    setPage(1);
  };

  // Actions
  const suspendUser = async (id, untilDate) => {
    try {
      await pb.collection('users').update(id, { lockedUntil: untilDate }, { $autoCancel: false });
      toast.success('User suspended successfully');
    } catch (e) {
      toast.error('Failed to suspend user');
    }
  };

  const activateUser = async (id) => {
    try {
      await pb.collection('users').update(id, { isActive: true, lockedUntil: "" }, { $autoCancel: false });
      toast.success('User activated successfully');
    } catch (e) {
      toast.error('Failed to activate user');
    }
  };

  const deleteUser = async (id) => {
    try {
      await pb.collection('users').delete(id, { $autoCancel: false });
      toast.success('User deleted successfully');
      setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
    } catch (e) {
      toast.error('Failed to delete user');
    }
  };

  const bulkDelete = async (ids) => {
    let successCount = 0;
    for (const id of ids) {
      try {
        await pb.collection('users').delete(id, { $autoCancel: false });
        successCount++;
      } catch (e) {
        console.error(`Failed to delete user ${id}`, e);
      }
    }
    setSelectedIds([]);
    fetchUsers();
    return successCount;
  };

  const bulkUpdateStatus = async (ids, isActive, isSuspended = false) => {
    let successCount = 0;
    const now = new Date();
    // Suspend for 30 days default if bulk suspending
    now.setDate(now.getDate() + 30);
    const lockedUntil = isSuspended ? now.toISOString() : "";
    
    for (const id of ids) {
      try {
        await pb.collection('users').update(id, { isActive, lockedUntil }, { $autoCancel: false });
        successCount++;
      } catch (e) {
        console.error(`Failed to update user ${id}`, e);
      }
    }
    setSelectedIds([]);
    fetchUsers();
    return successCount;
  };

  return {
    users,
    totalItems,
    loading,
    selectedIds,
    setSelectedIds,
    page,
    setPage,
    perPage,
    setPerPage,
    sortField,
    sortDir,
    toggleSort,
    searchTerm,
    setSearchInput,
    roleFilter,
    setRoleFilter,
    statusFilter,
    setStatusFilter,
    schoolFilter,
    setSchoolFilter,
    clearFilters,
    actions: {
      suspendUser,
      activateUser,
      deleteUser,
      bulkDelete,
      bulkUpdateStatus,
      refresh: fetchUsers
    }
  };
}
