
import pb from '@/lib/apiClient';

export const useNotificationNavigation = () => {
  const getNotificationRoute = (notificationType) => {
    const routes = {
      'pdf_uploaded': '/admin/pdf-upload',
      'user_registered': '/admin/schools-and-users?tab=users',
      'school_added': '/admin/schools-and-users?tab=schools',
      'pdf_downloaded': '/admin/analytics-reports?tab=content',
      'user_activity': '/admin/analytics-reports?tab=user',
      'system_alert': '/admin/settings',
      'onboarding_submission': '/admin/schools-and-users?tab=onboarding',
      'user_request_submission': '/admin/schools-and-users?tab=users'
    };
    return routes[notificationType] || '/admin/notifications';
  };

  const extractNotificationType = (notification) => {
    // If there's an explicit type field, use it. Otherwise try to infer.
    if (notification.type) return notification.type;
    
    const subject = (notification.subject || '').toLowerCase();
    if (subject.includes('pdf') || subject.includes('document')) return 'pdf_uploaded';
    if (subject.includes('school')) return 'school_added';
    if (subject.includes('request')) return 'user_request_submission';
    
    return 'default';
  };

  const handleNotificationClick = async (notification, navigate) => {
    try {
      // Mark as read if it isn't already
      if (!notification.read) {
        await pb.collection('notifications').update(notification.id, {
          read: true
        }, { $autoCancel: false });
      }
      
      const type = extractNotificationType(notification);
      const route = getNotificationRoute(type);
      navigate(route);
      
      return true;
    } catch (err) {
      console.error('Error handling notification click:', err);
      return false;
    }
  };

  return {
    getNotificationRoute,
    handleNotificationClick,
    extractNotificationType
  };
};
