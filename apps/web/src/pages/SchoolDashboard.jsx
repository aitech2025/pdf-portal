
import React, { useState, useEffect } from 'react';
import pb from '@/lib/apiClient';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const SchoolDashboard = () => {
  const { currentUser } = useAuth();
  const [stats, setStats] = useState({
    totalDownloads: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!currentUser?.schoolId) return;
      
      try {
        const downloads = await pb.collection('downloadLogs').getList(1, 1, { 
          filter: `schoolId="${currentUser.schoolId}"`,
          $autoCancel: false 
        });

        setStats({
          totalDownloads: downloads.totalItems
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [currentUser]);

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <h1 className="text-3xl font-bold">School Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-2"><Skeleton className="h-4 w-24" /></CardHeader>
            <CardContent><Skeleton className="h-8 w-16" /></CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">School Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Downloads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalDownloads}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SchoolDashboard;
