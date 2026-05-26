import React, { useEffect, useMemo, useState } from 'react';
import {
  Users,
  Building2,
  FileText,
  Activity,
  ArrowUpRight,
  ShieldAlert,
  UploadCloud,
  MessageSquare,
  FolderTree,
  TrendingUp,
  HardDrive,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import PageTransition from '@/components/PageTransition.jsx';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import pb from '@/lib/apiClient';
import { useAuth } from '@/contexts/AuthContext.jsx';

const formatBytes = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const KpiTile = ({ title, value, delta, icon: Icon, accent, link, loading }) => (
  <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
    <Card className="relative overflow-hidden border-border/60 shadow-soft-sm hover:shadow-soft-md transition-base group">
      <div
        aria-hidden
        className={cn(
          'absolute -top-12 -right-12 w-36 h-36 rounded-full blur-3xl opacity-60 transition-opacity group-hover:opacity-90',
          accent.glow
        )}
      />
      <CardContent className="p-5 sm:p-6 relative">
        <div className="flex items-center justify-between mb-5">
          <div className={cn('w-11 h-11 rounded-2xl flex items-center justify-center', accent.bg)}>
            <Icon className={cn('w-5 h-5', accent.fg)} />
          </div>
          {link && (
            <Button
              variant="ghost"
              size="icon"
              asChild
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <Link to={link} aria-label={`Open ${title}`}>
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </Button>
          )}
        </div>
        {loading ? (
          <Skeleton className="h-9 w-24 mb-2" />
        ) : (
          <h3 className="text-3xl font-display font-bold text-foreground tabular-nums leading-none">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </h3>
        )}
        <div className="flex items-center justify-between mt-2.5">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          {delta != null && !loading && (
            <span
              className={cn(
                'text-[11px] font-semibold inline-flex items-center gap-1 px-2 py-0.5 rounded-full',
                delta >= 0 ? 'text-success bg-success/10' : 'text-destructive bg-destructive/10'
              )}
            >
              <TrendingUp className={cn('w-3 h-3', delta < 0 && 'rotate-180')} />
              {delta >= 0 ? '+' : ''}
              {delta}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

const ActionTile = ({ icon: Icon, title, to, color }) => (
  <Link
    to={to}
    className="group flex flex-col items-start gap-2.5 p-4 rounded-xl border border-border/60 hover:border-primary/40 hover:bg-muted/40 transition-base focus-ring"
  >
    <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', color)}>
      <Icon className="w-4 h-4 text-white" />
    </div>
    <span className="font-semibold text-sm text-foreground">{title}</span>
    <span className="text-xs text-muted-foreground inline-flex items-center gap-1 mt-auto group-hover:text-primary transition-colors">
      Open <ArrowUpRight className="w-3 h-3" />
    </span>
  </Link>
);

const accents = {
  primary: { bg: 'bg-primary/10', fg: 'text-primary', glow: 'bg-primary/25' },
  success: { bg: 'bg-success/10', fg: 'text-success', glow: 'bg-success/20' },
  warning: { bg: 'bg-warning/10', fg: 'text-warning-foreground', glow: 'bg-warning/25' },
  danger: { bg: 'bg-destructive/10', fg: 'text-destructive', glow: 'bg-destructive/20' },
  accent: { bg: 'bg-accent/10', fg: 'text-accent', glow: 'bg-accent/20' },
};

const AdminDashboard = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const dash = await pb.fetch('/dashboard', 'GET').catch(() => null);
        const audit = await pb
          .fetch('/auditLogs?page=1&per_page=6', 'GET')
          .catch(() => ({ items: [] }));
        setStats(dash);
        setAuditLogs(audit.items || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const kpis = useMemo(() => {
    const s = stats || {};
    return [
      {
        title: 'Total Users',
        value: s.total_users ?? s.totalUsers ?? 0,
        icon: Users,
        accent: accents.primary,
        link: '/admin/users',
      },
      {
        title: 'Active Schools',
        value: s.total_schools ?? s.totalSchools ?? 0,
        icon: Building2,
        accent: accents.success,
        link: '/admin/schools-and-users',
      },
      {
        title: 'Content Library',
        value: s.total_pdfs ?? s.totalPdfs ?? 0,
        icon: FileText,
        accent: accents.warning,
        link: '/admin/content-dashboard',
      },
      {
        title: 'Pending Requests',
        value: s.pending_requests ?? s.pendingRequests ?? 0,
        icon: ShieldAlert,
        accent: accents.danger,
        link: '/admin/moderation',
      },
    ];
  }, [stats]);

  const storage = stats?.storage_bytes ?? stats?.storageBytes ?? 0;
  const storageBySchool = stats?.storage_by_school ?? stats?.storageBySchool ?? [];
  const maxSchoolBytes = Math.max(1, ...storageBySchool.map((s) => s.bytes || 0));

  return (
    <PageTransition>
      {/* Hero */}
      <section className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <p className="text-xs uppercase font-semibold tracking-[0.18em] text-primary mb-2">
              Overview
            </p>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
              Welcome back{currentUser?.name ? `, ${currentUser.name.split(' ')[0]}` : ''}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Operational metrics and recent activity at a glance.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/admin/audit-logs">
                <Activity className="w-4 h-4 mr-2" /> Audit log
              </Link>
            </Button>
            <Button asChild size="sm" variant="gradient">
              <Link to="/admin/pdf-upload">
                <UploadCloud className="w-4 h-4 mr-2" /> Upload PDF
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* KPIs */}
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
        {kpis.map((k) => (
          <KpiTile key={k.title} {...k} loading={loading} />
        ))}
      </div>

      {/* Body grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
        <div className="xl:col-span-2 space-y-4 sm:space-y-6">
          {/* Storage card */}
          <Card className="border-border/60 shadow-soft-sm">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <HardDrive className="w-4 h-4 text-primary" /> Storage usage
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Aggregated PDF storage across all tenants.
                </p>
              </div>
              <Badge variant="secondary" className="tabular-nums">
                {formatBytes(storage)}
              </Badge>
            </CardHeader>
            <CardContent>
              {storageBySchool.length === 0 ? (
                <div className="text-center py-10 text-sm text-muted-foreground">
                  No storage data yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {storageBySchool.slice(0, 6).map((s) => (
                    <div key={s.school_id || s.schoolId || s.school_name} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium truncate pr-2">
                          {s.school_name || s.schoolName || 'Unassigned'}
                        </span>
                        <span className="text-muted-foreground tabular-nums text-xs">
                          {formatBytes(s.bytes || 0)}
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-primary rounded-full"
                          style={{ width: `${((s.bytes || 0) / maxSchoolBytes) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent activity */}
          <Card className="border-border/60 shadow-soft-sm">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="w-4 h-4 text-primary" /> Recent activity
              </CardTitle>
              <Link to="/admin/audit-logs">
                <Button variant="ghost" size="sm" className="text-xs">
                  View all <ArrowUpRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-2">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 rounded-xl" />
                ))
              ) : auditLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No recent activity recorded.
                </p>
              ) : (
                auditLogs.slice(0, 6).map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 p-3 rounded-xl border border-border/40 hover:border-border transition-base"
                  >
                    <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Activity className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">
                        {log.action_details || log.actionDetails || log.action}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {log.resource_type || log.resourceType} ·{' '}
                        {new Date(log.created || log.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4 sm:space-y-6">
          {/* Quick actions */}
          <Card className="border-border/60 shadow-soft-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quick actions</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <ActionTile icon={UploadCloud} title="Upload PDF" to="/admin/pdf-upload" color="bg-primary" />
              <ActionTile icon={Building2} title="New School" to="/admin/schools-and-users" color="bg-success" />
              <ActionTile icon={FolderTree} title="Categories" to="/admin/categories-management" color="bg-warning" />
              <ActionTile icon={MessageSquare} title="Broadcast" to="/admin/broadcast" color="bg-accent" />
            </CardContent>
          </Card>

          {/* System status */}
          <Card className="border-border/60 shadow-soft-sm bg-gradient-to-br from-success/5 via-card to-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-success" />
                </span>
                System status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-display font-semibold text-foreground">
                All systems operational
              </p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                API, database and notification channels are healthy. Detailed health metrics are available in settings.
              </p>
              <Button asChild variant="link" className="px-0 mt-2 h-auto text-primary">
                <Link to="/admin/settings">
                  View health dashboard <ArrowUpRight className="w-3 h-3 ml-1" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageTransition>
  );
};

export default AdminDashboard;
