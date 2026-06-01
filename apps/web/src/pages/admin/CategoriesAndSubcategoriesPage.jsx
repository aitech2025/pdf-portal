
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { FolderTree, Search, Plus, MoreVertical, Edit2, Trash2, FileText, ChevronRight, Hash, Layers, CheckCircle2, XCircle, Menu, BookOpen, Users, Beaker, Compass, Lightbulb, Target, Award, Zap, Sparkles, Globe, Heart, Brain, Code, Palette, Music, Camera, Microscope, Atom, Dna, Rocket, Cpu, Database, Network, Shield, Lock, Key, Settings, Wrench, Hammer, Hammer as Drill, Sword as Saw, Ruler, Calculator, BarChart3, TrendingUp, PieChart, LineChart, Activity, HeartPulse as Pulse, Wind, Droplet, Flame, Leaf, Mountain, Sun, Moon, Star, Cloud, CloudRain, CloudSnow, Waves, Anchor, Map, Navigation, MapPin, Flag, Bookmark, Tag, Tag as Label, Badge, Grid, List, Table, Columns, Rows, Square, Circle, Triangle, Hexagon, Pentagon, Octagon, Diamond, Cross, Minus, X, Check, CheckCircle, AlertCircle, Info, HelpCircle, Bug as Question, Copy, Clipboard, Eye, EyeOff, Filter, Download, Upload, Share2, Link, Mail, MessageSquare, Phone, Video, Mic, Volume2, Volume, VolumeX, Headphones, Radio, Wifi, WifiOff, Bluetooth, Smartphone, Tablet, Monitor, Tv, Watch, HardDrive, Disc, Disc3, FlipHorizontal as Floppy, Save, Folder, FolderOpen, File, FileCode, FileImage, FileVideo, FileAudio, FileArchive, FileCheck, FileX, FileMinus, FilePlus, GraduationCap, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge as BadgeComponent } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerTrigger } from '@/components/ui/drawer';
import { Checkbox } from '@/components/ui/checkbox';
import PageTransition from '@/components/PageTransition.jsx';
import { useCategoriesManagement } from '@/hooks/useCategoriesManagement.js';
import CategoryModal from '@/components/admin/categories/CategoryModal.jsx';
import DeleteConfirmationDialog from '@/components/admin/categories/DeleteConfirmationDialog.jsx';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import pb from '@/lib/apiClient';
import { toast } from 'sonner';

const getToken = () => {
  try { return pb.authStore.token || localStorage.getItem('authToken') || ''; } catch { return ''; }
};

const apiFetch = async (url, options = {}) => {
  const token = getToken();
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) }
  });
  if (!res.ok) { const err = await res.json().catch(() => ({ detail: res.statusText })); throw new Error(err.detail || 'Request failed'); }
  return res.status === 204 ? null : res.json();
};

const ICON_MAP = {
  'FolderTree': FolderTree, 'FileText': FileText, 'BookOpen': BookOpen, 'Users': Users,
  'Beaker': Beaker, 'Compass': Compass, 'Lightbulb': Lightbulb, 'Target': Target,
  'Award': Award, 'Zap': Zap, 'Sparkles': Sparkles, 'Globe': Globe, 'Heart': Heart,
  'Brain': Brain, 'Code': Code, 'Palette': Palette, 'Music': Music, 'Camera': Camera,
  'Microscope': Microscope, 'Atom': Atom, 'Dna': Dna, 'Rocket': Rocket, 'Cpu': Cpu,
  'Database': Database, 'Network': Network, 'Shield': Shield, 'Lock': Lock, 'Key': Key,
  'Settings': Settings, 'Wrench': Wrench, 'Hammer': Hammer, 'Ruler': Ruler,
  'Calculator': Calculator, 'BarChart3': BarChart3, 'TrendingUp': TrendingUp,
  'PieChart': PieChart, 'LineChart': LineChart, 'Activity': Activity, 'Layers': Layers,
};

const DynamicIcon = ({ name, className, defaultIcon: DefaultIcon = FolderTree }) => {
  const IconComponent = name && ICON_MAP[name] ? ICON_MAP[name] : DefaultIcon;
  return <IconComponent className={className} />;
};

