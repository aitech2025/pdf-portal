
import React, { useState, useEffect } from 'react';
import pb from '@/lib/apiClient';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Download, FolderTree, ArrowRight, FileText, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import PageTransition from '@/components/PageTransition.jsx';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';

const SchoolPortal = () => {
  const { currentUser } = useAuth();
  const [stats, setStats] = useState(null);
  const [categories, setCategories] = useState([]);
  const [recentDownloads, setRecentDownloads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser?.schoolId) return;
      try {
        const [cats, downloads, pdfs] = await Promise.all([
          pb.collection('categories').getList(1, 6, { filter: 'isActive=true', sort: 'categoryName', $autoCancel: false }),
          pb.collection('downloadLogs').getList(1, 4, { filter: `schoolId="${currentUser.schoolId}"`, expand: 'pdfId,categoryId', sort: '-created', $autoCancel: false }),
          pb.collection('pdfs').getList(1, 1, { $autoCancel: false })
        ]);

        setStats({
          availablePdfs: pdfs.totalItems,
          myDownloads: downloads.totalItems,
          activeCategories: cats.totalItems
        });
        setCategories(cats.items);
        setRecentDownloads(downloads.items);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [currentUser]);

  return (
    <PageTransition>
      {/* Premium Hero Section */}
      <div className="relative rounded-[var(--radius-xl)] bg-gradient-primary overflow-hidden mb-10 p-8 md:p-12 shadow-soft-lg text-white">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/always-grey.png')] opacity-20 mix-blend-overlay"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <h1 className="text-3xl md:text-5xl font-bold font-poppins mb-3 text-white">Resource Portal</h1>
            <p className="text-white/90 text-lg max-w-xl">Discover, download, and share high-quality educational materials curated for your institution.</p>
          </div>
          <div className="w-full md:w-auto min-w-[300px]">
            <Input 
              icon={Search}
              placeholder="Search for materials..." 
              className="bg-white/20 border-white/30 text-white placeholder:text-white/60 focus-visible:bg-white focus-visible:text-foreground h-12"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-[var(--radius-lg)]" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          <Card className="border-none shadow-soft-md hover:shadow-soft-lg transition-base bg-card">
            <CardContent className="p-6 flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                <FileText className="w-7 h-7 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Resources</p>
                <h3 className="text-3xl font-poppins font-bold text-foreground">{stats?.availablePdfs || 0}</h3>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-soft-md hover:shadow-soft-lg transition-base bg-card">
            <CardContent className="p-6 flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-secondary/10 flex items-center justify-center shrink-0">
                <FolderTree className="w-7 h-7 text-secondary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Categories</p>
                <h3 className="text-3xl font-poppins font-bold text-foreground">{stats?.activeCategories || 0}</h3>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-soft-md hover:shadow-soft-lg transition-base bg-card">
            <CardContent className="p-6 flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-success/10 flex items-center justify-center shrink-0">
                <Download className="w-7 h-7 text-success" />
              </div>
              <div>
                <p className="text-sm font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Downloads</p>
                <h3 className="text-3xl font-poppins font-bold text-foreground">{stats?.myDownloads || 0}</h3>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-poppins font-bold text-foreground">Featured Categories</h2>
            <Link to="/school/portal/browse" className="text-sm font-semibold text-primary hover:text-primary/80 transition-base flex items-center">
              View Directory <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {categories.length === 0 && !loading ? (
              <div className="col-span-2 p-10 text-center border border-dashed rounded-[var(--radius-lg)] bg-card shadow-soft-sm">
                <BookOpen className="w-12 h-12 mx-auto text-muted-foreground opacity-30 mb-3" />
                <p className="text-muted-foreground text-lg">No categories available at the moment.</p>
              </div>
            ) : (
              categories.map(cat => (
                <Link key={cat.id} to={`/school/portal/category/${cat.id}`}>
                  <Card className="h-full shadow-soft-sm hover:shadow-soft-lg transition-base border-border/50 group cursor-pointer overflow-hidden relative bg-card">
                    <div className="absolute -right-6 -top-6 w-24 h-24 bg-primary/5 rounded-full blur-xl group-hover:bg-primary/10 transition-base"></div>
                    <CardHeader className="pb-3 relative z-10">
                      <div className="flex justify-between items-start mb-4">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                          <BookOpen className="w-6 h-6" />
                        </div>
                        <Badge variant="secondary" className="font-semibold">{cat.categoryType}</Badge>
                      </div>
                      <CardTitle className="text-xl group-hover:text-primary transition-colors">{cat.categoryName}</CardTitle>
                    </CardHeader>
                    <CardContent className="relative z-10">
                      <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">{cat.description || 'Explore educational resources in this targeted category.'}</p>
                    </CardContent>
                  </Card>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-2xl font-poppins font-bold text-foreground">Recent Downloads</h2>
          <Card className="shadow-soft-md border-border/50 bg-card overflow-hidden">
            <CardContent className="p-0">
              {recentDownloads.length === 0 ? (
                <div className="p-10 text-center text-muted-foreground">
                  <Download className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p className="font-medium text-foreground">No downloads yet</p>
                  <p className="text-sm mt-1">Your recent activity will appear here.</p>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {recentDownloads.map(log => (
                    <div key={log.id} className="p-4 hover:bg-muted/30 transition-base flex items-start gap-4">
                      <div className="w-10 h-10 rounded-[var(--radius-sm)] bg-rose-500/10 flex items-center justify-center shrink-0 mt-0.5">
                        <FileText className="w-5 h-5 text-rose-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate" title={log.expand?.pdfId?.fileName}>
                          {log.expand?.pdfId?.fileName || 'Unknown File'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 font-medium">
                          {new Date(log.created).toLocaleDateString()} • {log.expand?.categoryId?.categoryName || 'General'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageTransition>
  );
};

export default SchoolPortal;
