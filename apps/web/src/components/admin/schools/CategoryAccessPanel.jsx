import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Loader2, ChevronDown, ChevronRight, CheckSquare, Square, Check, GraduationCap, BookOpen, Video } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

const getToken = () => {
  try { return localStorage.getItem('authToken') || localStorage.getItem('auth_token') || ''; } catch { return ''; }
};

const apiFetch = async (url, options = {}) => {
  const token = getToken();
  const res = await fetch(url, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Request failed');
  }
  return res.status === 204 ? null : res.json();
};

const CategoryAccessPanel = ({ schoolId, onCountChange }) => {
  const [allPrograms, setAllPrograms] = useState([]);
  // programId → { classes: [{classId, className, classCode, subjects: [{subjectId, subjectName, subjectCode}]}] }
  const [programStructures, setProgramStructures] = useState({});
  const [structureLoadingIds, setStructureLoadingIds] = useState(new Set());

  const [assignedProgramIds, setAssignedProgramIds] = useState(new Set());
  // flat set of classIds currently assigned to the school
  const [assignedClassIds, setAssignedClassIds] = useState(new Set());
  // flat set of subjectIds currently assigned
  const [assignedSubjectIds, setAssignedSubjectIds] = useState(new Set());

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState({});

  // Pending (unsaved) selections
  const [pendingPrograms, setPendingPrograms] = useState(new Set());
  // programId → Set<classId>
  const [pendingClasses, setPendingClasses] = useState({});
  // classId → Set<subjectId>
  const [pendingSubjects, setPendingSubjects] = useState({});

  const loadProgramStructure = useCallback(async (programId) => {
    setProgramStructures(prev => {
      if (prev[programId]) return prev; // already loaded
      return prev;
    });
    setStructureLoadingIds(prev => {
      if (prev.has(programId)) return prev; // already loading
      const next = new Set(prev);
      next.add(programId);
      return next;
    });
    try {
      const data = await apiFetch(`/api/programs/${programId}/structure`);
      setProgramStructures(prev => ({ ...prev, [programId]: data }));
    } catch {
      setProgramStructures(prev => ({ ...prev, [programId]: { classes: [] } }));
    } finally {
      setStructureLoadingIds(prev => { const n = new Set(prev); n.delete(programId); return n; });
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const [programsRes, assignedProgramsRes, assignedClassesRes, assignedSubjectsRes] = await Promise.all([
        apiFetch('/api/categories'),
        apiFetch(`/api/schools/${schoolId}/categories`),
        apiFetch(`/api/schools/${schoolId}/classes`).catch(() => ({ items: [] })),
        apiFetch(`/api/schools/${schoolId}/subjects`).catch(() => ({ items: [] }))
      ]);

      const programs = programsRes?.items ?? [];
      const assignedProgItems = assignedProgramsRes?.items ?? [];
      const assignedClsItems = assignedClassesRes?.items ?? [];
      const assignedSubjItems = assignedSubjectsRes?.items ?? [];

      const assignedProgIds = new Set(assignedProgItems.map(a => a.categoryId));
      const assignedClsIds = new Set(assignedClsItems.map(a => a.classId));
      const assignedSubjIds = new Set(assignedSubjItems.map(a => a.subjectId));

      setAllPrograms(programs);
      setAssignedProgramIds(assignedProgIds);
      setAssignedClassIds(assignedClsIds);
      setAssignedSubjectIds(assignedSubjIds);

      // Seed pending from assigned
      setPendingPrograms(new Set(assignedProgIds));

      const pendingCls = {};
      for (const item of assignedClsItems) {
        if (item.programId) {
          if (!pendingCls[item.programId]) pendingCls[item.programId] = new Set();
          pendingCls[item.programId].add(item.classId);
        }
      }
      setPendingClasses(pendingCls);

      const pendingSubj = {};
      for (const item of assignedSubjItems) {
        if (!pendingSubj[item.classId]) pendingSubj[item.classId] = new Set();
        pendingSubj[item.classId].add(item.subjectId);
      }
      setPendingSubjects(pendingSubj);

      if (onCountChange) onCountChange(assignedProgIds.size);

      // Pre-load structures for assigned programs so classes are visible
      for (const programId of assignedProgIds) {
        loadProgramStructure(programId);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [schoolId, onCountChange, loadProgramStructure]);

  useEffect(() => { refresh(); }, [refresh]);

  const handleExpand = (programId) => {
    const next = !expanded[programId];
    setExpanded(e => ({ ...e, [programId]: next }));
    if (next && !programStructures[programId]) {
      loadProgramStructure(programId);
    }
  };

  const toggleProgram = (programId, programType) => {
    setPendingPrograms(prev => {
      const next = new Set(prev);
      if (next.has(programId)) {
        next.delete(programId);
        setPendingClasses(pc => { const n = { ...pc }; delete n[programId]; return n; });
      } else {
        next.add(programId);
        // Auto-expand video programs so class/subject selection is immediately visible
        if (programType === 'video') {
          setExpanded(e => ({ ...e, [programId]: true }));
          loadProgramStructure(programId);
        }
      }
      return next;
    });
  };

  const toggleClass = (programId, classId) => {
    setPendingClasses(prev => {
      const next = { ...prev };
      if (!next[programId]) next[programId] = new Set();
      const set = new Set(next[programId]);
      if (set.has(classId)) {
        set.delete(classId);
        // also clear subjects for this class
        setPendingSubjects(ps => { const n = { ...ps }; delete n[classId]; return n; });
      } else {
        set.add(classId);
      }
      next[programId] = set;
      return next;
    });
  };

  const toggleAllClasses = (programId) => {
    const structure = programStructures[programId];
    if (!structure) return;
    const programClasses = structure.classes || [];
    setPendingClasses(prev => {
      const next = { ...prev };
      const currentSet = new Set(next[programId] || []);
      const allSelected = programClasses.length > 0 && programClasses.every(c => currentSet.has(c.classId));
      if (allSelected) {
        next[programId] = new Set();
        // clear subjects for all these classes
        setPendingSubjects(ps => {
          const n = { ...ps };
          for (const c of programClasses) delete n[c.classId];
          return n;
        });
      } else {
        next[programId] = new Set(programClasses.map(c => c.classId));
      }
      return next;
    });
  };

  const toggleSubject = (classId, subjectId) => {
    setPendingSubjects(prev => {
      const next = { ...prev };
      if (!next[classId]) next[classId] = new Set();
      const set = new Set(next[classId]);
      if (set.has(subjectId)) set.delete(subjectId);
      else set.add(subjectId);
      next[classId] = set;
      return next;
    });
  };

  const toggleAllSubjects = (classId, subjects) => {
    setPendingSubjects(prev => {
      const next = { ...prev };
      const currentSet = new Set(next[classId] || []);
      const allSelected = subjects.length > 0 && subjects.every(s => currentSet.has(s.subjectId));
      next[classId] = allSelected ? new Set() : new Set(subjects.map(s => s.subjectId));
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // --- Programs ---
      const toAddPrograms = [...pendingPrograms].filter(id => !assignedProgramIds.has(id));
      const toRemovePrograms = [...assignedProgramIds].filter(id => !pendingPrograms.has(id));

      if (toAddPrograms.length) {
        await apiFetch(`/api/schools/${schoolId}/categories`, {
          method: 'POST',
          body: JSON.stringify({ categoryIds: toAddPrograms })
        });
      }
      for (const id of toRemovePrograms) {
        await apiFetch(`/api/schools/${schoolId}/categories/${id}`, { method: 'DELETE' });
      }

      // --- Classes ---
      const allPendingClassIds = new Set(Object.values(pendingClasses).flatMap(s => [...s]));
      const toAddClassIds = [...allPendingClassIds].filter(id => !assignedClassIds.has(id));
      const toRemoveClassIds = [...assignedClassIds].filter(id => !allPendingClassIds.has(id));

      if (toAddClassIds.length) {
        // Build { programId, classId } pairs for new assignments
        const classAssignments = [];
        for (const [programId, classIds] of Object.entries(pendingClasses)) {
          for (const classId of classIds) {
            if (!assignedClassIds.has(classId)) {
              classAssignments.push({ programId, classId });
            }
          }
        }
        if (classAssignments.length) {
          await apiFetch(`/api/schools/${schoolId}/classes`, {
            method: 'POST',
            body: JSON.stringify({ assignments: classAssignments })
          });
        }
      }
      for (const classId of toRemoveClassIds) {
        await apiFetch(`/api/schools/${schoolId}/classes/${classId}`, { method: 'DELETE' });
      }

      // --- Subjects ---
      const allPendingSubjectIds = new Set(Object.values(pendingSubjects).flatMap(s => [...s]));
      const toAddSubjectIds = [...allPendingSubjectIds].filter(id => !assignedSubjectIds.has(id));
      const toRemoveSubjectIds = [...assignedSubjectIds].filter(id => !allPendingSubjectIds.has(id));

      if (toAddSubjectIds.length) {
        // Build { programId, classId, subjectId } triples
        const subjectAssignments = [];
        for (const [programId, classIds] of Object.entries(pendingClasses)) {
          for (const classId of classIds) {
            const subjIds = pendingSubjects[classId] || new Set();
            for (const subjectId of subjIds) {
              if (!assignedSubjectIds.has(subjectId)) {
                subjectAssignments.push({ programId, classId, subjectId });
              }
            }
          }
        }
        if (subjectAssignments.length) {
          await apiFetch(`/api/schools/${schoolId}/subjects`, {
            method: 'POST',
            body: JSON.stringify({ assignments: subjectAssignments })
          });
        }
      }
      for (const subjectId of toRemoveSubjectIds) {
        await apiFetch(`/api/schools/${schoolId}/subjects/${subjectId}`, { method: 'DELETE' });
      }

      await refresh();
      toast.success('Program assignments saved');
    } catch (err) {
      toast.error(err.message || 'Failed to save assignments');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading programs…
      </div>
    );
  }

  const allPendingClassIds = new Set(Object.values(pendingClasses).flatMap(s => [...s]));
  const allPendingSubjectIds = new Set(Object.values(pendingSubjects).flatMap(s => [...s]));
  const hasChanges =
    JSON.stringify([...pendingPrograms].sort()) !== JSON.stringify([...assignedProgramIds].sort()) ||
    JSON.stringify([...allPendingClassIds].sort()) !== JSON.stringify([...assignedClassIds].sort()) ||
    JSON.stringify([...allPendingSubjectIds].sort()) !== JSON.stringify([...assignedSubjectIds].sort());

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Select programs and their classes to grant access to this institution.
        </p>
        <Button size="sm" onClick={handleSave} disabled={saving || !hasChanges}>
          {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</> : 'Save'}
        </Button>
      </div>

      {allPrograms.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center border border-dashed border-border/50 rounded-lg">
          No programs created yet. Create programs from the Programs section first.
        </p>
      ) : (
        <div className="space-y-2">
          {allPrograms.map(program => {
            const isProgramSelected = pendingPrograms.has(program.id);
            const isExpanded = !!expanded[program.id];
            const structure = programStructures[program.id];
            const isStructureLoading = structureLoadingIds.has(program.id);
            const programClasses = structure?.classes ?? [];
            const selectedClasses = pendingClasses[program.id] || new Set();
            const allClassesSelected = programClasses.length > 0 && programClasses.every(c => selectedClasses.has(c.classId));

            return (
              <div key={program.id} className="border border-border/50 rounded-lg overflow-hidden">
                <div className={cn(
                  "flex items-center gap-3 p-3 transition-colors",
                  isProgramSelected ? "bg-primary/5" : "bg-card"
                )}>
                  <Checkbox
                    checked={isProgramSelected}
                    onCheckedChange={() => toggleProgram(program.id, program.programType)}
                    id={`prog-${program.id}`}
                  />
                  <label htmlFor={`prog-${program.id}`} className="flex-1 text-sm font-medium cursor-pointer flex items-center gap-2">
                    {program.categoryName}
                    {program.programType === 'video' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                        <Video className="w-2.5 h-2.5" /> Video
                      </span>
                    ) : program.categoryType ? (
                      <span className="text-xs text-muted-foreground">({program.categoryType})</span>
                    ) : null}
                  </label>
                  <button
                    onClick={() => handleExpand(program.id)}
                    className="text-muted-foreground hover:text-foreground transition-colors p-1"
                  >
                    {isStructureLoading
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                  {programClasses.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      <GraduationCap className="w-3 h-3 mr-1" />{programClasses.length}
                    </Badge>
                  )}
                </div>

                {isExpanded && (
                  <div className="border-t border-border/30 bg-muted/20">
                    {program.programType === 'video' && (
                      <p className="px-6 pt-3 text-xs text-blue-600 dark:text-blue-400">
                        Select the classes and subjects this school can access. Only videos for the selected subjects will be visible to them.
                      </p>
                    )}
                    {isStructureLoading ? (
                      <div className="flex items-center gap-2 px-6 py-3 text-sm text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" /> Loading classes…
                      </div>
                    ) : programClasses.length === 0 ? (
                      <p className="px-6 py-3 text-sm text-muted-foreground italic">
                        {program.programType === 'video'
                          ? 'No videos are assigned to this program yet. Add videos from the Programs page first.'
                          : 'No classes assigned to this program yet.'}
                      </p>
                    ) : (
                      <>
                        <div className="flex items-center gap-3 px-6 py-2 border-b border-border/20">
                          <button
                            onClick={() => toggleAllClasses(program.id)}
                            className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {allClassesSelected ? <CheckSquare className="w-3.5 h-3.5 text-primary" /> : <Square className="w-3.5 h-3.5" />}
                            Select All Classes
                          </button>
                        </div>
                        {programClasses.map(cls => {
                          const isClassSelected = selectedClasses.has(cls.classId);
                          const classSubjects = cls.subjects || [];
                          const selectedSubjects = pendingSubjects[cls.classId] || new Set();
                          const allSubjectsSelected = classSubjects.length > 0 && classSubjects.every(s => selectedSubjects.has(s.subjectId));

                          return (
                            <div key={cls.classId} className="px-6">
                              <div className="flex items-center gap-3 py-2.5">
                                <Checkbox
                                  checked={isClassSelected}
                                  onCheckedChange={() => {
                                    if (!isProgramSelected) toggleProgram(program.id);
                                    toggleClass(program.id, cls.classId);
                                  }}
                                  id={`cls-${cls.classId}`}
                                />
                                <label htmlFor={`cls-${cls.classId}`} className="flex-1 text-sm cursor-pointer flex items-center gap-2">
                                  <GraduationCap className="w-3.5 h-3.5 text-muted-foreground" />
                                  {cls.className}
                                  {cls.classCode && <span className="text-xs text-muted-foreground font-mono">({cls.classCode})</span>}
                                </label>
                                {classSubjects.length > 0 && (
                                  <span className="text-xs text-muted-foreground">
                                    <BookOpen className="w-3 h-3 inline mr-1" />{classSubjects.length}
                                  </span>
                                )}
                              </div>

                              {isClassSelected && classSubjects.length > 0 && (
                                <div className="pb-2.5 pl-7 space-y-1.5">
                                  <div className="flex items-center gap-2 py-1">
                                    <button
                                      onClick={() => toggleAllSubjects(cls.classId, classSubjects)}
                                      className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                      {allSubjectsSelected ? <CheckSquare className="w-3 h-3 text-primary" /> : <Square className="w-3 h-3" />}
                                      Select All Subjects
                                    </button>
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {classSubjects.map(subj => {
                                      const isSubjSelected = selectedSubjects.has(subj.subjectId);
                                      return (
                                        <button
                                          key={subj.subjectId}
                                          onClick={() => toggleSubject(cls.classId, subj.subjectId)}
                                          className={cn(
                                            "inline-flex items-center gap-1.5 text-xs rounded-full px-2.5 py-0.5 border transition-colors",
                                            isSubjSelected
                                              ? "bg-primary/10 border-primary/30 text-primary"
                                              : "bg-background border-border/50 text-muted-foreground hover:border-primary/20"
                                          )}
                                        >
                                          {isSubjSelected && <Check className="w-2.5 h-2.5" />}
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
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CategoryAccessPanel;
