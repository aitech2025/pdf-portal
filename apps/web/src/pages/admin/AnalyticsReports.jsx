
import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, Users, FileText, School, Settings, Clock, History, Download } from 'lucide-react';
import PageTransition from '@/components/PageTransition.jsx';
import { useAnalyticsData } from '@/hooks/useAnalyticsData.js';
import { MetricsCard, ChartContainer } from '@/components/admin/analytics/AnalyticsComponents.jsx';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

const AnalyticsReports = () => {
  const { currentUser, isAdmin } = useAuth();
  const [dateRange, setDateRange] = useState('30d');
  const { data, loading } = useAnalyticsData(dateRange);

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <div className="w-16 h-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mb-4">
          <Settings className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-poppins font-bold text-foreground mb-2">Access Denied</h2>
        <p className="text-muted-foreground max-w-md">
          You do not have permission to view the analytics dashboard. This area is restricted to administrators.
        </p>
      </div>
    );
  }

  return (
    <PageTransition className="pb-24 max-w-7xl mx-auto">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-poppins font-bold text-foreground">Analytics & Reports</h1>
          <p className="text-muted-foreground mt-1">Comprehensive insights into platform usage and performance.</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[160px] bg-card shadow-soft-sm">
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
              <SelectItem value="1y">Last 1 Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <div className="overflow-x-auto pb-2 mb-6 scrollbar-hide">
          <TabsList className="bg-muted/30 p-1 h-12 inline-flex min-w-full sm:min-w-0">
            <TabsTrigger value="overview" className="data-[state=active]:bg-background data-[state=active]:shadow-sm px-4">
              <BarChart3 className="w-4 h-4 mr-2" /> Overview
            </TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-background data-[state=active]:shadow-sm px-4">
              <Users className="w-4 h-4 mr-2" /> Users
            </TabsTrigger>
            <TabsTrigger value="content" className="data-[state=active]:bg-background data-[state=active]:shadow-sm px-4">
              <FileText className="w-4 h-4 mr-2" /> Content
            </TabsTrigger>
            <TabsTrigger value="schools" className="data-[state=active]:bg-background data-[state=active]:shadow-sm px-4">
              <School className="w-4 h-4 mr-2" /> Schools
            </TabsTrigger>
            <TabsTrigger value="custom" className="data-[state=active]:bg-background data-[state=active]:shadow-sm px-4">
              <Settings className="w-4 h-4 mr-2" /> Custom
            </TabsTrigger>
            <TabsTrigger value="scheduled" className="data-[state=active]:bg-background data-[state=active]:shadow-sm px-4">
              <Clock className="w-4 h-4 mr-2" /> Scheduled
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-background data-[state=active]:shadow-sm px-4">
              <History className="w-4 h-4 mr-2" /> History
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-6 animate-fade-in m-0 outline-none">
          {/* Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricsCard 
              title="Total Users" 
              value={data.overview.totalUsers} 
              growth={data.overview.userGrowth} 
              icon={Users} 
              loading={loading} 
            />
            <MetricsCard 
              title="Total PDFs" 
              value={data.overview.totalPdfs} 
              growth={data.overview.pdfGrowth} 
              icon={FileText} 
              loading={loading} 
            />
            <MetricsCard 
              title="Total Downloads" 
              value={data.overview.totalDownloads} 
              growth={data.overview.downloadGrowth} 
              icon={Download} 
              loading={loading} 
            />
            <MetricsCard 
              title="Total Schools" 
              value={data.overview.totalSchools} 
              growth={data.overview.schoolGrowth} 
              icon={School} 
              loading={loading} 
            />
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartContainer title="User Growth" description="New user registrations over time" loading={loading}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.charts.userGrowth} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Line type="monotone" dataKey="users" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4, fill: 'hsl(var(--primary))' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>

            <ChartContainer title="Download Trends" description="PDF downloads across the platform" loading={loading}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.charts.downloadTrends} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <defs>
                    <linearGradient id="colorDownloads" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                  />
                  <Area type="monotone" dataKey="downloads" stroke="hsl(var(--chart-2))" strokeWidth={3} fillOpacity={1} fill="url(#colorDownloads)" />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>

            <ChartContainer title="Top Categories" description="Most popular content categories" loading={loading}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.charts.topCategories} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    cursor={{ fill: 'hsl(var(--muted)/0.2)' }}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                  />
                  <Bar dataKey="value" fill="hsl(var(--chart-3))" radius={[0, 4, 4, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>

            <ChartContainer title="School Distribution" description="Breakdown of school types" loading={loading}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.charts.schoolDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {data.charts.schoolDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        </TabsContent>

        {/* Placeholders for other tabs to satisfy the prompt structure */}
        <TabsContent value="users" className="m-0 outline-none">
          <div className="p-8 text-center border border-border/50 rounded-xl bg-card shadow-soft-sm">
            <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-poppins font-semibold mb-2">User Analytics</h3>
            <p className="text-muted-foreground">Detailed user metrics, retention, and segmentation data will appear here.</p>
          </div>
        </TabsContent>

        <TabsContent value="content" className="m-0 outline-none">
          <div className="p-8 text-center border border-border/50 rounded-xl bg-card shadow-soft-sm">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-poppins font-semibold mb-2">Content Analytics</h3>
            <p className="text-muted-foreground">PDF performance, ratings, and category insights will appear here.</p>
          </div>
        </TabsContent>

        <TabsContent value="schools" className="m-0 outline-none">
          <div className="p-8 text-center border border-border/50 rounded-xl bg-card shadow-soft-sm">
            <School className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-poppins font-semibold mb-2">School Analytics</h3>
            <p className="text-muted-foreground">School engagement, growth, and comparative performance will appear here.</p>
          </div>
        </TabsContent>

        <TabsContent value="custom" className="m-0 outline-none">
          <div className="p-8 text-center border border-border/50 rounded-xl bg-card shadow-soft-sm">
            <Settings className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-poppins font-semibold mb-2">Custom Reports</h3>
            <p className="text-muted-foreground">Build and save custom data reports using the report builder.</p>
          </div>
        </TabsContent>

        <TabsContent value="scheduled" className="m-0 outline-none">
          <div className="p-8 text-center border border-border/50 rounded-xl bg-card shadow-soft-sm">
            <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-poppins font-semibold mb-2">Scheduled Reports</h3>
            <p className="text-muted-foreground">Manage automated email reports and delivery schedules.</p>
          </div>
        </TabsContent>

        <TabsContent value="history" className="m-0 outline-none">
          <div className="p-8 text-center border border-border/50 rounded-xl bg-card shadow-soft-sm">
            <History className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-poppins font-semibold mb-2">Report History</h3>
            <p className="text-muted-foreground">View and download previously generated reports.</p>
          </div>
        </TabsContent>
      </Tabs>
    </PageTransition>
  );
};

export default AnalyticsReports;
