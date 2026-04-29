
export const useNavigationTiles = () => {
  const getTileNavigationMap = () => ({
    'total_users': '/admin/users',
    'total_schools': '/admin/schools-and-users?tab=schools',
    'total_pdfs': '/admin/pdf-upload',
    'total_downloads': '/admin/analytics-reports?tab=content',
    'active_users': '/admin/analytics-reports?tab=user',
    'categories': '/admin/categories-management',
  });

  const handleTileClick = (tileName, navigate) => {
    const map = getTileNavigationMap();
    const destination = map[tileName];
    if (destination) {
      navigate(destination);
    }
  };

  const getTileAriaLabel = (tileName) => {
    const labels = {
      'total_users': 'View all registered users',
      'total_schools': 'View all registered schools',
      'total_pdfs': 'View document library',
      'total_downloads': 'View download analytics',
      'active_users': 'View active user analytics',
      'categories': 'Manage system categories',
    };
    return labels[tileName] || `Navigate to ${tileName.replace('_', ' ')}`;
  };

  return {
    getTileNavigationMap,
    handleTileClick,
    getTileAriaLabel
  };
};
