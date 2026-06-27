
import React, { useState, useEffect, useCallback } from 'react';
import pb from '@/lib/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Users, FileText, School } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import PageTransition from '@/components/PageTransition.jsx';
import MetricsCard from '@/components/MetricsCard.jsx';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

function formatDate(isoDate) {
  return new Date(isoDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const AdvancedAnalyticsDashboard = () => {
  const [days, setDays] = useState('7');
  const [stats, setStats] = useState(null);
  const [downloadData, setDownloadData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = useCallback(async (numDays) => {
    setLoading(true);
    try {
      const [dashboard, timeseries] = await Promise.all([
        pb.fetch('/dashboard', 'GET'),
        pb.fetch('/analytics/timeseries', 'GET', null, { days: numDays })
      ]);

      setStats({
        totalPdfs: dashboard?.pdf_count ?? 0,
        totalDownloads: dashboard?.total_downloads ?? 0,
        totalSchools: dashboard?.school_count ?? 0,
        totalUsers: dashboard?.user_count ?? 0
      });

      setDownloadData(
        (timeseries?.downloads_per_day ?? []).map(d => ({
          name: formatDate(d.date),
          count: d.count
        }))
      );

      setCategoryData(
        (timeseries?.top_categories ?? []).map(c => ({
          name: c.category_name,
          count: c.count
        }))
      );
    } catch (error) {
      console.error(error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics(parseInt(days, 10));
  }, [fetchAnalytics, days]);

  const handleExport = () => {
    window.location.href = '/api/auditLogs/export';
  };

  return (
    <PageTransition>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-poppins font-bold text-foreground">Advanced Analytics</h1>
          <p className="text-muted-foreground mt-1">Comprehensive insights into platform usage and engagement.</p>
        </div>
        <div className="flex gap-3">
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-[150px] bg-card shadow-soft-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 Days</SelectItem>
              <SelectItem value="30">Last 30 Days</SelectItem>
              <SelectItem value="90">Last 90 Days</SelectItem>
              <SelectItem value="365">Last 1 Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="gradient" className="shadow-soft-md" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" /> Export Audit Log
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-40 rounded-[var(--radius-lg)]" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricsCard title="Total Downloads" value={stats?.totalDownloads ?? 0} icon={Download} colorClass="text-primary" bgClass="bg-primary/10" />
          <MetricsCard title="Active Schools" value={stats?.totalSchools ?? 0} icon={School} colorClass="text-secondary" bgClass="bg-secondary/10" />
          <MetricsCard title="Total Users" value={stats?.totalUsers ?? 0} icon={Users} colorClass="text-accent" bgClass="bg-accent/10" />
          <MetricsCard title="Content Library" value={stats?.totalPdfs ?? 0} icon={FileText} colorClass="text-success" bgClass="bg-success/10" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="shadow-soft-md border-border/50">
          <CardHeader>
            <CardTitle>Download Trends</CardTitle>
          </CardHeader>
          <CardContent className="h-[350px]">
            {loading ? (
              <Skeleton className="w-full h-full" />
            ) : (
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
                  <Area type="monotone" dataKey="count" name="Downloads" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-soft-md border-border/50">
          <CardHeader>
            <CardTitle>Category Performance</CardTitle>
          </CardHeader>
          <CardContent className="h-[350px]">
            {loading ? (
              <Skeleton className="w-full h-full" />
            ) : categoryData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                No download data for this period
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} width={100} />
                  <Tooltip cursor={{ fill: 'hsl(var(--muted)/0.2)' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="count" name="Downloads" fill="hsl(var(--secondary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
};

export default AdvancedAnalyticsDashboard;
