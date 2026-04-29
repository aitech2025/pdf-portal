
import pb from '@/lib/apiClient';

export const createNotification = async (recipientId, type, subject, message, method) => {
  try {
    await pb.collection('notifications').create({
      recipientId,
      type,
      subject,
      message,
      notificationMethod: method,
      status: 'pending'
    }, { $autoCancel: false });
  } catch (error) {
    console.error('Failed to create notification:', error);
  }
};

export const notifyOnboardingSubmission = (recipientId, schoolName) => 
  createNotification(recipientId, 'onboarding_submission', 'New Onboarding Request', `${schoolName} has requested to join.`, 'email');

export const notifyOnboardingApproval = (recipientId, schoolId, password) => 
  createNotification(recipientId, 'onboarding_approval', 'Welcome to EduPortal', `Your school has been approved. ID: ${schoolId}, Password: ${password}`, 'email');

export const notifyOnboardingRejection = (recipientId, reason) => 
  createNotification(recipientId, 'onboarding_rejection', 'Update on your EduPortal Request', `Your request was not approved. Reason: ${reason}`, 'email');

export const notifyUserRequestSubmission = (recipientId, userName) => 
  createNotification(recipientId, 'user_request_submission', 'New User Request', `A request for user ${userName} has been submitted.`, 'email');

export const notifyUserRequestApproval = (recipientId, userName, password) => 
  createNotification(recipientId, 'user_request_approval', 'User Request Approved', `User ${userName} approved. Temp Password: ${password}`, 'email');

export const notifyUserRequestRejection = (recipientId, userName, reason) => 
  createNotification(recipientId, 'user_request_rejection', 'User Request Rejected', `Request for ${userName} rejected. Reason: ${reason}`, 'email');

export const notifyPasswordReset = (recipientId, newPassword) => 
  createNotification(recipientId, 'password_reset', 'Password Reset', `Your new password is: ${newPassword}`, 'email');

export const notifySchoolDeactivation = (recipientId, reason) => 
  createNotification(recipientId, 'school_deactivation', 'Account Deactivated', `Your school account has been deactivated. Reason: ${reason}`, 'email');
