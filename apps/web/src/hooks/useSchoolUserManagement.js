
import { useState, useCallback } from 'react';
import pb from '@/lib/apiClient';
import { toast } from 'sonner';

export const useSchoolUserManagement = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const generateSecurePassword = () => {
    const lowercase = "abcdefghijklmnopqrstuvwxyz";
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const numbers = "0123456789";
    const symbols = "!@#$%^&*";
    
    const allChars = lowercase + uppercase + numbers + symbols;
    let password = "";
    
    // Ensure at least one of each type
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];
    
    // Fill the rest
    for (let i = 0; i < 8; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    // Shuffle
    return password.split('').sort(() => 0.5 - Math.random()).join('');
  };

  const createUser = async (userData, schoolId) => {
    setLoading(true);
    try {
      const password = userData.password || generateSecurePassword();
      const payload = {
        name: `${userData.firstName} ${userData.lastName}`.trim(),
        email: userData.email,
        role: userData.role,
        isActive: userData.isActive !== false,
        schoolId: schoolId,
        password: password,
        passwordConfirm: password,
        emailVisibility: true
      };

      const newUser = await pb.collection('users').create(payload, { $autoCancel: false });
      toast.success('User created and assigned successfully.');
      return { user: newUser, password };
    } catch (err) {
      console.error('Error creating user:', err);
      toast.error(err.message || 'Failed to create user');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateSchool = async (schoolId, schoolData) => {
    setLoading(true);
    try {
      const updated = await pb.collection('schools').update(schoolId, schoolData, { $autoCancel: false });
      toast.success('School details updated.');
      return updated;
    } catch (err) {
      console.error('Error updating school:', err);
      toast.error(err.message || 'Failed to update school');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getSchoolUsers = useCallback(async (schoolId) => {
    setLoading(true);
    try {
      const users = await pb.collection('users').getFullList({
        filter: `schoolId = "${schoolId}"`,
        sort: '-created',
        $autoCancel: false
      });
      return users;
    } catch (err) {
      console.error('Error fetching users:', err);
      toast.error('Failed to fetch school users');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const editUser = async (userId, userData) => {
    setLoading(true);
    try {
      const updated = await pb.collection('users').update(userId, userData, { $autoCancel: false });
      toast.success('User updated successfully.');
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
    setLoading(true);
    try {
      await pb.collection('users').delete(userId, { $autoCancel: false });
      toast.success('User deleted successfully.');
      return true;
    } catch (err) {
      console.error('Error deleting user:', err);
      toast.error('Failed to delete user');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    createUser,
    updateSchool,
    getSchoolUsers,
    editUser,
    deleteUser,
    generateSecurePassword
  };
};
