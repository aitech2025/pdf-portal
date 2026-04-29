
import React, { useState, useEffect } from 'react';
import pb from '@/lib/apiClient';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Users, FileText, TrendingUp, Calendar, ArrowUpRight } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import PageTransition from '@/components/PageTransition.jsx';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--success))', 'hsl(var(--warning))'];

const SchoolAnalyticsDashboard = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30d');
  
  // Mock data for complex aggregations that require backend logic
  const [trendData, setTrendData] = useState([]);
  const [topContent, setTopContent] = useState([]);
  const [categoryData, setCategoryData] = useState([]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        // Downloads aggregated from API
        // For this premium UI demonstration, we use realistic mock data structures
        
        setTimeout(() => {
          setTrendData([
            { date: 'Apr 01', downloads: 45, activeUsers: 12 },
            { date: 'Apr 05', downloads: 52, activeUsers: 15 },
            { date: 'Apr 10', downloads: 38, activeUsers: 10 },
            { date: 'Apr 15', downloads: 65, activeUsers: 22 },
            { date: 'Apr 20', downloads: 48, activeUsers: 18 },
            { date: 'Apr 25', downloads: 85, activeUsers: 28 },
            { date: 'Apr 30', downloads: 72, activeUsers: 25 },
          ]);

          setTopContent([
            { name: 'Advanced Mathematics Vol 2', downloads: 145 },
            { name: 'Physics Lab Manual', downloads: 112 },
            { name: 'World History Overview', downloads: 98 },
            { name: 'Chemistry Basics', downloads: 85 },
            { name: 'Literature Guide', downloads: 64 },
          ]);

          setCategoryData([
            { name: 'Science', value: 400 },
            { name: 'Mathematics', value: 300 },
            { name: 'History', value: 200 },
            { name: 'Literature', value: 150 },
          ]);

          setLoading(false);
        }, 800);

      } catch (error) {
        toast.error('Failed to load analytics data');
        setLoading(false);
      }
    };

    if (currentUser?.schoolId) {
      fetchAnalytics();
    }
  }, [currentUser, dateRange]);

  const MetricCard = ({ title, value, trend, icon: Icon, colorClass, bgClass }) => (
    <Card className="border-none shadow-soft-sm hover:shadow-soft-md transition-base relative overflow-hidden bg-card group">
      <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full ${bgClass} blur-2xl opacity-50 group-hover:opacity-80 transition-opacity`}></div>
      <CardContent className="p-6 relative z-10">
        <div className="flex justify-between items-start mb-4">
          <div className={`w-12 h-12 rounded-[var(--radius-md)] ${bgClass} flex items-center justify-center`}>
            <Icon className={`w-6 h-6 ${colorClass}`} />
          </div>
          <div className="flex items-center text-sm font-medium text-success bg-success/10 px-2 py-1 rounded-full">
            <ArrowUpRight className="w-3 h-3 mr-1" /> {trend}%
          </div>
        </div>
        <div>
          <h3 className="text-3xl font-poppins font-bold text-foreground mb-1">{value}</h3>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <PageTransition>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-poppins font-bold text-foreground">School Analytics</h1>
          <p className="text-muted-foreground mt-1">Insights into resource utilization and user engagement.</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[160px] bg-card shadow-soft-sm border-border/50">
              <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
              <SelectItem value="ytd">Year to Date</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="gradient" className="shadow-soft-md">
            <Download className="w-4 h-4 mr-2" /> Export PDF
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-36 rounded-[var(--radius-lg)]" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <MetricCard title="Total Downloads" value="1,248" trend="12.5" icon={Download} colorClass="text-primary" bgClass="bg-primary/10" />
          <MetricCard title="Active Users" value="156" trend="8.2" icon={Users} colorClass="text-secondary" bgClass="bg-secondary/10" />
          <MetricCard title="Resources Accessed" value="342" trend="15.3" icon={FileText} colorClass="text-accent" bgClass="bg-accent/10" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <Card className="lg:col-span-2 shadow-soft-md border-border/50 bg-card">
          <CardHeader>
            <CardTitle>Engagement Trends</CardTitle>
            <CardDescription>Downloads and active users over time</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            {loading ? <Skeleton className="w-full h-full" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorDownloads" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: 'var(--radius-md)', border: '1px solid hsl(var(--border))', boxShadow: '0 10px 30px -5px rgba(0,0,0,0.1)' }}
                    itemStyle={{ fontWeight: 600, fontFamily: 'Poppins' }}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  <Area type="monotone" name="Downloads" dataKey="downloads" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorDownloads)" />
                  <Area type="monotone" name="Active Users" dataKey="activeUsers" stroke="hsl(var(--secondary))" strokeWidth={3} fillOpacity={0.1} fill="hsl(var(--secondary))" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-soft-md border-border/50 bg-card">
          <CardHeader>
            <CardTitle>Category Distribution</CardTitle>
            <CardDescription>Downloads by subject area</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px] flex flex-col items-center justify-center">
            {loading ? <Skeleton className="w-full h-full rounded-full" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="45%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: 'var(--radius-md)', border: '1px solid hsl(var(--border))' }}
                    itemStyle={{ fontWeight: 600, color: 'hsl(var(--foreground))' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-soft-md border-border/50 bg-card">
        <CardHeader>
          <CardTitle>Top Performing Content</CardTitle>
          <CardDescription>Most downloaded resources in the selected period</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px]">
          {loading ? <Skeleton className="w-full h-full" /> : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topContent} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="hsl(var(--border))" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--foreground))', fontSize: 12, fontWeight: 500 }} width={180} />
                <Tooltip 
                  cursor={{ fill: 'hsl(var(--muted)/0.3)' }}
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: 'var(--radius-md)', border: '1px solid hsl(var(--border))' }}
                />
                <Bar dataKey="downloads" name="Total Downloads" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={24}>
                  {topContent.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={`hsl(var(--primary) / ${1 - index * 0.15})`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </PageTransition>
  );
};

export default SchoolAnalyticsDashboard;
