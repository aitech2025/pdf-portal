
import { useState, useEffect } from 'react';
import pb from '@/lib/apiClient';
import { toast } from 'sonner';

export function useAnalyticsData(dateRange = '30d') {
  const [data, setData] = useState({
    overview: {
      totalUsers: 0,
      totalPdfs: 0,
      totalDownloads: 0,
      totalSchools: 0,
      activeUsersToday: 0,
      newRegistrations: 0,
      userGrowth: 0,
      pdfGrowth: 0,
      downloadGrowth: 0,
      schoolGrowth: 0
    },
    charts: {
      userGrowth: [],
      downloadTrends: [],
      topCategories: [],
      schoolDistribution: []
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        // In a real app, this would use complex aggregations or a dedicated endpoint.
        // For this implementation, we'll fetch basic counts to populate the dashboard.
        const [users, pdfs, downloads, schools] = await Promise.all([
          pb.collection('users').getList(1, 1, { $autoCancel: false }),
          pb.collection('pdfs').getList(1, 1, { $autoCancel: false }),
          pb.collection('downloadLogs').getList(1, 1, { $autoCancel: false }),
          pb.collection('schools').getList(1, 1, { $autoCancel: false })
        ]);

        // Mock chart data for demonstration
        const mockUserGrowth = Array.from({ length: 7 }).map((_, i) => ({
          name: `Day ${i + 1}`,
          users: Math.floor(Math.random() * 100) + 50
        }));

        const mockDownloads = Array.from({ length: 7 }).map((_, i) => ({
          name: `Day ${i + 1}`,
          downloads: Math.floor(Math.random() * 500) + 100
        }));

        setData({
          overview: {
            totalUsers: users.totalItems,
            totalPdfs: pdfs.totalItems,
            totalDownloads: downloads.totalItems,
            totalSchools: schools.totalItems,
            activeUsersToday: Math.floor(users.totalItems * 0.1),
            newRegistrations: Math.floor(users.totalItems * 0.05),
            userGrowth: 12,
            pdfGrowth: 8,
            downloadGrowth: -3,
            schoolGrowth: 5
          },
          charts: {
            userGrowth: mockUserGrowth,
            downloadTrends: mockDownloads,
            topCategories: [
              { name: 'Math', value: 400 },
              { name: 'Science', value: 300 },
              { name: 'History', value: 200 },
              { name: 'Art', value: 100 }
            ],
            schoolDistribution: [
              { name: 'Public', value: 60 },
              { name: 'Private', value: 30 },
              { name: 'Charter', value: 10 }
            ]
          }
        });
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
        toast.error('Failed to load analytics data');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [dateRange]);

  return { data, loading };
}
