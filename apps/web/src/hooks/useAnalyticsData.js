
import { useState, useEffect } from 'react';
import pb from '@/lib/apiClient';
import { toast } from 'sonner';

const RANGE_DAYS = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 };

function parseDays(dateRange) {
  return RANGE_DAYS[dateRange] ?? 30;
}

function formatDate(isoDate) {
  return new Date(isoDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function sumCounts(arr) {
  return arr.reduce((s, d) => s + (d.count ?? 0), 0);
}

function calcGrowth(prev, curr) {
  if (!prev) return curr > 0 ? 100 : 0;
  return Math.round(((curr - prev) / prev) * 100);
}

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
        const days = parseDays(dateRange);
        // Fetch double the period so we can compare current vs prior for growth %
        const [dashboard, timeseries] = await Promise.all([
          pb.fetch('/dashboard', 'GET'),
          pb.fetch('/analytics/timeseries', 'GET', null, { days: days * 2 })
        ]);

        const dlAll = timeseries?.downloads_per_day ?? [];
        const regAll = timeseries?.registrations_per_day ?? [];

        // First half = prior period, second half = current period
        const prevDlSum = sumCounts(dlAll.slice(0, days));
        const currDlSum = sumCounts(dlAll.slice(days));
        const prevRegSum = sumCounts(regAll.slice(0, days));
        const currRegSum = sumCounts(regAll.slice(days));

        const userGrowthData = regAll.slice(days).map(d => ({
          name: formatDate(d.date),
          users: d.count
        }));
        const downloadTrendData = dlAll.slice(days).map(d => ({
          name: formatDate(d.date),
          downloads: d.count
        }));
        const topCategoriesData = (timeseries?.top_categories ?? []).map(c => ({
          name: c.category_name,
          value: c.count
        }));

        setData({
          overview: {
            totalUsers: dashboard?.user_count ?? 0,
            totalPdfs: dashboard?.pdf_count ?? 0,
            totalDownloads: dashboard?.total_downloads ?? 0,
            totalSchools: dashboard?.school_count ?? 0,
            activeUsersToday: dashboard?.active_sessions ?? 0,
            newRegistrations: currRegSum,
            userGrowth: calcGrowth(prevRegSum, currRegSum),
            pdfGrowth: 0,
            downloadGrowth: calcGrowth(prevDlSum, currDlSum),
            schoolGrowth: 0
          },
          charts: {
            userGrowth: userGrowthData,
            downloadTrends: downloadTrendData,
            topCategories: topCategoriesData,
            schoolDistribution: [
              { name: 'Active', value: dashboard?.active_school_count ?? 0 },
              { name: 'Inactive', value: dashboard?.inactive_school_count ?? 0 }
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
