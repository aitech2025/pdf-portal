
import { useState, useEffect, useCallback } from 'react';
import client from '@/lib/apiClient';
import { toast } from 'sonner';

export const useCategoriesManagement = () => {
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pdfCounts, setPdfCounts] = useState({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [catsRes, subCatsRes] = await Promise.all([
        client.fetch('/categories', 'GET', null, { sort: 'displayOrder,categoryName' }),
        client.fetch('/subCategories', 'GET', null, { sort: 'displayOrder,subCategoryName' })
      ]);
      setCategories(catsRes.items || catsRes);
      setSubCategories(subCatsRes.items || subCatsRes);
      setError(null);
    } catch (err) {
      console.error('Error fetching categories data:', err);
      setError(err);
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Note: Real-time subscriptions would need WebSocket implementation
    // Removed pb.collection().subscribe() calls as they're PocketBase-specific
  }, [fetchData]);

  const loadPdfCount = async (subCategoryId) => {
    if (pdfCounts[subCategoryId] !== undefined) return; // Already cached
    try {
      const res = await client.fetch('/pdfs', 'GET', null, {
        page: 1,
        per_page: 1,
        subCategoryId
      });
      setPdfCounts(prev => ({ ...prev, [subCategoryId]: res.totalItems || 0 }));
    } catch (err) {
      console.error('Failed to fetch PDF count for subcategory', subCategoryId, err);
    }
  };

  const createCategory = async (data) => {
    try {
      const isDuplicate = categories.some(c => c.categoryName.toLowerCase() === data.categoryName.toLowerCase());
      if (isDuplicate) throw new Error('A category with this name already exists.');

      const record = await client.fetch('/categories', 'POST', data);
      // Optimistic update — subscription may not fire in all environments
      setCategories(prev => [...prev, record].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0) || a.categoryName.localeCompare(b.categoryName)));
      toast.success('Category created successfully');
      return record;
    } catch (err) {
      toast.error(err.message || 'Failed to create category');
      throw err;
    }
  };

  const updateCategory = async (id, data) => {
    try {
      const isDuplicate = categories.some(c => c.id !== id && c.categoryName.toLowerCase() === data.categoryName.toLowerCase());
      if (isDuplicate) throw new Error('A category with this name already exists.');

      const record = await client.fetch(`/categories/${id}`, 'PATCH', data);
      setCategories(prev => prev.map(c => c.id === id ? record : c).sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0) || a.categoryName.localeCompare(b.categoryName)));
      toast.success('Category updated successfully');
      return record;
    } catch (err) {
      toast.error(err.message || 'Failed to update category');
      throw err;
    }
  };

  const deleteCategory = async (id, options = {}) => {
    try {
      await client.fetch(`/categories/${id}`, 'DELETE', null, {
        force: options.force ? 'true' : undefined,
        archive: options.archive ? 'true' : undefined,
        reassignTo: options.reassignTo,
      });
      setCategories(prev => prev.filter(c => c.id !== id));
      toast.success('Category deleted successfully');
    } catch (err) {
      toast.error(err.message || 'Failed to delete category');
      throw err;
    }
  };

  const createSubCategory = async (data) => {
    try {
      const isDuplicate = subCategories.some(s => s.categoryId === data.categoryId && s.subCategoryName.toLowerCase() === data.subCategoryName.toLowerCase());
      if (isDuplicate) throw new Error('A sub-category with this name already exists in this category.');

      const record = await client.fetch('/subCategories', 'POST', data);
      setSubCategories(prev => [...prev, record].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0) || a.subCategoryName.localeCompare(b.subCategoryName)));
      toast.success('Sub-category created successfully');
      return record;
    } catch (err) {
      toast.error(err.message || 'Failed to create sub-category');
      throw err;
    }
  };

  const updateSubCategory = async (id, data) => {
    try {
      const isDuplicate = subCategories.some(s => s.id !== id && s.categoryId === data.categoryId && s.subCategoryName.toLowerCase() === data.subCategoryName.toLowerCase());
      if (isDuplicate) throw new Error('A sub-category with this name already exists in this category.');

      const record = await client.fetch(`/subCategories/${id}`, 'PATCH', data);
      setSubCategories(prev => prev.map(s => s.id === id ? record : s).sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0) || a.subCategoryName.localeCompare(b.subCategoryName)));
      toast.success('Sub-category updated successfully');
      return record;
    } catch (err) {
      toast.error(err.message || 'Failed to update sub-category');
      throw err;
    }
  };

  const deleteSubCategory = async (id) => {
    try {
      await client.fetch(`/subCategories/${id}`, 'DELETE');
      setSubCategories(prev => prev.filter(s => s.id !== id));
      toast.success('Sub-category deleted successfully');
    } catch (err) {
      toast.error(err.message || 'Failed to delete sub-category');
      throw err;
    }
  };

  return {
    categories,
    subCategories,
    loading,
    error,
    pdfCounts,
    loadPdfCount,
    createCategory,
    updateCategory,
    deleteCategory,
    createSubCategory,
    updateSubCategory,
    deleteSubCategory,
    refresh: fetchData
  };
};
