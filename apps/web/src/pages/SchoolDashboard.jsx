import React, { useEffect, useState, useMemo } from 'react';
import pb from '@/lib/apiClient';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import PageTransition from '@/components/PageTransition.jsx';
import PDFViewer from '@/components/PDFViewer.jsx';
import {
  BookOpen,
  Download,
  FileText,
  Bell,
  FolderTree,
  ArrowUpRight,
  Eye,
  TrendingUp,
  Sparkles,
  Bookmark,
  CalendarDays
} from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const formatBytes = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

const SchoolDashboard = () => {
  const { currentUser } = useAuth();
  const schoolId = currentUser?.schoolId ?? currentUser?.school_id;
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [categories, setCategories] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [currentPdf, setCurrentPdf] = useState(null);

  useEffect(() => {
    if (!schoolId) {
      setLoading(false);
      return;
    }
    const load = async () => {
      try {
        const [analytics, catsRes, notifRes] = await Promise.all([
          pb.fetch('/analytics/school', 'GET').catch(() => null),
          fetch(`/api/schools/${schoolId}/categories`, {
            headers: { Authorization: `Bearer ${pb.authStore.token}` }
          }).then((r) => (r.ok ? r.json() : { items: [] })).catch(() => ({ items: [] })),
          pb.collection('notifications').getList(1, 5, { sort: '-created', $autoCancel: false }).catch(() => ({ items: [] }))
        ]);
        setStats(analytics);
        setCategories(catsRes.items || []);
        setNotifications(notifRes.items || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [schoolId]);

  const handleDownloadSingle = async (pdf) => {
    try {
      const res = await fetch(`/api/pdfs/${pdf.id}/download`, {
        headers: { Authorization: `Bearer ${pb.authStore.token}` }
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = pdf.fileName || 'document.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(link.href);
      toast.success('Download complete');
    } catch {
      toast.error('Download failed');
    }
  };

  const recentUploads = stats?.recent_uploads ?? stats?.recentUploads ?? [];
  const downloadsByCategory = stats?.downloads_by_category ?? stats?.downloadsByCategory ?? [];

  const kpis = useMemo(() => ([
    {
      title: 'Assigned categories',
      value: stats?.assigned_categories ?? stats?.assignedCategories ?? categories.length,
      icon: FolderTree,
      bg: 'bg-primary/10',
      fg: 'text-primary',
      glow: 'bg-primary/25'
    },
    {
      title: 'Available PDFs',
      value: stats?.available_pdfs ?? stats?.availablePdfs ?? 0,
      icon: FileText,
      bg: 'bg-success/10',
      fg: 'text-success',
      glow: 'bg-success/20'
    },
    {
      title: 'My downloads',
      value: stats?.my_downloads ?? stats?.myDownloads ?? 0,
      icon: Download,
      bg: 'bg-warning/10',
      fg: 'text-warning-foreground',
      glow: 'bg-warning/25'
    },
    {
      title: 'New this week',
      value: stats?.new_pdfs_last_7d ?? stats?.newPdfsLast7d ?? 0,
      icon: Sparkles,
      bg: 'bg-accent/10',
      fg: 'text-accent',
      glow: 'bg-accent/20'
    }
  ]), [stats, categories.length]);

  if (loading) {
    return (
      <PageTransition>
        <Skeleton className="h-10 w-64 mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <Skeleton className="h-96 rounded-xl xl:col-span-2" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <section className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <p className="text-xs uppercase font-semibold tracking-[0.18em] text-primary mb-2">
            School portal
          </p>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
            Welcome back{currentUser?.name ? `, ${currentUser.name.split(' ')[0]}` : ''}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Your library access is curated by your platform administrator.
          </p>
        </div>
        <Link to="/school/portal/browse" className="self-stretch sm:self-auto">
          <Button variant="gradient" className="w-full sm:w-auto">
            <BookOpen className="w-4 h-4 mr-2" /> Open Content Library
          </Button>
        </Link>
      </section>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
        {kpis.map((k, idx) => {
          const Icon = k.icon;
          return (
            <motion.div key={idx} whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
              <Card className="shadow-soft-sm hover:shadow-soft-md transition-base border-border/60 overflow-hidden relative group h-full">
                <div className={cn('absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-60 group-hover:opacity-90 transition-opacity', k.glow || k.bg)} />
                <CardContent className="p-4 sm:p-6 relative">
                  <div className={cn('w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center mb-4', k.bg)}>
                    <Icon className={cn('w-5 h-5', k.fg)} />
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-1 tabular-nums leading-none">{k.value}</h3>
                  <p className="text-[12px] sm:text-sm font-medium text-muted-foreground mt-1.5">{k.title}</p>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <Card className="shadow-soft-sm border-border/50">
            <CardHeader className="pb-4 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" /> Recent additions
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Latest PDFs across your assigned categories.</p>
              </div>
              <Link to="/school/portal/browse">
                <Button variant="ghost" size="sm" className="text-xs">
                  Browse all <ArrowUpRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentUploads.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground font-medium">No new content yet.</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Newly approved PDFs in your categories will appear here.
                  </p>
                </div>
              ) : (
                recentUploads.map((pdf) => (
                  <motion.div
                    key={pdf.id}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className="flex items-start gap-4 p-3 rounded-[var(--radius-md)] border border-border/50 hover:border-primary/30 hover:shadow-soft-sm transition-all group cursor-pointer"
                    onClick={() => { setCurrentPdf(pdf); setViewerOpen(true); }}
                  >
                    <div className="w-10 h-10 rounded-[var(--radius-sm)] bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge variant="outline" className="text-[10px] h-4 font-mono">
                          {pdf.pdfId || pdf.pdf_id || 'PDF'}
                        </Badge>
                        {pdf.categoryName && (
                          <Badge variant="secondary" className="text-[10px] h-4 font-normal">
                            {pdf.categoryName}
                          </Badge>
                        )}
                        {pdf.subCategoryName && (
                          <span className="text-[10px] text-muted-foreground">{pdf.subCategoryName}</span>
                        )}
                      </div>
                      <p className="text-sm font-semibold truncate text-foreground group-hover:text-primary transition-colors">
                        {pdf.fileName}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <CalendarDays className="w-3 h-3" />
                          {formatDate(pdf.created)}
                        </span>
                        <span className="font-medium">{formatBytes(pdf.fileSize)}</span>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => { e.stopPropagation(); setCurrentPdf(pdf); setViewerOpen(true); }}
                        title="Preview"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => { e.stopPropagation(); handleDownloadSingle(pdf); }}
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </motion.div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="shadow-soft-sm border-border/50">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" /> Downloads by category
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Where your school is engaging the most.
              </p>
            </CardHeader>
            <CardContent>
              {downloadsByCategory.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No download activity yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {(() => {
                    const max = Math.max(...downloadsByCategory.map((d) => d.count), 1);
                    return downloadsByCategory.map((d) => (
                      <div key={d.category_id || d.categoryId} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium truncate pr-2">{d.category_name || d.categoryName}</span>
                          <span className="text-muted-foreground tabular-nums">{d.count}</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${(d.count / max) * 100}%` }}
                          />
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="shadow-soft-sm border-border/50">
            <CardHeader className="pb-4 flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FolderTree className="w-5 h-5 text-primary" /> My categories
              </CardTitle>
              <Badge variant="secondary">{categories.length}</Badge>
            </CardHeader>
            <CardContent className="space-y-2">
              {categories.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No categories assigned yet. Contact your platform admin.
                </p>
              ) : (
                categories.slice(0, 6).map((cat) => (
                  <Link
                    key={cat.categoryId || cat.id}
                    to="/school/portal/browse"
                    className="flex items-center justify-between p-3 rounded-[var(--radius-md)] border border-transparent hover:border-border/50 hover:bg-muted/30 transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-[var(--radius-sm)] bg-secondary/20 flex items-center justify-center text-secondary-foreground shrink-0">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{cat.categoryName}</p>
                        <p className="text-xs text-muted-foreground truncate">{cat.categoryType || 'Program'}</p>
                      </div>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-primary shrink-0" />
                  </Link>
                ))
              )}
              {categories.length > 6 && (
                <Link to="/school/portal/browse">
                  <Button variant="outline" size="sm" className="w-full mt-2">
                    View all {categories.length}
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-soft-sm border-border/50">
            <CardHeader className="pb-4 flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" /> Messages
              </CardTitle>
              <Badge variant={notifications.filter((n) => !n.read).length ? 'default' : 'secondary'}>
                {notifications.filter((n) => !n.read).length} new
              </Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              {notifications.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No messages yet.</p>
              ) : (
                notifications.slice(0, 4).map((n) => (
                  <div key={n.id} className="border-b last:border-0 pb-3 last:pb-0">
                    <div className="flex items-start gap-2">
                      <span className={cn('mt-1 w-1.5 h-1.5 rounded-full shrink-0', n.read ? 'bg-muted-foreground/30' : 'bg-primary')} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{n.subject || n.title || 'Notification'}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
              <Link to="/notifications">
                <Button variant="outline" size="sm" className="w-full">
                  View all messages
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="shadow-soft-sm border-border/50">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Quick actions</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              <Link to="/school/portal/browse">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <BookOpen className="w-4 h-4 mr-2" /> Library
                </Button>
              </Link>
              <Link to="/school/bookmarks">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Bookmark className="w-4 h-4 mr-2" /> Saved
                </Button>
              </Link>
              <Link to="/notifications">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Bell className="w-4 h-4 mr-2" /> Messages
                </Button>
              </Link>
              <Link to="/school/analytics">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <TrendingUp className="w-4 h-4 mr-2" /> Analytics
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {currentPdf && (
        <PDFViewer
          isOpen={viewerOpen}
          onClose={() => {
            setViewerOpen(false);
            setTimeout(() => setCurrentPdf(null), 300);
          }}
          pdfId={currentPdf.id}
          title={`${currentPdf.categoryName ? `[${currentPdf.categoryName}] ` : ''}${currentPdf.fileName}`}
          onDownload={() => handleDownloadSingle(currentPdf)}
        />
      )}
    </PageTransition>
  );
};

export default SchoolDashboard;
