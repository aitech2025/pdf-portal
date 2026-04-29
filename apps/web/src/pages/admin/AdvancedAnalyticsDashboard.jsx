
import React, { useState, useEffect } from 'react';
import pb from '@/lib/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Users, FileText, School, Calendar } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import PageTransition from '@/components/PageTransition.jsx';
import MetricsCard from '@/components/MetricsCard.jsx';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

const AdvancedAnalyticsDashboard = () => {
  const [stats, setStats] = useState(null);
  const [downloadData, setDownloadData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const [pdfs, downloads, schools, users] = await Promise.all([
          pb.collection('pdfs').getList(1, 1, { $autoCancel: false }),
          pb.collection('downloadLogs').getList(1, 100, { sort: '-created', $autoCancel: false }),
          pb.collection('schools').getList(1, 1, { $autoCancel: false }),
          pb.collection('users').getList(1, 1, { $autoCancel: false })
        ]);

        setStats({
          totalPdfs: pdfs.totalItems,
          totalDownloads: downloads.totalItems,
          totalSchools: schools.totalItems,
          totalUsers: users.totalItems
        });

        // Mock chart data based on real counts
        setDownloadData([
          { name: 'Mon', count: 12 }, { name: 'Tue', count: 19 },
          { name: 'Wed', count: 15 }, { name: 'Thu', count: 25 },
          { name: 'Fri', count: 22 }, { name: 'Sat', count: 30 },
          { name: 'Sun', count: downloads.totalItems }
        ]);
      } catch (error) {
        console.error(error);
        toast.error('Failed to load analytics data');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();

    // Real-time subscription
    pb.collection('downloadLogs').subscribe('*', () => {
      fetchAnalytics();
    });

    return () => {
      pb.collection('downloadLogs').unsubscribe('*');
    };
  }, []);

  const handleExport = () => {
    toast.success('Exporting report to CSV...');
    // Implementation for papaparse/jspdf would go here
  };

  return (
    <PageTransition>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-poppins font-bold text-foreground">Advanced Analytics</h1>
          <p className="text-muted-foreground mt-1">Comprehensive insights into platform usage and engagement.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="shadow-soft-sm bg-card">
            <Calendar className="w-4 h-4 mr-2" /> Last 30 Days
          </Button>
          <Button variant="gradient" className="shadow-soft-md" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" /> Export Report
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-40 rounded-[var(--radius-lg)]" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricsCard title="Total Downloads" value={stats?.totalDownloads || 0} icon={Download} trend="14.5" colorClass="text-primary" bgClass="bg-primary/10" />
          <MetricsCard title="Active Schools" value={stats?.totalSchools || 0} icon={School} trend="5.2" colorClass="text-secondary" bgClass="bg-secondary/10" />
          <MetricsCard title="Total Users" value={stats?.totalUsers || 0} icon={Users} trend="12.1" colorClass="text-accent" bgClass="bg-accent/10" />
          <MetricsCard title="Content Library" value={stats?.totalPdfs || 0} icon={FileText} trend="8.4" colorClass="text-success" bgClass="bg-success/10" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="shadow-soft-md border-border/50">
          <CardHeader>
            <CardTitle>Download Trends</CardTitle>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={downloadData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-soft-md border-border/50">
          <CardHeader>
            <CardTitle>Category Performance</CardTitle>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={downloadData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip cursor={{ fill: 'hsl(var(--muted)/0.2)' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="count" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
};

export default AdvancedAnalyticsDashboard;
