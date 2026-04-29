
import { useState, useCallback } from 'react';
import pb from '@/lib/apiClient';
import { toast } from 'sonner';

export const useSchoolManagementEnhanced = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getSchoolDetails = useCallback(async (schoolId) => {
    try {
      setLoading(true);
      const school = await pb.collection('schools').getOne(schoolId, { $autoCancel: false });
      return school;
    } catch (err) {
      console.error('Error fetching school details:', err);
      setError(err);
      toast.error('Failed to load school details');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getSchoolUsers = useCallback(async (schoolId) => {
    try {
      setLoading(true);
      const users = await pb.collection('users').getFullList({
        filter: `schoolId = "${schoolId}"`,
        sort: '-created',
        $autoCancel: false
      });
      return users;
    } catch (err) {
      console.error('Error fetching school users:', err);
      setError(err);
      toast.error('Failed to load users');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const countSchoolPDFs = useCallback(async (schoolId) => {
    try {
      // Assuming PDFs are linked to schools via users or directly. 
      // If not directly linked, we might count downloadLogs or similar.
      // For this implementation, we'll check if there's a direct link or return a mock/calculated value based on users.
      // Since pdfs collection doesn't have schoolId directly, we'll count downloadLogs for the school as a proxy for activity, or just return 0 if not applicable.
      const logs = await pb.collection('downloadLogs').getList(1, 1, {
        filter: `schoolId = "${schoolId}"`,
        $autoCancel: false
      });
      return logs.totalItems;
    } catch (err) {
      console.error('Error counting PDFs:', err);
      return 0;
    }
  }, []);

  const updateSchool = async (schoolId, data) => {
    try {
      setLoading(true);
      const updated = await pb.collection('schools').update(schoolId, data, { $autoCancel: false });
      toast.success('School updated successfully');
      return updated;
    } catch (err) {
      console.error('Error updating school:', err);
      toast.error(err.message || 'Failed to update school');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const createSchoolUser = async (schoolId, userData) => {
    try {
      setLoading(true);
      const password = userData.password || Math.random().toString(36).slice(-10) + 'A1!';
      
      const payload = {
        ...userData,
        schoolId,
        password,
        passwordConfirm: password,
        emailVisibility: true,
      };

      const newUser = await pb.collection('users').create(payload, { $autoCancel: false });
      toast.success('User created successfully');
      return { user: newUser, password };
    } catch (err) {
      console.error('Error creating user:', err);
      toast.error(err.message || 'Failed to create user');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async (userId, userData) => {
    try {
      setLoading(true);
      const updated = await pb.collection('users').update(userId, userData, { $autoCancel: false });
      toast.success('User updated successfully');
      return updated;
    } catch (err) {
      console.error('Error updating user:', err);
      toast.error(err.message || 'Failed to update user');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (userId) => {
    try {
      setLoading(true);
      await pb.collection('users').delete(userId, { $autoCancel: false });
      toast.success('User deleted successfully');
      return true;
    } catch (err) {
      console.error('Error deleting user:', err);
      toast.error('Failed to delete user');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deactivateUser = async (userId) => {
    return updateUser(userId, { isActive: false });
  };

  const activateUser = async (userId) => {
    return updateUser(userId, { isActive: true });
  };

  const searchUsers = (users, query) => {
    if (!query) return users;
    const lowerQuery = query.toLowerCase();
    return users.filter(u => 
      (u.name && u.name.toLowerCase().includes(lowerQuery)) || 
      (u.email && u.email.toLowerCase().includes(lowerQuery))
    );
  };

  const filterUsers = (users, role, status) => {
    return users.filter(u => {
      const matchRole = role === 'all' || u.role === role;
      const matchStatus = status === 'all' || 
                         (status === 'active' && u.isActive) || 
                         (status === 'inactive' && !u.isActive);
      return matchRole && matchStatus;
    });
  };

  return {
    loading,
    error,
    getSchoolDetails,
    getSchoolUsers,
    countSchoolPDFs,
    updateSchool,
    createSchoolUser,
    updateUser,
    deleteUser,
    deactivateUser,
    activateUser,
    searchUsers,
    filterUsers
  };
};
