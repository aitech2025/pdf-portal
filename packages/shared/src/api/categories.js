import { apiFetch } from './client.js';

export const categoriesApi = {
  listCategories: () =>
    apiFetch('/api/categories'),
  createCategory: (data) =>
    apiFetch('/api/categories', 'POST', data),
  updateCategory: (id, data) =>
    apiFetch(`/api/categories/${id}`, 'PATCH', data),
  deleteCategory: (id, options = null) =>
    apiFetch(`/api/categories/${id}`, 'DELETE', null, options),
  listSubCategories: (categoryId) =>
    apiFetch('/api/subCategories', 'GET', null, categoryId ? { category_id: categoryId } : null),
  createSubCategory: (data) =>
    apiFetch('/api/subCategories', 'POST', data),
  updateSubCategory: (id, data) =>
    apiFetch(`/api/subCategories/${id}`, 'PATCH', data),
  deleteSubCategory: (id) =>
    apiFetch(`/api/subCategories/${id}`, 'DELETE'),
};
