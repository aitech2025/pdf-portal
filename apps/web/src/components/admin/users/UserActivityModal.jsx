
import React, { useState, useEffect } from 'react';
import pb from '@/lib/apiClient.js';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

const UserActivityModal = ({ isOpen, onClose, user }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && user?.id) {
      setLoading(true);
      pb.collection('auditLogs').getList(1, 30, {
        filter: `userId = "${user.id}"`,
        sort: '-created',
        $autoCancel: false
      })
      .then(res => setActivities(res.items))
      .catch(err => console.error("Error fetching activity", err))
      .finally(() => setLoading(false));
    }
  }, [isOpen, user]);

  const getActionColor = (action) => {
    const map = {
      'login': 'bg-blue-500/10 text-blue-700 border-blue-500/20',
      'upload': 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
      'download': 'bg-indigo-500/10 text-indigo-700 border-indigo-500/20',
      'delete': 'bg-rose-500/10 text-rose-700 border-rose-500/20',
    };
    return map[action] || 'bg-muted text-muted-foreground border-border';
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl h-[80vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-border/50 shrink-0">
          <div className="flex justify-between items-start">
            <div>
              <DialogTitle className="text-xl font-poppins font-semibold">User Activity</DialogTitle>
              <DialogDescription className="mt-1">
                Recent actions performed by {user?.displayName} ({user?.email})
              </DialogDescription>
            </div>
            <Button variant="outline" size="sm" className="h-8 text-xs font-medium shadow-none">
              <Download className="w-3 h-3 mr-2" /> Export CSV
            </Button>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden bg-muted/10">
          <ScrollArea className="h-full">
            <div className="p-4">
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full rounded-md" />)}
                </div>
              ) : activities.length === 0 ? (
                <div className="py-12 text-center flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                    <span className="text-lg text-muted-foreground">?</span>
                  </div>
                  <p className="text-sm font-medium text-foreground">No recent activity</p>
                  <p className="text-xs text-muted-foreground">This user hasn't performed any logged actions yet.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-card sticky top-0 z-10 shadow-sm">
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Action</TableHead>
                      <TableHead>Resource</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activities.map((log) => (
                      <TableRow key={log.id} className="hover:bg-muted/30">
                        <TableCell>
                          <Badge variant="outline" className={`capitalize shadow-none ${getActionColor(log.action)}`}>
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm">
                          {log.resourceType ? `${log.resourceType}: ${log.resourceId}` : log.actionDetails || 'N/A'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground font-mono">
                          {log.ipAddress || 'Unknown'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {new Date(log.created).toLocaleString(undefined, { 
                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                          })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UserActivityModal;
