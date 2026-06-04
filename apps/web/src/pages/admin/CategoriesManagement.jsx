import React, { useState, useEffect, useMemo } from 'react';
import client from '@/lib/apiClient';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Search, FileText, ArrowLeft, FolderOpen, GraduationCap, BookOpen, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import LoadingSpinner from '@/components/LoadingSpinner.jsx';
import { getPdfCode } from '@/lib/utils';

const CategoriesManagement = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    categoryName: '',
    categoryType: '',
    description: '',
    isActive: true
  });

  // PDF panel state
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoryPdfs, setCategoryPdfs] = useState([]);
  const [pdfsLoading, setPdfsLoading] = useState(false);

  // Class/subject lookup
  const [allClasses, setAllClasses] = useState([]);
  const [allSubjects, setAllSubjects] = useState([]);
  const [filterClass, setFilterClass] = useState('all');
  const [filterSubject, setFilterSubject] = useState('all');

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await client.fetch('/categories', 'GET', null, {
        page: 1,
        per_page: 100,
        sort: 'displayOrder'
      });
      setCategories(response.items || response || []);
    } catch (err) {
      toast.error('Failed to fetch categories: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const fetchCategoryPdfs = async (categoryId) => {
    setPdfsLoading(true);
    setCategoryPdfs([]);
    setFilterClass('all');
    setFilterSubject('all');
    try {
      const response = await client.fetch(`/categories/${categoryId}/pdfs`, 'GET', null, {
        per_page: 200
      });
      setCategoryPdfs(response.items || []);
    } catch (err) {
      toast.error('Failed to load PDFs for this category');
    } finally {
      setPdfsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    Promise.all([
      client.fetch('/masterClasses'),
      client.fetch('/masterSubjects')
    ]).then(([cls, subj]) => {
      setAllClasses(cls?.items ?? []);
      setAllSubjects(subj?.items ?? []);
    }).catch(() => {});
  }, []);

  const handleCategoryClick = (category) => {
    setSelectedCategory(category);
    fetchCategoryPdfs(category.id);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await client.fetch(`/categories/${editingId}`, 'PATCH', formData);
        toast.success('Category updated successfully');
      } else {
        await client.fetch('/categories', 'POST', formData);
        toast.success('Category created successfully');
      }
      setIsOpen(false);
      resetForm();
      fetchCategories();
    } catch (err) {
      toast.error(err.message || 'An error occurred');
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this category?')) {
      try {
        await client.fetch(`/categories/${id}`, 'DELETE');
        toast.success('Category deleted');
        if (selectedCategory?.id === id) setSelectedCategory(null);
        fetchCategories();
      } catch (err) {
        toast.error('Failed to delete category');
      }
    }
  };

  const resetForm = () => {
    setFormData({ categoryName: '', categoryType: '', description: '', isActive: true });
    setEditingId(null);
  };

  const openEdit = (category, e) => {
    e.stopPropagation();
    setFormData({
      categoryName: category.categoryName,
      categoryType: category.categoryType,
      description: category.description || '',
      isActive: category.isActive
    });
    setEditingId(category.id);
    setIsOpen(true);
  };

  const filteredCategories = categories.filter(c =>
    c.categoryName && c.categoryName.toLowerCase().includes(search.toLowerCase())
  );

  // Build class/subject maps from the PDF list (only IDs that actually appear)
  const classesInPdfs = useMemo(() => {
    const ids = [...new Set(categoryPdfs.map(p => p.classId).filter(Boolean))];
    return ids.map(id => ({ id, name: allClasses.find(c => c.id === id)?.className || id }));
  }, [categoryPdfs, allClasses]);

  const subjectsInPdfs = useMemo(() => {
    const ids = [...new Set(categoryPdfs.map(p => p.subjectId).filter(Boolean))];
    return ids.map(id => ({ id, name: allSubjects.find(s => s.id === id)?.subjectName || id }));
  }, [categoryPdfs, allSubjects]);

  const classMap = useMemo(() => Object.fromEntries(allClasses.map(c => [c.id, c.className])), [allClasses]);
  const subjectMap = useMemo(() => Object.fromEntries(allSubjects.map(s => [s.id, s.subjectName])), [allSubjects]);

  const filteredPdfs = useMemo(() => {
    return categoryPdfs.filter(p => {
      if (filterClass !== 'all' && p.classId !== filterClass) return false;
      if (filterSubject !== 'all' && p.subjectId !== filterSubject) return false;
      return true;
    });
  }, [categoryPdfs, filterClass, filterSubject]);

  const formatBytes = (bytes) => {
    if (!bytes) return '—';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const hasFilters = filterClass !== 'all' || filterSubject !== 'all';

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Categories</h1>
          <p className="text-muted-foreground">
            {selectedCategory
              ? `Showing PDFs in "${selectedCategory.categoryName}"`
              : 'Click a category to view its mapped PDF files.'}
          </p>
        </div>
        <div className="flex items-center gap-4 w-full md:w-auto">
          {!selectedCategory && (
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search categories..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          )}
          <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" /> Add Category</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingId ? 'Edit Category' : 'New Category'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Category Name</Label>
                  <Input
                    required
                    value={formData.categoryName}
                    onChange={e => setFormData({ ...formData, categoryName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category Type</Label>
                  <Select
                    required
                    value={formData.categoryType}
                    onValueChange={v => setFormData({ ...formData, categoryType: v })}
                  >
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Grade 1-5">Grade 1-5</SelectItem>
                      <SelectItem value="Grade 6-10">Grade 6-10</SelectItem>
                      <SelectItem value="academic">Academic</SelectItem>
                      <SelectItem value="extracurricular">Extracurricular</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <Button type="submit" className="w-full">{editingId ? 'Update' : 'Create'}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Two-panel layout */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: Category list */}
        <div className={`${selectedCategory ? 'hidden lg:block lg:w-1/3' : 'w-full'}`}>
          {loading ? (
            <LoadingSpinner />
          ) : (
            <div className="border rounded-xl bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-center">PDFs</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCategories.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        No categories found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCategories.map(category => (
                      <TableRow
                        key={category.id}
                        className={`cursor-pointer hover:bg-muted/40 transition-colors ${selectedCategory?.id === category.id ? 'bg-primary/5 border-l-2 border-l-primary' : ''}`}
                        onClick={() => handleCategoryClick(category)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FolderOpen className="w-4 h-4 text-primary shrink-0" />
                            <span className="font-medium">{category.categoryName}</span>
                          </div>
                          {category.categoryCode && (
                            <span className="text-xs text-muted-foreground font-mono ml-6">{category.categoryCode}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{category.categoryType}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className="text-xs">
                            {category.pdfCount ?? 0}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => openEdit(category, e)}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={(e) => handleDelete(category.id, e)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Right: PDF panel */}
        {selectedCategory && (
          <div className="flex-1">
            <Card className="border-border/50">
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setSelectedCategory(null)}>
                      <ArrowLeft className="w-4 h-4 mr-1" /> Back
                    </Button>
                    <div>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <FolderOpen className="w-5 h-5 text-primary" />
                        {selectedCategory.categoryName}
                      </CardTitle>
                      <CardDescription>
                        {selectedCategory.categoryType}
                        {selectedCategory.categoryCode && ` · ${selectedCategory.categoryCode}`}
                        {' · '}
                        <span className="font-medium text-foreground">{categoryPdfs.length} PDF{categoryPdfs.length !== 1 ? 's' : ''}</span>
                        {hasFilters && <span className="ml-1 text-primary">({filteredPdfs.length} shown)</span>}
                      </CardDescription>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="hidden lg:flex" onClick={() => setSelectedCategory(null)}>
                    <ArrowLeft className="w-4 h-4 mr-1" /> Back to list
                  </Button>
                </div>

                {/* Class / Subject filter dropdowns */}
                {!pdfsLoading && categoryPdfs.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border/30">
                    <Select value={filterClass} onValueChange={v => { setFilterClass(v); setFilterSubject('all'); }}>
                      <SelectTrigger className="h-8 w-44 text-xs">
                        <GraduationCap className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                        <SelectValue placeholder="All Classes" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Classes</SelectItem>
                        {classesInPdfs.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={filterSubject} onValueChange={setFilterSubject}>
                      <SelectTrigger className="h-8 w-44 text-xs">
                        <BookOpen className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                        <SelectValue placeholder="All Subjects" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Subjects</SelectItem>
                        {subjectsInPdfs.map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {hasFilters && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-xs text-muted-foreground"
                        onClick={() => { setFilterClass('all'); setFilterSubject('all'); }}
                      >
                        <X className="w-3.5 h-3.5 mr-1" /> Clear filters
                      </Button>
                    )}
                  </div>
                )}
              </CardHeader>
              <CardContent className="p-0">
                {pdfsLoading ? (
                  <div className="py-12 flex justify-center">
                    <LoadingSpinner />
                  </div>
                ) : filteredPdfs.length === 0 ? (
                  <div className="py-16 text-center">
                    <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="font-medium text-muted-foreground">
                      {hasFilters ? 'No PDFs match the selected filters' : 'No PDFs in this category'}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {hasFilters ? 'Try a different class or subject filter.' : 'Upload PDFs and assign them to this category.'}
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>PDF ID</TableHead>
                        <TableHead>File Name</TableHead>
                        <TableHead>Class</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Uploaded</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPdfs.map(pdf => (
                        <TableRow key={pdf.id} className="hover:bg-muted/30">
                          <TableCell>
                            <span className="font-mono text-xs text-muted-foreground">
                              {getPdfCode(pdf) ?? '—'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-rose-500 shrink-0" />
                              <span className="font-medium text-sm truncate max-w-[180px]" title={pdf.fileName}>
                                {pdf.fileName}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {pdf.classId
                              ? <Badge variant="outline" className="text-xs gap-1"><GraduationCap className="w-3 h-3" />{classMap[pdf.classId] || pdf.subCategoryName || '—'}</Badge>
                              : <span className="text-sm text-muted-foreground">{pdf.subCategoryName || '—'}</span>
                            }
                          </TableCell>
                          <TableCell>
                            {pdf.subjectId
                              ? <Badge variant="outline" className="text-xs gap-1"><BookOpen className="w-3 h-3" />{subjectMap[pdf.subjectId]}</Badge>
                              : <span className="text-sm text-muted-foreground">—</span>
                            }
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={pdf.status === 'approved' ? 'default' : pdf.status === 'rejected' ? 'destructive' : 'secondary'}
                              className="text-xs capitalize"
                            >
                              {pdf.status || 'pending'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatBytes(pdf.fileSize)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {pdf.created ? new Date(pdf.created).toLocaleDateString() : '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoriesManagement;
