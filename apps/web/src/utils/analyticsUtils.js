
export const calculateGrowth = (current, previous) => {
  if (!previous || previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
};

export const formatNumber = (num) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  return num.toString();
};

export const getTrendColor = (growth, reverse = false) => {
  if (growth === 0) return 'text-muted-foreground';
  const isPositive = growth > 0;
  const isGood = reverse ? !isPositive : isPositive;
  return isGood ? 'text-emerald-500' : 'text-rose-500';
};