// Picker dialog: multi-select from a list
const ItemPickerDialog = ({ open, onClose, title, items, assignedIds, onAssign, loading }) => {
  const [selected, setSelected] = useState(new Set());
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (open) { setSelected(new Set()); setSearch(''); }
  }, [open]);

  const available = items.filter(item => {
    const id = item.id;
    if (assignedIds.has(id)) return false;
    const name = item.className || item.subjectName || '';
    return !search || name.toLowerCase().includes(search.toLowerCase());
  });

  const toggle = (id) => setSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const toggleAll = () => {
    setSelected(prev => prev.size === available.length ? new Set() : new Set(available.map(i => i.id)));
  };

  const handleAssign = async () => {
    if (selected.size === 0) return;
    await onAssign([...selected]);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-poppins">{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          {available.length > 0 && (
            <button onClick={toggleAll} className="text-xs text-primary hover:underline">
              {selected.size === available.length ? 'Deselect All' : 'Select All'}
            </button>
          )}
          <div className="max-h-64 overflow-y-auto space-y-1 border border-border/50 rounded-lg p-2">
            {available.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                {items.length === 0 ? 'No items available. Create some first.' : 'All items already assigned or no match.'}
              </p>
            ) : (
              available.map(item => {
                const id = item.id;
                const name = item.className || item.subjectName || '';
                const code = item.classCode || item.subjectCode || '';
                return (
                  <label
                    key={id}
                    className={cn(
                      "flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors",
                      selected.has(id) ? "bg-primary/10" : "hover:bg-muted/60"
                    )}
                  >
                    <Checkbox checked={selected.has(id)} onCheckedChange={() => toggle(id)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{name}</p>
                      {code && <p className="text-xs text-muted-foreground font-mono">{code}</p>}
                    </div>
                  </label>
                );
              })
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleAssign} disabled={selected.size === 0 || loading}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Assign {selected.size > 0 ? `(${selected.size})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const CategoriesAndSubcategoriesPage = () => {
  const {
    categories,
    loading,
    pdfCounts,
    loadPdfCount,
    createCategory,
    updateCategory,
    deleteCategory,
    toggleCategoryActive,
  } = useCategoriesManagement();

  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [catSearch, setCatSearch] = useState('');
  const [catStatusFilter, setCatStatusFilter] = useState('all');

  // Program structure (classes + subjects from junction tables)
  const [programStructure, setProgramStructure] = useState(null);
  const [structureLoading, setStructureLoading] = useState(false);

  // Master lists for pickers
  const [masterClasses, setMasterClasses] = useState([]);
  const [masterSubjects, setMasterSubjects] = useState([]);
  const [mastersLoaded, setMastersLoaded] = useState(false);

  // Picker dialogs
  const [classPickerOpen, setClassPickerOpen] = useState(false);
  const [subjectPickerOpen, setSubjectPickerOpen] = useState(false);
  const [subjectPickerClassId, setSubjectPickerClassId] = useState(null);
  const [pickerSaving, setPickerSaving] = useState(false);

  // Class search in panel
  const [classSearch, setClassSearch] = useState('');

  // Category modal
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState(null);

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const selectedCategory = useMemo(() => categories.find(c => c.id === selectedCategoryId) || null, [categories, selectedCategoryId]);

  const filteredCategories = useMemo(() => {
    if (!Array.isArray(categories)) return [];
    return categories
      .filter(c => c && c.categoryName && c.categoryName.toLowerCase().includes(catSearch.toLowerCase()))
      .filter(c => catStatusFilter === 'all' ? true : catStatusFilter === 'active' ? c.isActive !== false : c.isActive === false);
  }, [categories, catSearch, catStatusFilter]);

  const fetchMasters = useCallback(async () => {
    if (mastersLoaded) return;
    try {
      const [cls, subj] = await Promise.all([
        apiFetch('/api/masterClasses'),
        apiFetch('/api/masterSubjects'),
      ]);
      setMasterClasses(cls?.items ?? []);
      setMasterSubjects(subj?.items ?? []);
      setMastersLoaded(true);
    } catch {
      toast.error('Failed to load master classes/subjects');
    }
  }, [mastersLoaded]);

  const fetchProgramStructure = useCallback(async (programId) => {
    if (!programId) return;
    setStructureLoading(true);
    try {
      const data = await apiFetch(`/api/programs/${programId}/structure`);
      setProgramStructure(data);
    } catch {
      toast.error('Failed to load program structure');
      setProgramStructure(null);
    } finally {
      setStructureLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!loading && categories.length > 0 && !selectedCategoryId) {
      setSelectedCategoryId(categories[0].id);
    }
  }, [loading, categories, selectedCategoryId]);

  useEffect(() => {
    if (selectedCategoryId) {
      setProgramStructure(null);
      fetchProgramStructure(selectedCategoryId);
      fetchMasters();
    }
  }, [selectedCategoryId, fetchProgramStructure, fetchMasters]);

  const assignedClassIds = useMemo(() => {
    if (!programStructure) return new Set();
    return new Set((programStructure.classes || []).map(c => c.classId));
  }, [programStructure]);

  const getAssignedSubjectIds = (classId) => {
    if (!programStructure) return new Set();
    const cls = (programStructure.classes || []).find(c => c.classId === classId);
    return new Set((cls?.subjects || []).map(s => s.subjectId));
  };

  const filteredStructureClasses = useMemo(() => {
    if (!programStructure) return [];
    return (programStructure.classes || []).filter(cls =>
      !classSearch || cls.className?.toLowerCase().includes(classSearch.toLowerCase())
    );
  }, [programStructure, classSearch]);

  const handleAssignClasses = async (classIds) => {
    setPickerSaving(true);
    try {
      await apiFetch(`/api/programs/${selectedCategoryId}/classes`, {
        method: 'POST',
        body: JSON.stringify({ classIds })
      });
      toast.success(`${classIds.length} class(es) assigned`);
      await fetchProgramStructure(selectedCategoryId);
    } catch (err) {
      toast.error(err.message || 'Failed to assign classes');
    } finally {
      setPickerSaving(false);
    }
  };

  const handleRemoveClass = async (classId, className) => {
    try {
      await apiFetch(`/api/programs/${selectedCategoryId}/classes/${classId}`, { method: 'DELETE' });
      toast.success(`${className} removed from program`);
      await fetchProgramStructure(selectedCategoryId);
    } catch (err) {
      toast.error(err.message || 'Failed to remove class');
    }
  };

  const handleAssignSubjects = async (subjectIds) => {
    setPickerSaving(true);
    try {
      await apiFetch(`/api/programs/${selectedCategoryId}/classes/${subjectPickerClassId}/subjects`, {
        method: 'POST',
        body: JSON.stringify({ subjectIds })
      });
      toast.success(`${subjectIds.length} subject(s) assigned`);
      await fetchProgramStructure(selectedCategoryId);
    } catch (err) {
      toast.error(err.message || 'Failed to assign subjects');
    } finally {
      setPickerSaving(false);
    }
  };

  const handleRemoveSubject = async (classId, subjectId, subjectName) => {
    try {
      await apiFetch(`/api/programs/${selectedCategoryId}/classes/${classId}/subjects/${subjectId}`, { method: 'DELETE' });
      toast.success(`${subjectName} removed`);
      await fetchProgramStructure(selectedCategoryId);
    } catch (err) {
      toast.error(err.message || 'Failed to remove subject');
    }
  };

  const handleSaveCategory = async (data, structureData) => {
    if (editingCat) {
      await updateCategory(editingCat.id, data);
    } else {
      const newCat = await createCategory(data);
      setSelectedCategoryId(newCat.id);
      // Assign classes and subjects from the wizard
      if (structureData?.classIds?.length) {
        await apiFetch(`/api/programs/${newCat.id}/classes`, {
          method: 'POST',
          body: JSON.stringify({ classIds: structureData.classIds })
        });
      }
      for (const [classId, subjectIds] of Object.entries(structureData?.subjectsByClass || {})) {
        if (subjectIds.length > 0) {
          await apiFetch(`/api/programs/${newCat.id}/classes/${classId}/subjects`, {
            method: 'POST',
            body: JSON.stringify({ subjectIds })
          });
        }
      }
      if (structureData?.classIds?.length) {
        await fetchProgramStructure(newCat.id);
      }
    }
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      if (deletingItem.type === 'Program') {
        await deleteCategory(deletingItem.id);
        if (selectedCategoryId === deletingItem.id) {
          setSelectedCategoryId(categories.find(c => c.id !== deletingItem.id)?.id || null);
        }
      }
      setDeleteDialogOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const openDeleteDialog = (item, type) => {
    setDeletingItem({
      id: item.id,
      name: item.categoryName,
      type,
      childCount: (programStructure?.classes || []).length
    });
    setDeleteDialogOpen(true);
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-border/50 shrink-0 space-y-4">
        <Button
          className="w-full justify-start shadow-sm"
          onClick={() => { setEditingCat(null); setCatModalOpen(true); }}
        >
          <Plus className="w-4 h-4 mr-2" /> Add Program
        </Button>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Find programs..."
            value={catSearch}
            onChange={e => setCatSearch(e.target.value)}
            className="pl-9 bg-background/50 h-9"
          />
        </div>
        <div className="flex gap-1.5">
          {['all', 'active', 'inactive'].map(s => (
            <button
              key={s}
              onClick={() => setCatStatusFilter(s)}
              className={cn(
                "flex-1 text-xs py-1 rounded-md font-medium transition-colors capitalize",
                catStatusFilter === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >{s}</button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-[var(--radius-md)]" />)
        ) : filteredCategories.length === 0 ? (
          <div className="text-center py-8 px-4">
            <FolderTree className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">No programs found</p>
            <p className="text-xs text-muted-foreground mt-1">Try a different search or create a new one.</p>
          </div>
        ) : (
          filteredCategories.map(cat => {
            const isSelected = selectedCategoryId === cat.id;
            const classCount = isSelected ? (programStructure?.classes || []).length : 0;

            return (
              <div
                key={cat.id}
                onClick={() => setSelectedCategoryId(cat.id)}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-[var(--radius-md)] cursor-pointer transition-all duration-200 group border",
                  isSelected
                    ? "bg-primary/10 border-primary/20 shadow-sm"
                    : "bg-transparent border-transparent hover:bg-muted/50 hover:border-border/50"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-[var(--radius-sm)] flex items-center justify-center shrink-0 transition-colors",
                  isSelected ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground group-hover:bg-background"
                )}>
                  <DynamicIcon name={cat.icon} className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0 pr-2">
                  <p className={cn("text-sm font-semibold truncate", isSelected ? "text-foreground" : "text-foreground/80")}>
                    {cat.categoryName}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <GraduationCap className="w-3 h-3" />
                    {isSelected ? `${classCount} class(es)` : '—'}
                    {!cat.isActive && (
                      <span className="w-2 h-2 rounded-full bg-muted-foreground/40 shrink-0 ml-1" title="Inactive" />
                    )}
                  </p>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger
                    onClick={e => e.stopPropagation()}
                    className={cn(
                      "inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] hover:bg-muted transition-opacity opacity-0 group-hover:opacity-100",
                      isSelected && "opacity-100"
                    )}
                  >
                    <MoreVertical className="w-4 h-4 text-muted-foreground" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditingCat(cat); setCatModalOpen(true); }}>
                      <Edit2 className="w-4 h-4 mr-2" /> Edit Program
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); toggleCategoryActive(cat.id, !cat.isActive); }}>
                      {cat.isActive ? <><XCircle className="w-4 h-4 mr-2" /> Deactivate</> : <><CheckCircle2 className="w-4 h-4 mr-2" /> Activate</>}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openDeleteDialog(cat, 'Program'); }} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                      <Trash2 className="w-4 h-4 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <PageTransition className="flex flex-col h-[calc(100vh-6rem)] min-h-[600px] overflow-hidden pb-4">
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div>
          <h1 className="text-3xl font-poppins font-bold text-foreground flex items-center gap-3">
            <span className="lg:hidden">
              <Drawer>
                <DrawerTrigger className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] border border-input bg-background shadow-soft-sm hover:bg-accent hover:text-accent-foreground hover:border-accent/50">
                  <Menu className="w-5 h-5" />
                </DrawerTrigger>
                <DrawerContent className="h-[80vh]">
                  <SidebarContent />
                </DrawerContent>
              </Drawer>
            </span>
            Programs
          </h1>
          <p className="text-muted-foreground mt-1 hidden sm:block text-sm">
            Assign pre-created classes and subjects to programs.
          </p>
        </div>
      </div>

      <div className="flex gap-6 flex-1 min-h-0">
        <Card className="w-80 hidden lg:flex flex-col shadow-soft-md border-border/50 bg-card overflow-hidden shrink-0">
          <SidebarContent />
        </Card>

        <Card className="flex-1 flex flex-col shadow-soft-md border-border/50 bg-card overflow-hidden min-w-0">
          {loading && !selectedCategory ? (
            <div className="flex-1 flex items-center justify-center">
              <Skeleton className="w-64 h-64 rounded-full" />
            </div>
          ) : !selectedCategory ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-muted/5">
              <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6 border border-border">
                <FolderTree className="w-10 h-10 text-muted-foreground/40" />
              </div>
              <h2 className="text-2xl font-semibold text-foreground mb-2">No Program Selected</h2>
              <p className="text-muted-foreground max-w-sm mb-6">Choose a program from the sidebar or create a new one to manage its classes and subjects.</p>
              <Button onClick={() => { setEditingCat(null); setCatModalOpen(true); }} className="shadow-sm">
                <Plus className="w-4 h-4 mr-2" /> Create First Program
              </Button>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              {/* Program header */}
              <div className="p-6 md:p-8 border-b border-border/50 bg-gradient-to-r from-muted/30 to-background shrink-0 relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 relative z-10">
                  <div className="flex items-start gap-5">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner border border-primary/20 shrink-0">
                      <DynamicIcon name={selectedCategory.icon} className="w-8 h-8" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h2 className="text-2xl sm:text-3xl font-bold font-poppins text-foreground">{selectedCategory.categoryName}</h2>
                        {selectedCategory.isActive ? (
                          <BadgeComponent variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20"><CheckCircle2 className="w-3 h-3 mr-1" /> Active</BadgeComponent>
                        ) : (
                          <BadgeComponent variant="outline" className="bg-muted text-muted-foreground"><XCircle className="w-3 h-3 mr-1" /> Inactive</BadgeComponent>
                        )}
                      </div>
                      <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed">
                        {selectedCategory.description || 'No description provided.'}
                      </p>
                      {selectedCategory.categoryType && (
                        <div className="flex items-center gap-2 mt-3">
                          <span className="flex items-center bg-background px-2.5 py-1 rounded-[var(--radius-sm)] border border-border shadow-sm text-sm">
                            <Hash className="w-4 h-4 mr-2 text-muted-foreground" />
                            <span className="text-muted-foreground mr-1">Level:</span> {selectedCategory.categoryType}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => { setEditingCat(selectedCategory); setCatModalOpen(true); }} className="bg-background shadow-sm shrink-0">
                    <Edit2 className="w-4 h-4 mr-2" /> Edit
                  </Button>
                </div>
              </div>

              {/* Classes panel */}
              <div className="flex flex-col flex-1 min-h-0 bg-background/50">
                <div className="p-4 md:px-8 py-4 border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/5 shrink-0">
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-primary" />
                    Assigned Classes
                    <BadgeComponent variant="secondary">{(programStructure?.classes || []).length}</BadgeComponent>
                  </h3>
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-56">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search classes..."
                        value={classSearch}
                        onChange={e => setClassSearch(e.target.value)}
                        className="pl-9 h-9 bg-background shadow-sm"
                      />
                    </div>
                    <Button size="sm" onClick={() => setClassPickerOpen(true)} className="shadow-sm shrink-0">
                      <Plus className="w-4 h-4 mr-1.5" /> Add Class
                    </Button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
                  {structureLoading ? (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                      {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
                    </div>
                  ) : filteredStructureClasses.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center p-12 bg-card border border-border border-dashed rounded-[var(--radius-xl)]">
                      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                        <GraduationCap className="w-8 h-8 text-muted-foreground/50" />
                      </div>
                      <h4 className="text-lg font-semibold text-foreground mb-1">No classes assigned</h4>
                      <p className="text-muted-foreground text-sm max-w-sm mb-6">
                        Assign pre-created classes to this program. Go to <strong>Classes</strong> in the sidebar to create classes first.
                      </p>
                      <Button onClick={() => setClassPickerOpen(true)} variant="outline" className="shadow-sm">
                        <Plus className="w-4 h-4 mr-2" /> Assign Class
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                      <AnimatePresence>
                        {filteredStructureClasses.map(cls => (
                          <motion.div
                            layout
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            key={cls.classId}
                            className={cn(
                              "group flex flex-col p-5 bg-card border border-border/50 rounded-[var(--radius-lg)] hover:border-primary/30 hover:shadow-soft-md transition-all duration-200",
                              cls.isActive === false && "opacity-60"
                            )}
                          >
                            <div className="flex items-start gap-3 mb-3">
                              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                <GraduationCap className="w-5 h-5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <h4 className="text-sm font-semibold text-foreground">{cls.className}</h4>
                                  {cls.classCode && <span className="text-xs text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">{cls.classCode}</span>}
                                </div>
                                {cls.isActive === false && <BadgeComponent variant="secondary" className="text-[10px] mt-0.5">Inactive</BadgeComponent>}
                              </div>
                              <button
                                onClick={() => handleRemoveClass(cls.classId, cls.className)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive h-7 w-7 flex items-center justify-center rounded hover:bg-destructive/10"
                                title="Remove from program"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>

                            {/* Subjects */}
                            <div className="mb-3">
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                                  <BookOpen className="w-3 h-3" /> Subjects ({(cls.subjects || []).length})
                                </span>
                                <button
                                  onClick={() => { setSubjectPickerClassId(cls.classId); setSubjectPickerOpen(true); }}
                                  className="text-xs text-primary hover:underline flex items-center gap-0.5"
                                >
                                  <Plus className="w-3 h-3" /> Add
                                </button>
                              </div>
                              {(cls.subjects || []).length === 0 ? (
                                <p className="text-xs text-muted-foreground/60 italic">No subjects assigned yet.</p>
                              ) : (
                                <div className="flex flex-wrap gap-1.5">
                                  {(cls.subjects || []).map(subj => (
                                    <span
                                      key={subj.subjectId}
                                      className={cn(
                                        "group/subj inline-flex items-center gap-1 text-xs border rounded-full px-2.5 py-0.5",
                                        subj.isActive !== false ? "bg-muted/60 border-border/50" : "bg-muted/20 border-border/30 opacity-60 line-through"
                                      )}
                                    >
                                      {subj.subjectName}
                                      {subj.subjectCode && <span className="text-muted-foreground font-mono">({subj.subjectCode})</span>}
                                      <button
                                        onClick={() => handleRemoveSubject(cls.classId, subj.subjectId, subj.subjectName)}
                                        className="opacity-0 group-hover/subj:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                                        title="Remove subject"
                                      >
                                        <X className="w-2.5 h-2.5" />
                                      </button>
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div className="flex items-center justify-between pt-3 border-t border-border/50 mt-auto">
                              <span className="text-xs text-muted-foreground">
                                {(cls.subjects || []).length} subject(s) assigned
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs text-primary hover:text-primary h-7 px-2"
                                onClick={() => { setSubjectPickerClassId(cls.classId); setSubjectPickerOpen(true); }}
                              >
                                <Plus className="w-3 h-3 mr-1" /> Add Subject
                              </Button>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>

      <CategoryModal
        isOpen={catModalOpen}
        onClose={() => setCatModalOpen(false)}
        onSave={handleSaveCategory}
        category={editingCat}
      />

      <ItemPickerDialog
        open={classPickerOpen}
        onClose={() => setClassPickerOpen(false)}
        title="Assign Classes to Program"
        items={masterClasses}
        assignedIds={assignedClassIds}
        onAssign={handleAssignClasses}
        loading={pickerSaving}
      />

      <ItemPickerDialog
        open={subjectPickerOpen}
        onClose={() => { setSubjectPickerOpen(false); setSubjectPickerClassId(null); }}
        title="Assign Subjects to Class"
        items={masterSubjects}
        assignedIds={subjectPickerClassId ? getAssignedSubjectIds(subjectPickerClassId) : new Set()}
        onAssign={handleAssignSubjects}
        loading={pickerSaving}
      />

      {deletingItem && (
        <DeleteConfirmationDialog
          isOpen={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          onConfirm={confirmDelete}
          itemName={deletingItem.name}
          itemType={deletingItem.type}
          childCount={deletingItem.childCount}
          loading={isDeleting}
        />
      )}
    </PageTransition>
  );
};

export default CategoriesAndSubcategoriesPage;
