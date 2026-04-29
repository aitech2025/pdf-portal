
import { useState, useEffect } from 'react';
import pb from '@/lib/apiClient';

export function useAdminDashboardData(dateRange = '30d') {
  const [data, setData] = useState({
    metrics: {
      totalUsers: 0,
      totalSchools: 0,
      totalPdfs: 0,
      totalDownloads: 0,
      activeUsersToday: 0,
      newRegistrations: 0,
    },
    trends: {
      users: 0,
      schools: 0,
      pdfs: 0,
      downloads: 0,
    },
    recentActivity: {
      uploads: [],
      downloads: [],
      registrations: [],
      events: [],
    },
    pendingItems: {
      pdfApprovals: 0,
      userRequests: 0,
      schoolRegistrations: 0,
      supportTickets: 0,
    },
    topPerformers: {
      pdfs: [],
      schools: [],
      users: [],
      uploaders: [],
    },
    charts: {
      userGrowth: [],
      downloadsTrend: [],
      topCategories: [],
      schoolDistribution: [],
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        // Fetch totals using getList with limit 1 to get totalItems efficiently
        const [
          usersRes, schoolsRes, pdfsRes, downloadsRes, 
          recentUploads, recentDownloads, recentUsers, recentEvents,
          pendingSchools, pendingUsers
        ] = await Promise.all([
          pb.collection('users').getList(1, 1, { $autoCancel: false }),
          pb.collection('schools').getList(1, 1, { $autoCancel: false }),
          pb.collection('pdfs').getList(1, 1, { $autoCancel: false }),
          pb.collection('downloadLogs').getList(1, 1, { $autoCancel: false }),
          
          pb.collection('pdfs').getList(1, 10, { sort: '-created', $autoCancel: false }),
          pb.collection('downloadLogs').getList(1, 10, { sort: '-created', expand: 'userId,pdfId', $autoCancel: false }),
          pb.collection('users').getList(1, 10, { sort: '-created', $autoCancel: false }),
          pb.collection('auditLogs').getList(1, 10, { sort: '-created', expand: 'userId', $autoCancel: false }),
          
          pb.collection('onboardingRequests').getList(1, 1, { filter: 'status="pending"', $autoCancel: false }),
          pb.collection('userRequests').getList(1, 1, { filter: 'status="pending"', $autoCancel: false })
        ]);

        // Mocking complex chart data for premium UI feel without heavy aggregation queries
        const mockUserGrowth = Array.from({ length: 12 }).map((_, i) => ({
          month: new Date(2025, i, 1).toLocaleString('default', { month: 'short' }),
          users: Math.floor(Math.random() * 500) + 100
        }));

        const mockDownloadsTrend = Array.from({ length: 30 }).map((_, i) => ({
          day: `Day ${i + 1}`,
          downloads: Math.floor(Math.random() * 200) + 50
        }));

        setData({
          metrics: {
            totalUsers: usersRes.totalItems,
            totalSchools: schoolsRes.totalItems,
            totalPdfs: pdfsRes.totalItems,
            totalDownloads: downloadsRes.totalItems,
            activeUsersToday: Math.floor(usersRes.totalItems * 0.15), // Mock active
            newRegistrations: Math.floor(usersRes.totalItems * 0.05), // Mock new
          },
          trends: {
            users: 12.5,
            schools: 5.2,
            pdfs: 8.4,
            downloads: -2.1,
          },
          recentActivity: {
            uploads: recentUploads.items,
            downloads: recentDownloads.items,
            registrations: recentUsers.items,
            events: recentEvents.items,
          },
          pendingItems: {
            pdfApprovals: 12, // Mock
            userRequests: pendingUsers.totalItems,
            schoolRegistrations: pendingSchools.totalItems,
            supportTickets: 5, // Mock
          },
          topPerformers: {
            pdfs: recentUploads.items.slice(0, 5), // Mocking with recent for now
            schools: schoolsRes.items.slice(0, 5),
            users: recentUsers.items.slice(0, 5),
            uploaders: recentUsers.items.slice(0, 5),
          },
          charts: {
            userGrowth: mockUserGrowth,
            downloadsTrend: mockDownloadsTrend,
            topCategories: [
              { name: 'Science', value: 400 },
              { name: 'Math', value: 300 },
              { name: 'History', value: 200 },
              { name: 'Art', value: 100 },
            ],
            schoolDistribution: [
              { name: 'Urban', value: 60 },
              { name: 'Suburban', value: 30 },
              { name: 'Rural', value: 10 },
            ]
          }
        });
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [dateRange]);

  return { data, loading, error };
}
