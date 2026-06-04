
import React, { useState, useEffect, useMemo } from 'react';
import pb from '@/lib/apiClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  FileText, BookOpen, FolderTree, UploadCloud, ArrowRight, HardDrive, BarChart3,
  Eye, GraduationCap, Search
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PageTransition from '@/components/PageTransition.jsx';
import { Skeleton } from '@/components/ui/skeleton';
import EnhancedPDFViewer from '@/components/EnhancedPDFViewer.jsx';
import VersionHistoryModal from '@/components/admin/pdfs/VersionHistoryModal.jsx';
import { formatBytes, cn, getPdfCode } from '@/lib/utils';

const ContentDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [allPdfs, setAllPdfs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [allClasses, setAllClasses] = useState([]);
  const [allSubjects, setAllSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPdf, setSelectedPdf] = useState(null);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [contentSearch, setContentSearch] = useState('');

  const fetchData = async () => {
    try {
      const [pdfsRes, catsRes, classesRes, subjectsRes] = await Promise.all([
        pb.fetch('/pdfs', 'GET', null, { per_page: 300, sort: '-created' }),
        pb.fetch('/categories', 'GET', null, { per_page: 100, sort: 'displayOrder' }),
        pb.fetch('/masterClasses', 'GET'),
        pb.fetch('/masterSubjects', 'GET'),
      ]);

      const pdfs = pdfsRes?.items ?? [];
      const cats = catsRes?.items ?? [];

      setAllPdfs(pdfs);
      setCategories(cats);
      setAllClasses(classesRes?.items ?? []);
      setAllSubjects(subjectsRes?.items ?? []);

      const totalBytes = pdfs.reduce((s, p) => s + (p.fileSize || 0), 0);
      setStats({
        totalPdfs: pdfsRes?.totalItems ?? pdfs.length,
        totalCategories: catsRes?.totalItems ?? cats.length,
        storageUsage: formatBytes(totalBytes) || `${(pdfs.length * 2.4).toFixed(1)} MB`
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const classMap = useMemo(() =>
    Object.fromEntries(allClasses.map(c => [c.id, c.className])),
    [allClasses]
  );

  const subjectMap = useMemo(() =>
    Object.fromEntries(allSubjects.map(s => [s.id, s.subjectName])),
    [allSubjects]
  );

  const categoryMap = useMemo(() =>
    Object.fromEntries(categories.map(c => [c.id, c.categoryName])),
    [categories]
  );

  const filteredPdfs = useMemo(() => {
    if (!contentSearch.trim()) return allPdfs;
    const q = contentSearch.toLowerCase();
    return allPdfs.filter(p =>
      p.fileName?.toLowerCase().includes(q) ||
      classMap[p.classId]?.toLowerCase().includes(q) ||
      subjectMap[p.subjectId]?.toLowerCase().includes(q) ||
      categoryMap[p.categoryId]?.toLowerCase().includes(q) ||
      (p.subCategoryName || '').toLowerCase().includes(q)
    );
  }, [allPdfs, contentSearch, classMap, subjectMap, categoryMap]);

  const StatCard = ({ title, value, icon: Icon, colorClass, bgClass }) => (
    <Card className="shadow-soft-sm hover:shadow-soft-md transition-base border-none overflow-hidden relative">
      <div className={`absolute top-0 right-0 w-24 h-24 rounded-full ${bgClass} blur-2xl -mr-6 -mt-6 opacity-60`}></div>
      <CardContent className="p-6 flex items-center gap-5">
        <div className={`w-14 h-14 rounded-[var(--radius-xl)] ${bgClass} flex items-center justify-center shrink-0`}>
          <Icon className={`w-7 h-7 ${colorClass}`} />
        </div>
        <div className="z-10">
          <p className="text-sm font-semibold text-muted-foreground mb-1">{title}</p>
          <h3 className="text-3xl font-poppins font-bold text-foreground">{value}</h3>
        </div>
      </CardContent>
    </Card>
  );

  if (selectedPdf && window.innerWidth < 1024) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col h-screen">
        <EnhancedPDFViewer
          pdfRecord={selectedPdf}
          onClose={() => setSelectedPdf(null)}
          className="flex-1 rounded-none border-none shadow-none"
        />
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-poppins font-bold text-foreground">Content Library</h1>
          <p className="text-muted-foreground mt-1">Manage and organize your educational materials.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => navigate('/admin/analytics')} className="shadow-soft-sm bg-card">
            <BarChart3 className="w-4 h-4 mr-2" /> Reports
          </Button>
          <Button variant="gradient" onClick={() => navigate('/admin/pdf-upload')} className="shadow-soft-md">
            <UploadCloud className="w-4 h-4 mr-2" /> Upload
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-[var(--radius-lg)]" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard title="Total PDFs" value={stats?.totalPdfs || 0} icon={FileText} colorClass="text-primary" bgClass="bg-primary/10" />
          <StatCard title="Categories" value={stats?.totalCategories || 0} icon={BookOpen} colorClass="text-secondary" bgClass="bg-secondary/10" />
          <StatCard title="Storage Used" value={stats?.storageUsage || '0 MB'} icon={HardDrive} colorClass="text-accent" bgClass="bg-accent/10" />
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-8 min-h-[600px]">
        {/* Left: Content table */}
        <div className={cn("flex flex-col gap-8 transition-all duration-300", selectedPdf ? "lg:w-[40%]" : "w-full")}>
          <Card className="shadow-soft-sm border-border/50 flex-1 flex flex-col overflow-hidden">
            <CardHeader className="shrink-0 bg-card z-10 border-b border-border/30 pb-3">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <CardTitle>Content</CardTitle>
                  <CardDescription>
                    {loading ? 'Loading…' : `${filteredPdfs.length} of ${allPdfs.length} PDF${allPdfs.length !== 1 ? 's' : ''}`}
                  </CardDescription>
                </div>
                {!selectedPdf && (
                  <Button variant="ghost" size="sm" onClick={() => navigate('/admin/pdf-upload')} className="text-primary hover:text-primary">
                    Upload <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                )}
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Search by name, class, subject or program…"
                  value={contentSearch}
                  onChange={e => setContentSearch(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-y-auto flex-1">
              {loading ? (
                <div className="p-4 space-y-2">
                  {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : filteredPdfs.length === 0 ? (
                <div className="text-center py-16 px-4">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-40" />
                  <p className="text-muted-foreground font-medium">
                    {allPdfs.length === 0 ? 'No PDFs uploaded yet.' : 'No PDFs match your search.'}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/20 hover:bg-muted/20">
                      <TableHead>PDF File</TableHead>
                      {!selectedPdf && <TableHead className="hidden sm:table-cell">Class</TableHead>}
                      {!selectedPdf && <TableHead className="hidden md:table-cell">Subject</TableHead>}
                      {!selectedPdf && <TableHead className="hidden lg:table-cell">Program</TableHead>}
                      <TableHead className="w-16 text-center">View</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPdfs.map(pdf => {
                      const className = classMap[pdf.classId] || pdf.subCategoryName || '—';
                      const subjectName = subjectMap[pdf.subjectId] || '—';
                      const programName = categoryMap[pdf.categoryId] || pdf.categoryName || '—';
                      const isSelected = selectedPdf?.id === pdf.id;

                      return (
                        <TableRow
                          key={pdf.id}
                          className={cn(
                            "cursor-pointer transition-colors",
                            isSelected ? "bg-primary/5 border-l-2 border-l-primary" : "hover:bg-muted/30"
                          )}
                          onClick={() => setSelectedPdf(pdf)}
                        >
                          <TableCell className="max-w-0">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className={cn(
                                "w-7 h-7 rounded-md flex items-center justify-center shrink-0",
                                isSelected ? "bg-primary/10" : "bg-rose-500/10"
                              )}>
                                <FileText className={cn("w-3.5 h-3.5", isSelected ? "text-primary" : "text-rose-500")} />
                              </div>
                              <div className="min-w-0">
                                <p className={cn(
                                  "text-sm font-medium truncate",
                                  isSelected ? "text-primary" : "text-foreground"
                                )}>
                                  {pdf.fileName}
                                </p>
                                <p className="text-xs text-muted-foreground font-mono truncate">
                                  {getPdfCode(pdf) ?? ''}{pdf.fileSize ? ` · ${formatBytes(pdf.fileSize)}` : ''}
                                </p>
                                {selectedPdf && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {classMap[pdf.classId] && (
                                      <Badge variant="outline" className="text-[10px] h-4 gap-1 font-normal">
                                        <GraduationCap className="w-2.5 h-2.5" />{classMap[pdf.classId]}
                                      </Badge>
                                    )}
                                    {subjectMap[pdf.subjectId] && (
                                      <Badge variant="outline" className="text-[10px] h-4 gap-1 font-normal">
                                        <BookOpen className="w-2.5 h-2.5" />{subjectMap[pdf.subjectId]}
                                      </Badge>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          {!selectedPdf && (
                            <TableCell className="hidden sm:table-cell">
                              {classMap[pdf.classId]
                                ? <Badge variant="outline" className="text-xs gap-1"><GraduationCap className="w-3 h-3" />{classMap[pdf.classId]}</Badge>
                                : <span className="text-xs text-muted-foreground">{pdf.subCategoryName || '—'}</span>
                              }
                            </TableCell>
                          )}
                          {!selectedPdf && (
                            <TableCell className="hidden md:table-cell">
                              {subjectMap[pdf.subjectId]
                                ? <Badge variant="outline" className="text-xs gap-1"><BookOpen className="w-3 h-3" />{subjectMap[pdf.subjectId]}</Badge>
                                : <span className="text-xs text-muted-foreground">—</span>
                              }
                            </TableCell>
                          )}
                          {!selectedPdf && (
                            <TableCell className="hidden lg:table-cell">
                              <span className="text-xs text-muted-foreground">{programName}</span>
                            </TableCell>
                          )}
                          <TableCell className="text-center" onClick={e => e.stopPropagation()}>
                            <Button
                              variant={isSelected ? "default" : "ghost"}
                              size="icon"
                              className="h-7 w-7"
                              title="View PDF"
                              onClick={() => setSelectedPdf(isSelected ? null : pdf)}
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {!selectedPdf && (
            <Card className="shadow-soft-sm border-border/50 bg-card h-fit">
              <CardHeader className="pb-4">
                <CardTitle>Categories Structure</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {categories.slice(0, 4).map(cat => (
                  <div key={cat.id} className="flex items-center justify-between p-3 rounded-[var(--radius-md)] border border-transparent hover:border-border/50 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-[var(--radius-sm)] bg-secondary/20 flex items-center justify-center text-secondary-foreground">
                        <FolderTree className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-foreground">{cat.categoryName}</p>
                        <p className="text-xs text-muted-foreground">{cat.categoryType}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => navigate('/admin/categories-management')} className="h-8 w-8 text-muted-foreground hover:text-foreground">
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: PDF viewer */}
        <div className={cn(
          "hidden lg:flex transition-all duration-300",
          selectedPdf ? "lg:flex-1 h-auto min-h-[600px] opacity-100" : "w-0 opacity-0 overflow-hidden"
        )}>
          {selectedPdf && (
            <EnhancedPDFViewer
              pdfRecord={selectedPdf}
              onClose={() => setSelectedPdf(null)}
              className="h-full w-full"
            />
          )}
        </div>
      </div>

      <VersionHistoryModal
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        pdf={selectedPdf}
        onVersionChanged={fetchData}
      />
    </PageTransition>
  );
};

export default ContentDashboard;
