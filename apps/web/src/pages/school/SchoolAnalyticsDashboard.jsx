
import React, { useState, useEffect, useMemo } from 'react';
import pb from '@/lib/apiClient';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Download, Users, FileText, ArrowUpRight, RefreshCw,
  BookOpen, GraduationCap, HardDrive, Eye, AlertCircle
} from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import PageTransition from '@/components/PageTransition.jsx';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { formatBytes } from '@/lib/utils';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--success))', 'hsl(var(--warning))'];

const SchoolAnalyticsDashboard = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await pb.fetch('/analytics/school', 'GET');
      setData(res);
    } catch (error) {
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const categoryData = useMemo(() =>
    (data?.downloads_by_category || [])
      .filter(d => d.count > 0)
      .map(d => ({ name: d.category_name || 'Unknown', value: d.count })),
    [data]
  );

  const recentUploads = data?.recent_uploads || [];
  const recentlyViewed = data?.recently_viewed || [];

  const MetricCard = ({ title, value, sub, icon: Icon, colorClass, bgClass }) => (
    <Card className="border-none shadow-soft-sm hover:shadow-soft-md transition-base relative overflow-hidden bg-card group">
      <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full ${bgClass} blur-2xl opacity-50 group-hover:opacity-80 transition-opacity`} />
      <CardContent className="p-6 relative z-10">
        <div className="flex justify-between items-start mb-4">
          <div className={`w-12 h-12 rounded-[var(--radius-md)] ${bgClass} flex items-center justify-center`}>
            <Icon className={`w-6 h-6 ${colorClass}`} />
          </div>
          {sub !== undefined && (
            <div className="flex items-center text-sm font-medium text-success bg-success/10 px-2 py-1 rounded-full">
              <ArrowUpRight className="w-3 h-3 mr-1" /> {sub}
            </div>
          )}
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
          <h1 className="text-3xl font-poppins font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground mt-1">Resource utilization and engagement insights for your institution.</p>
        </div>
        <Button variant="outline" onClick={fetchAnalytics} disabled={loading} className="shadow-soft-sm bg-card">
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {/* Metric cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-36 rounded-[var(--radius-lg)]" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <MetricCard
            title="PDFs Available"
            value={data?.available_pdfs ?? 0}
            sub={data?.new_pdfs_last_7d ? `+${data.new_pdfs_last_7d} this week` : undefined}
            icon={FileText}
            colorClass="text-primary"
            bgClass="bg-primary/10"
          />
          <MetricCard
            title="Downloads (30 days)"
            value={data?.downloads_last_30d ?? 0}
            icon={Download}
            colorClass="text-secondary"
            bgClass="bg-secondary/10"
          />
          <MetricCard
            title="My Downloads"
            value={data?.my_downloads ?? 0}
            icon={Users}
            colorClass="text-accent"
            bgClass="bg-accent/10"
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Recent Uploads */}
        <Card className="lg:col-span-2 shadow-soft-md border-border/50 bg-card flex flex-col">
          <CardHeader>
            <CardTitle>Recently Added Content</CardTitle>
            <CardDescription>Latest PDFs available to your institution</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-hidden">
            {loading ? (
              <div className="p-4 space-y-2">
                {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : recentUploads.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                <FileText className="w-10 h-10 text-muted-foreground opacity-30 mb-3" />
                <p className="text-sm text-muted-foreground font-medium">No content available yet.</p>
                <p className="text-xs text-muted-foreground mt-1">Content uploaded to your programs will appear here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/20 hover:bg-muted/20">
                      <TableHead>PDF File</TableHead>
                      <TableHead className="hidden sm:table-cell">Class</TableHead>
                      <TableHead className="hidden md:table-cell">Subject</TableHead>
                      <TableHead className="hidden lg:table-cell w-24">Size</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentUploads.map((pdf, idx) => (
                      <TableRow key={pdf.id || idx} className="hover:bg-muted/30">
                        <TableCell className="max-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-7 h-7 rounded-md bg-rose-500/10 flex items-center justify-center shrink-0">
                              <FileText className="w-3.5 h-3.5 text-rose-500" />
                            </div>
                            <p className="text-sm font-medium truncate">{pdf.fileName || pdf.file_name || '—'}</p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {pdf.className || pdf.class_name ? (
                            <Badge variant="outline" className="text-xs gap-1">
                              <GraduationCap className="w-3 h-3" />{pdf.className || pdf.class_name}
                            </Badge>
                          ) : <span className="text-xs text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {pdf.subjectName || pdf.subject_name ? (
                            <Badge variant="outline" className="text-xs gap-1">
                              <BookOpen className="w-3 h-3" />{pdf.subjectName || pdf.subject_name}
                            </Badge>
                          ) : <span className="text-xs text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                          {pdf.fileSize || pdf.file_size ? formatBytes(pdf.fileSize || pdf.file_size) : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Downloads by Program */}
        <Card className="shadow-soft-md border-border/50 bg-card">
          <CardHeader>
            <CardTitle>Downloads by Program</CardTitle>
            <CardDescription>Distribution of your school's downloads</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="w-full h-[280px] rounded-full" />
            ) : categoryData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[280px] text-center px-4">
                <AlertCircle className="w-10 h-10 text-muted-foreground opacity-30 mb-3" />
                <p className="text-sm text-muted-foreground font-medium">No download activity yet.</p>
                <p className="text-xs text-muted-foreground mt-1">Downloads will appear here once your users access content.</p>
              </div>
            ) : (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="45%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={4}
                      dataKey="value"
                      stroke="none"
                    >
                      {categoryData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: 'var(--radius-md)', border: '1px solid hsl(var(--border))' }}
                      itemStyle={{ fontWeight: 600, color: 'hsl(var(--foreground))' }}
                      formatter={(value) => [`${value} downloads`, 'Count']}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recently Viewed (only if data exists) */}
      {!loading && recentlyViewed.length > 0 && (
        <Card className="shadow-soft-md border-border/50 bg-card mb-8">
          <CardHeader>
            <CardTitle>Recently Viewed</CardTitle>
            <CardDescription>PDFs you've opened recently</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20 hover:bg-muted/20">
                    <TableHead>PDF File</TableHead>
                    <TableHead className="hidden sm:table-cell">Class</TableHead>
                    <TableHead className="hidden md:table-cell">Subject</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentlyViewed.map((pdf, idx) => (
                    <TableRow key={pdf.id || idx} className="hover:bg-muted/30">
                      <TableCell className="max-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                            <Eye className="w-3.5 h-3.5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{pdf.fileName || pdf.file_name || '—'}</p>
                            {pdf.lastViewed && (
                              <p className="text-xs text-muted-foreground">
                                {new Date(pdf.lastViewed || pdf.last_viewed).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {pdf.className || pdf.class_name ? (
                          <Badge variant="outline" className="text-xs gap-1">
                            <GraduationCap className="w-3 h-3" />{pdf.className || pdf.class_name}
                          </Badge>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {pdf.subjectName || pdf.subject_name ? (
                          <Badge variant="outline" className="text-xs gap-1">
                            <BookOpen className="w-3 h-3" />{pdf.subjectName || pdf.subject_name}
                          </Badge>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Downloads bar chart (only if category data exists) */}
      {!loading && categoryData.length > 0 && (
        <Card className="shadow-soft-md border-border/50 bg-card">
          <CardHeader>
            <CardTitle>Downloads Breakdown</CardTitle>
            <CardDescription>Total downloads per program by your school</CardDescription>
          </CardHeader>
          <CardContent className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--foreground))', fontSize: 12, fontWeight: 500 }} width={150} />
                <Tooltip
                  cursor={{ fill: 'hsl(var(--muted)/0.3)' }}
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: 'var(--radius-md)', border: '1px solid hsl(var(--border))' }}
                  formatter={(value) => [`${value} downloads`]}
                />
                <Bar dataKey="value" name="Downloads" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={20}>
                  {categoryData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={`${COLORS[index % COLORS.length]}`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </PageTransition>
  );
};

export default SchoolAnalyticsDashboard;
