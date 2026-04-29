
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { School, UserPlus, FilePlus, Clock } from 'lucide-react';
import pb from '@/lib/apiClient.js';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';

const Activity = ({ limit = 5 }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const opts = { sort: '-created', $autoCancel: false };
        // Fetch recent records from multiple collections
        const [onboarding, users, pdfs, schools] = await Promise.all([
          pb.collection('onboardingRequests').getList(1, limit, opts),
          pb.collection('userRequests').getList(1, limit, opts),
          pb.collection('pdfs').getList(1, limit, opts),
          pb.collection('schools').getList(1, limit, opts),
        ]);

        let combined = [];

        onboarding.items.forEach(item => {
          combined.push({
            id: `onb_${item.id}`,
            type: 'onboarding',
            title: 'School Onboarding',
            description: `${item.schoolName} submitted a request`,
            timestamp: new Date(item.created),
            status: item.status,
            icon: School,
            iconBg: 'bg-primary/10',
            iconColor: 'text-primary'
          });
        });

        users.items.forEach(item => {
          combined.push({
            id: `usr_${item.id}`,
            type: 'user',
            title: 'User Request',
            description: `Access requested for ${item.requestedUserName}`,
            timestamp: new Date(item.created),
            status: item.status,
            icon: UserPlus,
            iconBg: 'bg-amber-500/10',
            iconColor: 'text-amber-600'
          });
        });

        pdfs.items.forEach(item => {
          combined.push({
            id: `pdf_${item.id}`,
            type: 'pdf',
            title: 'PDF Uploaded',
            description: `${item.fileName}`,
            timestamp: new Date(item.created),
            status: item.isActive ? 'active' : 'inactive',
            icon: FilePlus,
            iconBg: 'bg-emerald-500/10',
            iconColor: 'text-emerald-600'
          });
        });

        schools.items.forEach(item => {
          combined.push({
            id: `sch_${item.id}`,
            type: 'school',
            title: 'School Registration',
            description: `${item.schoolName} is registered`,
            timestamp: new Date(item.created),
            status: item.isActive ? 'active' : 'inactive',
            icon: School,
            iconBg: 'bg-indigo-500/10',
            iconColor: 'text-indigo-600'
          });
        });

        // Sort all aggregated records descending by timestamp
        combined.sort((a, b) => b.timestamp - a.timestamp);
        setActivities(combined.slice(0, limit));
      } catch (err) {
        console.error('Failed to fetch activities', err);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, [limit]);

  const getStatusBadge = (status) => {
    if (!status) return null;
    const s = status.toLowerCase();
    if (s === 'approved' || s === 'active') {
      return <Badge className="bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 border-emerald-200 capitalize shadow-none">{s}</Badge>;
    }
    if (s === 'pending') {
      return <Badge className="bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 border-amber-200 capitalize shadow-none">{s}</Badge>;
    }
    if (s === 'rejected' || s === 'inactive') {
      return <Badge className="bg-rose-500/10 text-rose-700 hover:bg-rose-500/20 border-rose-200 capitalize shadow-none">{s}</Badge>;
    }
    return <Badge variant="secondary" className="capitalize shadow-none">{status}</Badge>;
  };

  const formatTime = (date) => {
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(limit)].map((_, i) => (
          <div key={i} className="flex items-start gap-4 p-2">
            <Skeleton className="w-10 h-10 rounded-full shrink-0" />
            <div className="flex-1 space-y-2 py-1">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center p-8 text-center border-dashed bg-muted/20 shadow-none">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
          <Clock className="w-6 h-6 text-muted-foreground opacity-50" />
        </div>
        <p className="text-sm font-medium text-foreground">No recent activity</p>
        <p className="text-xs text-muted-foreground mt-1">Actions taken across the platform will appear here.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {activities.map((item, index) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.05 }}
        >
          <div className="group flex items-start gap-4 p-3 rounded-xl hover:bg-muted/40 transition-colors border border-transparent hover:border-border/50">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${item.iconBg}`}>
              <item.icon className={`w-5 h-5 ${item.iconColor}`} />
            </div>
            <div className="flex-1 space-y-1">
              <p className="text-sm font-semibold tracking-tight leading-none text-foreground">{item.title}</p>
              <p className="text-sm text-muted-foreground line-clamp-1">{item.description}</p>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0 pt-0.5">
              <span className="text-xs font-medium text-muted-foreground">{formatTime(item.timestamp)}</span>
              {getStatusBadge(item.status)}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default Activity;
