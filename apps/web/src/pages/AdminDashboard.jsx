
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, School, FileText, Download, Activity, UserPlus,
  PlusCircle, CheckCircle, Eye, Bell, FileBarChart
} from 'lucide-react';
import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PageTransition from '@/components/PageTransition.jsx';
import MetricCard from '@/components/dashboard/MetricCard.jsx';
import ChartContainer from '@/components/dashboard/ChartContainer.jsx';
import ActivityTable from '@/components/dashboard/ActivityTable.jsx';
import TopPerformersList from '@/components/dashboard/TopPerformersList.jsx';
import { useAdminDashboardData } from '@/hooks/useAdminDashboardData.js';
import { useNavigationTiles } from '@/hooks/useNavigationTiles.js';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import pb from '@/lib/apiClient';

import { jsPDF } from 'jspdf';

const exportDashboardReport = (data) => {
  const doc = new jsPDF();
  const now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('EduPortal Dashboard Report', 14, 20);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(`Generated: ${now} IST`, 14, 28);
  doc.setDrawColor(200);
  doc.line(14, 32, 196, 32);

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text('Platform Metrics', 14, 42);

  const metrics = [
    ['Total Users', data.metrics.totalUsers],
    ['Total Schools', data.metrics.totalSchools],
    ['Total PDFs', data.metrics.totalPdfs],
    ['Total Downloads', data.metrics.totalDownloads],
    ['Active Users Today', data.metrics.activeUsersToday],
  ];
  let y = 52;
  doc.setFontSize(11);
  metrics.forEach(([label, value]) => {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80);
    doc.text(label, 20, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text(String(value ?? 0), 120, y);
    y += 9;
  });

  y += 6;
  doc.line(14, y, 196, y);
  y += 10;

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text('Pending Actions', 14, y);
  y += 10;

  const pending = [
    ['PDF Approvals', data.pendingItems.pdfApprovals],
    ['User Requests', data.pendingItems.userRequests],
    ['School Registrations', data.pendingItems.schoolRegistrations],
  ];
  doc.setFontSize(11);
  pending.forEach(([label, value]) => {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80);
    doc.text(label, 20, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text(String(value ?? 0), 120, y);
    y += 9;
  });

  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text('EduPortal — Confidential', 14, 285);
  doc.save(`eduportal-report-${new Date().toISOString().slice(0, 10)}.pdf`);
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState('30d');
  const { data, loading } = useAdminDashboardData(dateRange);
  const { handleTileClick } = useNavigationTiles();

  return (
    <PageTransition className="space-y-8 pb-8">
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-poppins font-bold text-foreground">Dashboard Overview</h1>
          <p className="text-muted-foreground mt-1">System metrics, activity, and key performance indicators.</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[160px] bg-card shadow-soft-sm text-foreground">
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="default" className="bg-primary text-primary-foreground shadow-soft-sm hover:shadow-soft-md transition-base" onClick={() => exportDashboardReport(data)} disabled={loading}>
            <Download className="w-4 h-4 mr-2" /> Export Report
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-[140px] rounded-[var(--radius-xl)]" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <MetricCard
            title="Total Users"
            value={data.metrics.totalUsers}
            trend={data.trends.users}
            icon={Users}
            gradientClass="bg-gradient-to-br from-violet-500 to-purple-700"
            tileId="total_users"
            onClick={() => handleTileClick('total_users', navigate)}
          />

          <MetricCard
            title="Total Schools"
            value={data.metrics.totalSchools}
            trend={data.trends.schools}
            icon={School}
            gradientClass="bg-gradient-to-br from-sky-500 to-blue-700"
            tileId="total_schools"
            onClick={() => handleTileClick('total_schools', navigate)}
          />

          <MetricCard
            title="Total PDFs"
            value={data.metrics.totalPdfs}
            trend={data.trends.pdfs}
            icon={FileText}
            gradientClass="bg-gradient-to-br from-emerald-500 to-teal-700"
            tileId="total_pdfs"
            onClick={() => handleTileClick('total_pdfs', navigate)}
          />

          <MetricCard
            title="Total Downloads"
            value={data.metrics.totalDownloads}
            trend={data.trends.downloads}
            icon={Download}
            gradientClass="bg-gradient-to-br from-amber-500 to-orange-600"
            tileId="total_downloads"
            onClick={() => handleTileClick('total_downloads', navigate)}
          />

          <MetricCard
            title="Active Users Today"
            value={data.metrics.activeUsersToday}
            trend={5.4}
            icon={Activity}
            gradientClass="bg-gradient-to-br from-rose-500 to-pink-700"
            tileId="active_users"
            onClick={() => handleTileClick('active_users', navigate)}
          />

          <MetricCard
            title="Categories"
            value={12}
            trend={2.1}
            icon={FileBarChart}
            gradientClass="bg-gradient-to-br from-indigo-500 to-cyan-600"
            tileId="categories"
            onClick={() => handleTileClick('categories', navigate)}
          />
        </div>
      )}

      {/* Quick Actions */}
      <Card className="border-none shadow-soft-sm bg-card">
        <CardContent className="p-4 flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => navigate('/admin/schools-and-users')} className="flex-1 min-w-[140px] bg-background hover:bg-muted/50 border-border/60"><PlusCircle className="w-4 h-4 mr-2 text-primary" /> Create School</Button>
          <Button variant="outline" onClick={() => navigate('/admin/categories')} className="flex-1 min-w-[140px] bg-background hover:bg-muted/50 border-border/60"><PlusCircle className="w-4 h-4 mr-2 text-accent" /> Create Category</Button>
          <Button variant="outline" onClick={() => navigate('/admin/moderation')} className="flex-1 min-w-[140px] bg-background hover:bg-muted/50 border-border/60"><CheckCircle className="w-4 h-4 mr-2 text-success" /> Approve PDFs</Button>
          <Button variant="outline" onClick={() => navigate('/admin/schools-and-users')} className="flex-1 min-w-[140px] bg-background hover:bg-muted/50 border-border/60"><Eye className="w-4 h-4 mr-2 text-warning" /> View Requests</Button>
          <Button variant="outline" onClick={() => navigate('/admin/notifications')} className="flex-1 min-w-[140px] bg-background hover:bg-muted/50 border-border/60"><Bell className="w-4 h-4 mr-2 text-danger" /> Notifications</Button>
          <Button variant="outline" onClick={() => navigate('/admin/analytics-reports')} className="flex-1 min-w-[140px] bg-background hover:bg-muted/50 border-border/60"><FileBarChart className="w-4 h-4 mr-2 text-primary" /> Reports</Button>
        </CardContent>
      </Card>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartContainer title="User Growth" description="New user registrations over 12 months" loading={loading}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.charts.userGrowth} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
              <RechartsTooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }} />
              <Line type="monotone" dataKey="users" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4, fill: 'hsl(var(--primary))' }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>

        <ChartContainer title="Downloads Trend" description="Daily downloads over the last 30 days" loading={loading}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.charts.downloadsTrend} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <defs>
                <linearGradient id="colorDownloads" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="day" hide />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
              <RechartsTooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }} />
              <Area type="monotone" dataKey="downloads" stroke="hsl(var(--accent))" strokeWidth={3} fillOpacity={1} fill="url(#colorDownloads)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>

      {/* Lists Section */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent Activity Tabs */}
        <Card className="xl:col-span-2 shadow-soft-md border-border/50 bg-card overflow-hidden">
          <CardHeader className="pb-0 border-b border-border/30 bg-muted/10">
            <CardTitle className="mb-4">Recent Activity</CardTitle>
            <Tabs defaultValue="uploads" className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-0 bg-transparent h-auto p-0 pb-1 rounded-none border-b border-transparent">
                <TabsTrigger value="uploads" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3">Uploads</TabsTrigger>
                <TabsTrigger value="downloads" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3">Downloads</TabsTrigger>
                <TabsTrigger value="registrations" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3">Registrations</TabsTrigger>
                <TabsTrigger value="events" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3">Events</TabsTrigger>
              </TabsList>

              <div className="p-4">
                <TabsContent value="uploads" className="m-0 mt-2">
                  <ActivityTable
                    loading={loading}
                    data={data.recentActivity.uploads}
                    columns={[
                      { header: 'File Name', cell: (row) => <span className="font-medium text-sm">{row.fileName || 'Unknown'}</span> },
                      { header: 'Size', cell: (row) => <span className="text-muted-foreground text-sm">{(row.fileSize / 1024 / 1024).toFixed(2)} MB</span> },
                      { header: 'Date', cell: (row) => <span className="text-muted-foreground text-sm">{new Date(row.created).toLocaleDateString()}</span> }
                    ]}
                  />
                </TabsContent>

                <TabsContent value="downloads" className="m-0 mt-2">
                  <ActivityTable
                    loading={loading}
                    data={data.recentActivity.downloads}
                    columns={[
                      { header: 'User', cell: (row) => <span className="font-medium text-sm">{row.expand?.userId?.name || row.expand?.userId?.email || 'Unknown'}</span> },
                      { header: 'Document', cell: (row) => <span className="text-muted-foreground text-sm truncate max-w-[150px] inline-block">{row.expand?.pdfId?.fileName || 'Unknown PDF'}</span> },
                      { header: 'Date', cell: (row) => <span className="text-muted-foreground text-sm">{new Date(row.created).toLocaleString()}</span> }
                    ]}
                  />
                </TabsContent>

                <TabsContent value="registrations" className="m-0 mt-2">
                  <ActivityTable
                    loading={loading}
                    data={data.recentActivity.registrations}
                    columns={[
                      { header: 'Name', cell: (row) => <span className="font-medium text-sm">{row.name || 'N/A'}</span> },
                      { header: 'Email', cell: (row) => <span className="text-muted-foreground text-sm">{row.email}</span> },
                      { header: 'Role', cell: (row) => <span className="capitalize text-[10px] font-bold tracking-wider bg-primary/10 text-primary px-2 py-1 rounded-sm">{row.role}</span> }
                    ]}
                  />
                </TabsContent>

                <TabsContent value="events" className="m-0 mt-2">
                  <ActivityTable
                    loading={loading}
                    data={data.recentActivity.events}
                    columns={[
                      { header: 'Action', cell: (row) => <span className="font-medium text-sm capitalize">{row.action}</span> },
                      { header: 'User', cell: (row) => <span className="text-muted-foreground text-sm">{row.expand?.userId?.email || 'System'}</span> },
                      { header: 'Time', cell: (row) => <span className="text-muted-foreground text-sm">{new Date(row.created).toLocaleString()}</span> }
                    ]}
                  />
                </TabsContent>
              </div>
            </Tabs>
          </CardHeader>
        </Card>

        {/* Pending Actions & Top Performers side column */}
        <div className="flex flex-col gap-6">
          <Card className="shadow-soft-md border-border/50 bg-card">
            <CardHeader className="pb-3 border-b border-border/30 bg-muted/10">
              <CardTitle className="text-base font-semibold">Pending Actions</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div
                onClick={() => navigate('/admin/moderation')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') navigate('/admin/moderation'); }}
                className="flex justify-between items-center p-3 rounded-lg bg-card border border-border/50 hover:border-primary/30 hover:shadow-soft-sm transition-all cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span className="font-medium text-sm group-hover:text-primary transition-colors">PDF Approvals</span>
                <span className="bg-warning/20 text-warning px-2.5 py-0.5 rounded-full text-xs font-bold">{data.pendingItems.pdfApprovals}</span>
              </div>
              <div
                onClick={() => navigate('/admin/schools-and-users?tab=users')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') navigate('/admin/schools-and-users?tab=users'); }}
                className="flex justify-between items-center p-3 rounded-lg bg-card border border-border/50 hover:border-primary/30 hover:shadow-soft-sm transition-all cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span className="font-medium text-sm group-hover:text-primary transition-colors">User Requests</span>
                <span className="bg-primary/20 text-primary px-2.5 py-0.5 rounded-full text-xs font-bold">{data.pendingItems.userRequests}</span>
              </div>
              <div
                onClick={() => navigate('/admin/schools-and-users?tab=onboarding')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') navigate('/admin/schools-and-users?tab=onboarding'); }}
                className="flex justify-between items-center p-3 rounded-lg bg-card border border-border/50 hover:border-primary/30 hover:shadow-soft-sm transition-all cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span className="font-medium text-sm group-hover:text-primary transition-colors">School Registrations</span>
                <span className="bg-accent/20 text-accent px-2.5 py-0.5 rounded-full text-xs font-bold">{data.pendingItems.schoolRegistrations}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-soft-md border-border/50 bg-card flex-1">
            <CardHeader className="pb-3 border-b border-border/30 bg-muted/10">
              <CardTitle className="text-base font-semibold">Top Active Schools</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <TopPerformersList
                loading={loading}
                items={data.topPerformers.schools.slice(0, 4)}
                renderItem={(school) => (
                  <>
                    <Avatar className="h-9 w-9 rounded-lg bg-accent/10 text-accent shrink-0">
                      <AvatarFallback className="font-poppins font-medium text-sm">{school.schoolName?.charAt(0) || 'S'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 px-3">
                      <p className="text-sm font-semibold text-foreground truncate">{school.schoolName}</p>
                      <p className="text-xs text-muted-foreground truncate">{school.location || 'Unknown Location'}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-foreground">98%</p>
                      <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Activity</p>
                    </div>
                  </>
                )}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </PageTransition>
  );
};

export default AdminDashboard;
