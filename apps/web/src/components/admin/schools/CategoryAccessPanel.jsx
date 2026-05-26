import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Loader2, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import pb from '@/lib/apiClient';

// Thin authenticated API wrappers backed by the web app's pb client.
const schoolCategoryApi = {
    listAssignedCategories: (schoolId) =>
        pb.collection('schools').getOne(schoolId).then(() =>
            fetch(`/api/schools/${schoolId}/categories`, {
                headers: { Authorization: `Bearer ${pb.authStore.token}` },
            }).then(async (res) => {
                if (!res.ok) {
                    const err = await res.json().catch(() => ({ detail: res.statusText }));
                    throw new Error(err.detail || 'Failed to load assigned categories');
                }
                return res.json();
            })
        ),
    assignCategories: (schoolId, categoryIds) =>
        fetch(`/api/schools/${schoolId}/categories`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${pb.authStore.token}`,
            },
            body: JSON.stringify({ categoryIds }),
        }).then(async (res) => {
            if (!res.ok) {
                const err = await res.json().catch(() => ({ detail: res.statusText }));
                throw new Error(err.detail || 'Failed to assign categories');
            }
            return res.status === 204 ? null : res.json();
        }),
    removeCategory: (schoolId, categoryId) =>
        fetch(`/api/schools/${schoolId}/categories/${categoryId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${pb.authStore.token}` },
        }).then(async (res) => {
            if (!res.ok) {
                const err = await res.json().catch(() => ({ detail: res.statusText }));
                throw new Error(err.detail || 'Failed to remove category');
            }
            return null;
        }),
};

const categoriesApi = {
    listCategories: () =>
        fetch('/api/categories', {
            headers: { Authorization: `Bearer ${pb.authStore.token}` },
        }).then(async (res) => {
            if (!res.ok) {
                const err = await res.json().catch(() => ({ detail: res.statusText }));
                throw new Error(err.detail || 'Failed to load categories');
            }
            return res.json();
        }),
};

/**
 * CategoryAccessPanel
 *
 * Props:
 *   schoolId    {string}   – required; the school whose category access is managed
 *   onCountChange {function} – optional; called with the current assigned-category count
 */
const CategoryAccessPanel = ({ schoolId, onCountChange }) => {
    const [assigned, setAssigned] = useState([]);   // { id, categoryId, categoryName, categoryType, isActive }
    const [allCategories, setAllCategories] = useState([]); // { id, categoryName, categoryType, isActive, ... }
    const [loading, setLoading] = useState(true);
    const [removing, setRemoving] = useState(null); // categoryId being removed
    const [assigning, setAssigning] = useState(false);
    const [checked, setChecked] = useState({});     // { [categoryId]: boolean }

    const refresh = useCallback(async () => {
        if (!schoolId) return;
        setLoading(true);
        try {
            const [assignedRes, allRes] = await Promise.all([
                schoolCategoryApi.listAssignedCategories(schoolId),
                categoriesApi.listCategories(),
            ]);

            const assignedItems = assignedRes?.items ?? [];
            // allRes may be { items: [...] } or a plain array depending on backend
            const allItems = Array.isArray(allRes) ? allRes : (allRes?.items ?? []);
            // Only show active categories
            const activeAll = allItems.filter((c) => c.isActive !== false);

            setAssigned(assignedItems);
            setAllCategories(activeAll);
            setChecked({});

            if (onCountChange) onCountChange(assignedItems.length);
        } catch (err) {
            toast.error(err.message || 'Failed to load category data');
        } finally {
            setLoading(false);
        }
    }, [schoolId, onCountChange]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const assignedCategoryIds = new Set(assigned.map((a) => a.categoryId));
    const unassigned = allCategories.filter((c) => !assignedCategoryIds.has(c.id));

    const handleRemove = async (categoryId) => {
        setRemoving(categoryId);
        try {
            await schoolCategoryApi.removeCategory(schoolId, categoryId);
            await refresh();
        } catch (err) {
            toast.error(err.message || 'Failed to remove category');
        } finally {
            setRemoving(null);
        }
    };

    const handleToggleCheck = (categoryId) => {
        setChecked((prev) => ({ ...prev, [categoryId]: !prev[categoryId] }));
    };

    const handleAssign = async () => {
        const ids = Object.entries(checked)
            .filter(([, v]) => v)
            .map(([k]) => k);
        if (ids.length === 0) return;
        setAssigning(true);
        try {
            await schoolCategoryApi.assignCategories(schoolId, ids);
            await refresh();
        } catch (err) {
            toast.error(err.message || 'Failed to assign categories');
        } finally {
            setAssigning(false);
        }
    };

    const checkedCount = Object.values(checked).filter(Boolean).length;

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Loading categories…
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* ── Assigned categories ── */}
            <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                    Assigned Categories
                </h3>

                {assigned.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center border border-dashed border-border/50 rounded-[var(--radius-md)]">
                        No categories assigned to this school yet.
                    </p>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {assigned.map((item) => (
                            <Badge
                                key={item.categoryId}
                                variant="secondary"
                                className="flex items-center gap-1.5 pr-1 text-sm"
                            >
                                <span>{item.categoryName}</span>
                                <button
                                    type="button"
                                    aria-label={`Remove ${item.categoryName}`}
                                    disabled={removing === item.categoryId}
                                    onClick={() => handleRemove(item.categoryId)}
                                    className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5 transition-colors disabled:opacity-50"
                                >
                                    {removing === item.categoryId ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                        <X className="w-3 h-3" />
                                    )}
                                </button>
                            </Badge>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Unassigned categories checklist ── */}
            {unassigned.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                        Available Categories
                    </h3>

                    <div className="border border-border/50 rounded-[var(--radius-md)] divide-y divide-border/30">
                        {unassigned.map((cat) => (
                            <label
                                key={cat.id}
                                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
                            >
                                <Checkbox
                                    id={`cat-${cat.id}`}
                                    checked={!!checked[cat.id]}
                                    onCheckedChange={() => handleToggleCheck(cat.id)}
                                />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-foreground">{cat.categoryName}</p>
                                    {cat.categoryType && (
                                        <p className="text-xs text-muted-foreground">{cat.categoryType}</p>
                                    )}
                                </div>
                            </label>
                        ))}
                    </div>

                    <div className="flex justify-end">
                        <Button
                            onClick={handleAssign}
                            disabled={checkedCount === 0 || assigning}
                            size="sm"
                        >
                            {assigning ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Assigning…
                                </>
                            ) : (
                                `Assign${checkedCount > 0 ? ` (${checkedCount})` : ''}`
                            )}
                        </Button>
                    </div>
                </div>
            )}

            {unassigned.length === 0 && assigned.length > 0 && (
                <p className="text-sm text-muted-foreground text-center py-2">
                    All active categories are already assigned.
                </p>
            )}
        </div>
    );
};

export default CategoryAccessPanel;
