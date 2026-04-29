
import React, { useState, useEffect } from 'react';
import { Users, Building2, FileText, Activity, ArrowUpRight, ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import pb from '@/lib/apiClient';
import PageTransition from '@/components/PageTransition.jsx';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [users, schools, pdfs, requests] = await Promise.all([
          pb.collection('users').getList(1, 1, { $autoCancel: false }),
          pb.collection('schools').getList(1, 1, { $autoCancel: false }),
          pb.collection('pdfs').getList(1, 1, { $autoCancel: false }),
          pb.collection('onboardingRequests').getList(1, 1, { filter: 'status="pending"', $autoCancel: false })
        ]);

        setStats({
          totalUsers: users.totalItems,
          totalSchools: schools.totalItems,
          totalPdfs: pdfs.totalItems,
          pendingRequests: requests.totalItems
        });
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const StatCard = ({ title, value, icon: Icon, link, colorClass, bgClass }) => (
    <Card className="shadow-soft-sm hover:shadow-soft-md transition-base border-none overflow-hidden relative group">
      <div className={`absolute top-0 right-0 w-32 h-32 rounded-full ${bgClass} blur-3xl -mr-10 -mt-10 opacity-50 transition-opacity group-hover:opacity-80`}></div>
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4 relative z-10">
          <div className={`w-12 h-12 rounded-[var(--radius-lg)] ${bgClass} flex items-center justify-center`}>
            <Icon className={`w-6 h-6 ${colorClass}`} />
          </div>
          {link && (
            <Button variant="ghost" size="icon" asChild className="h-8 w-8 text-muted-foreground hover:text-foreground">
              <Link to={link}><ArrowUpRight className="w-4 h-4" /></Link>
            </Button>
          )}
        </div>
        <div className="relative z-10">
          <h3 className="text-3xl font-poppins font-bold text-foreground mb-1">{value}</h3>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <PageTransition>
      <div className="mb-8">
        <h1 className="text-3xl font-poppins font-bold text-foreground">Dashboard Overview</h1>
        <p className="text-muted-foreground mt-1">Welcome back. Here's what's happening today.</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-40 rounded-[var(--radius-xl)]" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard 
            title="Total Users" 
            value={stats?.totalUsers || 0} 
            icon={Users} 
            link="/admin/users"
            colorClass="text-primary"
            bgClass="bg-primary/10"
          />
          <StatCard 
            title="Active Schools" 
            value={stats?.totalSchools || 0} 
            icon={Building2} 
            link="/admin/schools"
            colorClass="text-emerald-600"
            bgClass="bg-emerald-500/10"
          />
          <StatCard 
            title="Content Library" 
            value={stats?.totalPdfs || 0} 
            icon={FileText} 
            link="/admin/content-dashboard"
            colorClass="text-amber-600"
            bgClass="bg-amber-500/10"
          />
          <StatCard 
            title="Pending Requests" 
            value={stats?.pendingRequests || 0} 
            icon={ShieldAlert} 
            link="/admin/moderation"
            colorClass="text-rose-600"
            bgClass="bg-rose-500/10"
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-soft-sm border-border/50">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" asChild>
              <Link to="/admin/pdf-upload">
                <FileText className="w-6 h-6 text-primary" />
                <span>Upload PDF</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" asChild>
              <Link to="/admin/schools">
                <Building2 className="w-6 h-6 text-emerald-600" />
                <span>Add School</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" asChild>
              <Link to="/admin/categories-management">
                <Activity className="w-6 h-6 text-amber-600" />
                <span>Manage Categories</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" asChild>
              <Link to="/admin/settings">
                <ShieldAlert className="w-6 h-6 text-rose-600" />
                <span>System Settings</span>
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-soft-sm border-border/50 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <CardTitle>System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4">
                <Activity className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">All Systems Operational</h3>
              <p className="text-sm text-muted-foreground mt-1">Detailed health metrics have been moved to Settings.</p>
              <Button variant="link" asChild className="mt-2">
                <Link to="/admin/settings">View Health Dashboard</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
};

export default AdminDashboard;
