import React, { useEffect, useState } from 'react';
import pb from '@/lib/apiClient';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import PageTransition from '@/components/PageTransition.jsx';
import { BookOpen, Download, FileText, Bell, FolderTree, ArrowRight } from 'lucide-react';

const SchoolDashboard = () => {
  const { currentUser } = useAuth();
  const schoolId = currentUser?.schoolId ?? currentUser?.school_id;
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [categories, setCategories] = useState([]);
  const [recentDownloads, setRecentDownloads] = useState([]);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!schoolId) return;
    const load = async () => {
      try {
        const [analytics, catsRes, downloadsRes, notifRes] = await Promise.all([
          pb.fetch('/analytics/school', 'GET'),
          fetch(`/api/schools/${schoolId}/categories`, {
            headers: { Authorization: `Bearer ${pb.authStore.token}` }
          }).then((r) => r.json()),
          pb.collection('downloadLogs').getList(1, 5, { sort: '-downloadedAt', $autoCancel: false }),
          pb.collection('notifications').getList(1, 5, { sort: '-created', $autoCancel: false })
        ]);

        setStats(analytics);
        setCategories(catsRes.items || []);
        setRecentDownloads(downloadsRes.items || []);
        setNotifications(notifRes.items || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [schoolId]);

  if (loading) {
    return (
      <PageTransition>
        <Skeleton className="h-10 w-64 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="mb-8">
        <h1 className="text-3xl font-poppins font-bold">School Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back, {currentUser?.name}. Access is limited to categories assigned by the platform admin.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Assigned categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.assigned_categories ?? categories.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Available PDFs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.available_pdfs ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total downloads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.recent_downloads ?? recentDownloads.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{notifications.filter((n) => !n.read).length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <FolderTree className="w-5 h-5" /> Your program enrollment (categories)
            </h2>
            <Link to="/school/portal/browse">
              <Button variant="outline" size="sm">
                Browse all <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categories.length === 0 ? (
              <Card className="col-span-2">
                <CardContent className="py-10 text-center text-muted-foreground">
                  No categories assigned yet. Contact your platform administrator.
                </CardContent>
              </Card>
            ) : (
              categories.map((cat) => (
                <Card key={cat.categoryId || cat.id}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{cat.categoryName}</CardTitle>
                      <Badge variant="secondary">{cat.categoryType}</Badge>
                    </div>
                    {cat.categoryCode && (
                      <CardDescription className="font-mono text-xs">{cat.categoryCode}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <Link to="/school/portal/browse">
                      <Button variant="ghost" size="sm" className="w-full">
                        <BookOpen className="w-4 h-4 mr-2" /> Open materials
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Bell className="w-4 h-4" /> Messages
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {notifications.length === 0 ? (
                <p className="text-sm text-muted-foreground">No messages yet.</p>
              ) : (
                notifications.map((n) => (
                  <div key={n.id} className="border-b pb-2 last:border-0">
                    <p className="text-sm font-medium">{n.subject}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                  </div>
                ))
              )}
              <Link to="/notifications">
                <Button variant="outline" size="sm" className="w-full mt-2">
                  View all notifications
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Download className="w-4 h-4" /> Recent downloads
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentDownloads.length === 0 ? (
                <p className="text-sm text-muted-foreground">No downloads yet.</p>
              ) : (
                recentDownloads.map((log) => (
                  <div key={log.id} className="flex items-center gap-2 text-sm">
                    <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="truncate">PDF download</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageTransition>
  );
};

export default SchoolDashboard;
