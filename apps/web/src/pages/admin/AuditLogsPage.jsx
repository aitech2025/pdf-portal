import React, { useState, useEffect, useCallback } from 'react';
import pb from '@/lib/apiClient';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, ShieldAlert, Filter, X, ChevronLeft, ChevronRight } from 'lucide-react';
import PageTransition from '@/components/PageTransition.jsx';
import { Skeleton } from '@/components/ui/skeleton';

const ACTION_OPTIONS = [
  { value: 'all', label: 'All Actions' },
  { value: 'login', label: 'Login' },
  { value: 'upload', label: 'Upload' },
  { value: 'download', label: 'Download' },
  { value: 'delete', label: 'Delete' },
  { value: 'approve', label: 'Approve' },
  { value: 'reject', label: 'Reject' },
];

const ACTION_VARIANTS = {
  login: 'default',
  upload: 'secondary',
  download: 'success',
  delete: 'destructive',
  approve: 'success',
  reject: 'warning',
};

const AuditLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 20;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const token = pb.authStore.token;
      const params = new URLSearchParams({ page, per_page: perPage });
      if (actionFilter !== 'all') params.set('action', actionFilter);
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);

      const resp = await fetch(`/api/auditLogs?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await resp.json();
      setLogs(data.items || []);
      setTotalItems(data.totalItems || 0);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Client-side search on user name/email
  const filtered = search
    ? logs.filter(l => {
      const user = l.expand?.userId;
      const name = (user?.name || '').toLowerCase();
      const email = (user?.email || '').toLowerCase();
      const q = search.toLowerCase();
      return name.includes(q) || email.includes(q) || (l.actionDetails || '').toLowerCase().includes(q);
    })
    : logs;

  const clearFilters = () => {
    setSearch('');
    setActionFilter('all');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const hasFilters = search || actionFilter !== 'all' || dateFrom || dateTo;
  const totalPages = Math.ceil(totalItems / perPage);

  return (
    <PageTransition>
      <div className="mb-6">
        <h1 className="text-3xl font-poppins font-bold text-foreground">Audit Logs</h1>
        <p className="text-muted-foreground mt-1">Comprehensive security and activity tracking.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search user or details..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card shadow-soft-sm"
          />
        </div>

        <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(1); }}>
          <SelectTrigger className="w-44 bg-card shadow-soft-sm">
            <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ACTION_OPTIONS.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            className="w-36 bg-card shadow-soft-sm text-foreground"
            title="From date"
          />
          <span className="text-muted-foreground text-sm">to</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            className="w-36 bg-card shadow-soft-sm text-foreground"
            title="To date"
          />
        </div>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4 mr-1" /> Clear
          </Button>
        )}
      </div>

      <Card className="shadow-soft-md border-border/50">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>IP Address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-40 text-center">
                      <ShieldAlert className="w-10 h-10 mx-auto text-muted-foreground opacity-30 mb-2" />
                      <p className="text-muted-foreground">No audit logs found.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map(log => (
                    <TableRow key={log.id} className="hover:bg-muted/20">
                      <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                        {new Date(log.timestamp || log.created).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground text-sm">
                            {log.expand?.userId?.name || 'System'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {log.expand?.userId?.email || ''}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={ACTION_VARIANTS[log.action] || 'outline'} className="capitalize">
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[220px] truncate">
                        {log.actionDetails || '-'}
                      </TableCell>
                      <TableCell className="text-sm font-mono text-muted-foreground">
                        {log.ipAddress || 'Unknown'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            Showing {((page - 1) * perPage) + 1}–{Math.min(page * perPage, totalItems)} of {totalItems}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-foreground px-2">{page} / {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </PageTransition>
  );
};

export default AuditLogsPage;
