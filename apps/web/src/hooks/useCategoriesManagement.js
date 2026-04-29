
import { useState, useEffect, useCallback } from 'react';
import pb from '@/lib/apiClient';
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
        pb.collection('categories').getFullList({ sort: 'displayOrder,categoryName', $autoCancel: false }),
        pb.collection('subCategories').getFullList({ sort: 'displayOrder,subCategoryName', $autoCancel: false })
      ]);
      setCategories(catsRes);
      setSubCategories(subCatsRes);
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

    // Real-time subscriptions
    pb.collection('categories').subscribe('*', function (e) {
      if (e.action === 'create') {
        setCategories(prev => [...prev, e.record].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0) || a.categoryName.localeCompare(b.categoryName)));
      } else if (e.action === 'update') {
        setCategories(prev => prev.map(c => c.id === e.record.id ? e.record : c).sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0) || a.categoryName.localeCompare(b.categoryName)));
      } else if (e.action === 'delete') {
        setCategories(prev => prev.filter(c => c.id !== e.record.id));
      }
    });

    pb.collection('subCategories').subscribe('*', function (e) {
      if (e.action === 'create') {
        setSubCategories(prev => [...prev, e.record].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0) || a.subCategoryName.localeCompare(b.subCategoryName)));
      } else if (e.action === 'update') {
        setSubCategories(prev => prev.map(s => s.id === e.record.id ? e.record : s).sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0) || a.subCategoryName.localeCompare(b.subCategoryName)));
      } else if (e.action === 'delete') {
        setSubCategories(prev => prev.filter(s => s.id !== e.record.id));
      }
    });

    return () => {
      pb.collection('categories').unsubscribe('*');
      pb.collection('subCategories').unsubscribe('*');
    };
  }, [fetchData]);

  const loadPdfCount = async (subCategoryId) => {
    if (pdfCounts[subCategoryId] !== undefined) return; // Already cached
    try {
      const res = await pb.collection('pdfs').getList(1, 1, {
        filter: `subCategoryId = "${subCategoryId}"`,
        $autoCancel: false
      });
      setPdfCounts(prev => ({ ...prev, [subCategoryId]: res.totalItems }));
    } catch (err) {
      console.error('Failed to fetch PDF count for subcategory', subCategoryId, err);
    }
  };

  const createCategory = async (data) => {
    try {
      const isDuplicate = categories.some(c => c.categoryName.toLowerCase() === data.categoryName.toLowerCase());
      if (isDuplicate) throw new Error('A category with this name already exists.');

      const record = await pb.collection('categories').create(data, { $autoCancel: false });
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

      const record = await pb.collection('categories').update(id, data, { $autoCancel: false });
      setCategories(prev => prev.map(c => c.id === id ? record : c).sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0) || a.categoryName.localeCompare(b.categoryName)));
      toast.success('Category updated successfully');
      return record;
    } catch (err) {
      toast.error(err.message || 'Failed to update category');
      throw err;
    }
  };

  const deleteCategory = async (id) => {
    try {
      await pb.collection('categories').delete(id, { $autoCancel: false });
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

      const record = await pb.collection('subCategories').create(data, { $autoCancel: false });
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

      const record = await pb.collection('subCategories').update(id, data, { $autoCancel: false });
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
      await pb.collection('subCategories').delete(id, { $autoCancel: false });
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
