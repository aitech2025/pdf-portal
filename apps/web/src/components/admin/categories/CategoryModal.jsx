import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, GraduationCap, BookOpen, Search, CheckSquare, Square, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import pb from '@/lib/apiClient';

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

const schema = z.object({
  categoryName: z.string().min(2, 'Name must be at least 2 characters').max(100),
  description: z.string().max(500).optional().or(z.literal('')),
  isActive: z.boolean().default(true)
});

const STEPS = ['Program Details', 'Assign Classes', 'Assign Subjects'];

const CategoryModal = ({ isOpen, onClose, onSave, category = null }) => {
  const isEditing = !!category;
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Masters
  const [masterClasses, setMasterClasses] = useState([]);
  const [masterSubjects, setMasterSubjects] = useState([]);
  const [mastersLoading, setMastersLoading] = useState(false);

  // Selections
  const [selectedClassIds, setSelectedClassIds] = useState(new Set());
  const [subjectsByClass, setSubjectsByClass] = useState({}); // classId → Set<subjectId>
  const [classSearch, setClassSearch] = useState('');
  const [expandedClasses, setExpandedClasses] = useState({});

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { categoryName: '', description: '', isActive: true }
  });

  const fetchMasters = useCallback(async () => {
    if (masterClasses.length > 0) return;
    setMastersLoading(true);
    try {
      const [cls, subj] = await Promise.all([
        apiFetch('/api/masterClasses'),
        apiFetch('/api/masterSubjects')
      ]);
      setMasterClasses(cls?.items ?? []);
      setMasterSubjects(subj?.items ?? []);
    } catch {
      // non-fatal
    } finally {
      setMastersLoading(false);
    }
  }, [masterClasses.length]);

  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setSelectedClassIds(new Set());
      setSubjectsByClass({});
      setClassSearch('');
      setExpandedClasses({});
      return;
    }
    form.reset(category
      ? { categoryName: category.categoryName || '', description: category.description || '', isActive: category.isActive !== false }
      : { categoryName: '', description: '', isActive: true }
    );
    if (!isEditing) fetchMasters();
  }, [isOpen, category, isEditing, fetchMasters, form]);

  // ---------- class helpers ----------
  const toggleClass = (classId) => {
    setSelectedClassIds(prev => {
      const next = new Set(prev);
      if (next.has(classId)) {
        next.delete(classId);
        setSubjectsByClass(s => { const n = { ...s }; delete n[classId]; return n; });
      } else {
        next.add(classId);
        setExpandedClasses(e => ({ ...e, [classId]: true }));
      }
      return next;
    });
  };

  const toggleAllClasses = () => {
    const visible = masterClasses.filter(c =>
      !classSearch || c.className?.toLowerCase().includes(classSearch.toLowerCase())
    );
    const allSelected = visible.every(c => selectedClassIds.has(c.id));
    if (allSelected) {
      setSelectedClassIds(prev => {
        const next = new Set(prev);
        visible.forEach(c => next.delete(c.id));
        return next;
      });
    } else {
      setSelectedClassIds(prev => {
        const next = new Set(prev);
        visible.forEach(c => next.add(c.id));
        return next;
      });
    }
  };

  // ---------- subject helpers ----------
  const toggleSubject = (classId, subjectId) => {
    setSubjectsByClass(prev => {
      const next = { ...prev };
      if (!next[classId]) next[classId] = new Set();
      const set = new Set(next[classId]);
      set.has(subjectId) ? set.delete(subjectId) : set.add(subjectId);
      next[classId] = set;
      return next;
    });
  };

  const toggleAllSubjects = (classId) => {
    const available = masterSubjects.filter(s => s.isActive !== false);
    setSubjectsByClass(prev => {
      const next = { ...prev };
      const current = next[classId] || new Set();
      const allSel = available.length > 0 && available.every(s => current.has(s.id));
      next[classId] = allSel ? new Set() : new Set(available.map(s => s.id));
      return next;
    });
  };

  // ---------- navigation ----------
  const goNext = async () => {
    if (step === 1) {
      const valid = await form.trigger(['categoryName']);
      if (valid) setStep(2);
    } else if (step === 2) {
      setStep(3);
    }
  };

  const goBack = () => setStep(s => s - 1);

  const onFinalSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      const structureData = isEditing ? null : {
        classIds: [...selectedClassIds],
        subjectsByClass: Object.fromEntries(
          Object.entries(subjectsByClass).map(([k, v]) => [k, [...v]])
        )
      };
      await onSave(data, structureData);
      onClose();
    } catch {
      // handled upstream
    } finally {
      setIsSubmitting(false);
    }
  };

  const visibleClasses = masterClasses.filter(c =>
    !classSearch || c.className?.toLowerCase().includes(classSearch.toLowerCase())
  );
  const allVisibleSelected = visibleClasses.length > 0 && visibleClasses.every(c => selectedClassIds.has(c.id));
  const selectedClassList = masterClasses.filter(c => selectedClassIds.has(c.id));

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isSubmitting && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-xl font-poppins">
            {isEditing ? 'Edit Program' : 'Add New Program'}
          </DialogTitle>
          {!isEditing && (
            <div className="flex items-center gap-2 mt-3">
              {STEPS.map((label, i) => (
                <React.Fragment key={i}>
                  <div className="flex items-center gap-1.5">
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                      step > i + 1 ? "bg-primary text-primary-foreground" :
                      step === i + 1 ? "bg-primary text-primary-foreground" :
                      "bg-muted text-muted-foreground"
                    )}>
                      {i + 1}
                    </div>
                    <span className={cn(
                      "text-xs hidden sm:block",
                      step === i + 1 ? "text-foreground font-medium" : "text-muted-foreground"
                    )}>{label}</span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={cn("flex-1 h-px", step > i + 1 ? "bg-primary" : "bg-border")} />
                  )}
                </React.Fragment>
              ))}
            </div>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 py-2">
          <Form {...form}>
            <form id="cat-wizard-form" onSubmit={form.handleSubmit(onFinalSubmit)}>

              {/* ── Step 1: Program Details ── */}
              {step === 1 && (
                <div className="space-y-4 px-1">
                  <FormField control={form.control} name="categoryName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Program Name <span className="text-destructive">*</span></FormLabel>
                      <FormControl><Input placeholder="e.g. eTechno, Olympiad, Foundation..." {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Brief description of this program..." className="resize-none h-20" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="isActive" render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border/50 p-3 bg-muted/20">
                      <div>
                        <FormLabel className="text-sm font-medium">Active</FormLabel>
                        <FormDescription className="text-xs">Inactive programs are hidden from users.</FormDescription>
                      </div>
                      <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    </FormItem>
                  )} />
                </div>
              )}

              {/* ── Step 2: Assign Classes ── */}
              {step === 2 && !isEditing && (
                <div className="space-y-3 px-1">
                  <p className="text-sm text-muted-foreground">
                    Select which classes belong to this program. You can skip this and assign later.
                  </p>
                  {mastersLoading ? (
                    <div className="flex items-center gap-2 py-6 text-muted-foreground justify-center">
                      <Loader2 className="w-4 h-4 animate-spin" /> Loading classes…
                    </div>
                  ) : masterClasses.length === 0 ? (
                    <div className="text-center py-8 border border-dashed border-border/50 rounded-lg">
                      <GraduationCap className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No classes yet. Create classes in the <strong>Classes</strong> section first.</p>
                    </div>
                  ) : (
                    <>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        <Input placeholder="Search classes..." value={classSearch} onChange={e => setClassSearch(e.target.value)} className="pl-9" />
                      </div>
                      <button
                        type="button"
                        onClick={toggleAllClasses}
                        className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {allVisibleSelected ? <CheckSquare className="w-3.5 h-3.5 text-primary" /> : <Square className="w-3.5 h-3.5" />}
                        {allVisibleSelected ? 'Deselect All' : 'Select All'}
                      </button>
                      <div className="max-h-56 overflow-y-auto space-y-1 border border-border/50 rounded-lg p-2">
                        {visibleClasses.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">No classes match.</p>
                        ) : (
                          visibleClasses.map(cls => {
                            const checked = selectedClassIds.has(cls.id);
                            return (
                              <label
                                key={cls.id}
                                className={cn(
                                  "flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors",
                                  checked ? "bg-primary/10" : "hover:bg-muted/60"
                                )}
                              >
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={() => toggleClass(cls.id)}
                                />
                                <GraduationCap className="w-4 h-4 text-muted-foreground shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <span className="text-sm font-medium">{cls.className}</span>
                                  {cls.classCode && <span className="ml-2 text-xs text-muted-foreground font-mono">({cls.classCode})</span>}
                                </div>
                              </label>
                            );
                          })
                        )}
                      </div>
                      {selectedClassIds.size > 0 && (
                        <p className="text-xs text-primary font-medium">{selectedClassIds.size} class(es) selected</p>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* ── Step 3: Assign Subjects per Class ── */}
              {step === 3 && !isEditing && (
                <div className="space-y-3 px-1">
                  <p className="text-sm text-muted-foreground">
                    Choose which subjects are available per class in this program.
                  </p>
                  {selectedClassList.length === 0 ? (
                    <div className="text-center py-8 border border-dashed border-border/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">No classes selected. Go back to select classes first.</p>
                    </div>
                  ) : masterSubjects.length === 0 ? (
                    <div className="text-center py-8 border border-dashed border-border/50 rounded-lg">
                      <BookOpen className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No subjects yet. Create subjects in the <strong>Subjects</strong> section first.</p>
                    </div>
                  ) : (
                    <div className="max-h-64 overflow-y-auto space-y-2 border border-border/50 rounded-lg p-2">
                      {selectedClassList.map(cls => {
                        const isExpanded = expandedClasses[cls.id] !== false;
                        const classSubjIds = subjectsByClass[cls.id] || new Set();
                        const activeSubjects = masterSubjects.filter(s => s.isActive !== false);
                        const allSelected = activeSubjects.length > 0 && activeSubjects.every(s => classSubjIds.has(s.id));

                        return (
                          <div key={cls.id} className="border border-border/40 rounded-lg overflow-hidden">
                            <div className="flex items-center gap-2 p-2.5 bg-muted/30">
                              <GraduationCap className="w-4 h-4 text-primary shrink-0" />
                              <span className="text-sm font-semibold flex-1">{cls.className}</span>
                              {classSubjIds.size > 0 && (
                                <span className="text-xs text-primary font-medium bg-primary/10 px-1.5 py-0.5 rounded-full">
                                  {classSubjIds.size} selected
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => setExpandedClasses(e => ({ ...e, [cls.id]: !isExpanded }))}
                                className="text-muted-foreground hover:text-foreground"
                              >
                                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                              </button>
                            </div>
                            {isExpanded && (
                              <div className="p-2 space-y-1.5">
                                <button
                                  type="button"
                                  onClick={() => toggleAllSubjects(cls.id)}
                                  className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground px-1"
                                >
                                  {allSelected ? <CheckSquare className="w-3 h-3 text-primary" /> : <Square className="w-3 h-3" />}
                                  {allSelected ? 'Deselect All' : 'Select All Subjects'}
                                </button>
                                <div className="flex flex-wrap gap-1.5 px-1">
                                  {activeSubjects.map(subj => {
                                    const checked = classSubjIds.has(subj.id);
                                    return (
                                      <button
                                        key={subj.id}
                                        type="button"
                                        onClick={() => toggleSubject(cls.id, subj.id)}
                                        className={cn(
                                          "inline-flex items-center gap-1.5 text-xs rounded-full px-2.5 py-1 border transition-colors",
                                          checked
                                            ? "bg-primary/10 border-primary/40 text-primary"
                                            : "bg-background border-border/50 text-muted-foreground hover:border-primary/30"
                                        )}
                                      >
                                        <BookOpen className="w-2.5 h-2.5" />
                                        {subj.subjectName}
                                        {subj.subjectCode && <span className="opacity-60">({subj.subjectCode})</span>}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </form>
          </Form>
        </div>

        <DialogFooter className="shrink-0 pt-3 border-t border-border/30 gap-2">
          {step > 1 && !isEditing && (
            <Button type="button" variant="outline" onClick={goBack} disabled={isSubmitting}>
              Back
            </Button>
          )}
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>

          {isEditing || step === STEPS.length ? (
            <Button
              type="button"
              disabled={isSubmitting}
              onClick={form.handleSubmit(onFinalSubmit)}
            >
              {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</> : isEditing ? 'Save Changes' : 'Create Program'}
            </Button>
          ) : (
            <Button type="button" onClick={goNext} disabled={isSubmitting}>
              Next →
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CategoryModal;
