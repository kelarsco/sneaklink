/**
 * Account Status Notification Service
 * Sends automated email notifications when user account status changes
 * Supports: suspended, deactivated, banned status changes
 */

import { getPrisma } from '../config/postgres.js';
import { sendAccountStatusNotification } from './emailService.js';

/**
 * Notification types
 */
export const NOTIFICATION_TYPES = {
  AUTO_SUSPENSION_DEVICE: 'auto_suspension_device',
  ADMIN_SUSPENSION: 'admin_suspension',
  ADMIN_DEACTIVATION: 'admin_deactivation',
  AUTO_SUSPENSION_OTHER: 'auto_suspension_other',
};

/**
 * Detect the source/actor of status change
 */
export const detectStatusChangeSource = (oldStatus, newStatus, context = {}) => {
  // Check if it's a device limit violation (automatic)
  if (context.deviceLimitExceeded) {
    return {
      type: NOTIFICATION_TYPES.AUTO_SUSPENSION_DEVICE,
      actor: 'system',
      reason: 'multiple_device_login',
      isAutomatic: true,
    };
  }

  // Check if it's an admin action
  if (context.adminAction || context.adminId) {
    return {
      type: newStatus === 'deactivated' 
        ? NOTIFICATION_TYPES.ADMIN_DEACTIVATION 
        : NOTIFICATION_TYPES.ADMIN_SUSPENSION,
      actor: 'admin',
      reason: context.reason || 'policy_violation',
      isAutomatic: false,
      adminCaseId: context.adminCaseId,
    };
  }

  // Other automatic suspensions
  if (context.automaticReason) {
    return {
      type: NOTIFICATION_TYPES.AUTO_SUSPENSION_OTHER,
      actor: 'system',
      reason: context.automaticReason,
      isAutomatic: true,
    };
  }

  // Default: assume automatic if no context provided
  return {
    type: NOTIFICATION_TYPES.AUTO_SUSPENSION_OTHER,
    actor: 'system',
    reason: 'unknown',
    isAutomatic: true,
  };
};

/**
 * Get user-friendly violation reason
 */
export const getViolationReason = (reason, plan = 'free') => {
  const reasons = {
    multiple_device_login: `Your ${plan} plan allows a limited number of simultaneous device logins. You exceeded this limit.`,
    policy_violation: 'Our system detected a violation of our platform policies.',
    manipulative_use: 'Our system detected manipulative use of platform features.',
    feature_abuse: 'Our system detected abuse of platform features.',
    terms_breach: 'Our system detected a breach of our Terms of Service.',
    spam: 'Our automated security system detected spam activity.',
    fraud: 'Our automated security system detected fraudulent activity.',
    unknown: 'Our automated security system detected a policy violation.',
  };

  return reasons[reason] || reasons.unknown;
};

/**
 * Get resolution steps based on notification type
 */
export const getResolutionSteps = (notificationType, plan = 'free', maxDevices = 1) => {
  if (notificationType === NOTIFICATION_TYPES.AUTO_SUSPENSION_DEVICE) {
    return [
      `Upgrade to a plan that allows more devices (your current ${plan} plan allows ${maxDevices} device${maxDevices === 1 ? '' : 's'})`,
      'Log out from other devices to free up your device limit',
      'Contact support if you believe this is an error',
    ];
  }

  if (notificationType === NOTIFICATION_TYPES.ADMIN_SUSPENSION || 
      notificationType === NOTIFICATION_TYPES.ADMIN_DEACTIVATION) {
    return [
      'Review our Terms of Service and Community Guidelines',
      'Submit an appeal through our support system',
      'Contact our support team if you have questions',
    ];
  }

  return [
    'Review our Terms of Service',
    'Contact support for assistance',
  ];
}

/**
 * Track notification in database
 */
export const trackNotification = async (userId, notificationType, status, result) => {
  try {
    const prisma = getPrisma();
    
    // Try to create notification history record
    try {
      await prisma.notificationHistory.create({
        data: {
          userId,
          notificationType,
          accountStatus: status,
          success: result.success || false,
          errorMessage: result.error || null,
        },
      });
    } catch (error) {
      // Table might not exist yet (migration not run), just log
      if (error.message?.includes('does not exist') || error.message?.includes('Unknown model')) {
        console.log('[Notification] NotificationHistory table not found - run migration to enable tracking');
      } else {
        console.error('[Notification] Could not track in database:', error.message);
      }
    }

    // Also log to console
    if (result.success) {
      console.log(`✅ [Notification] Sent ${notificationType} to user ${userId}`);
    } else {
      console.error(`❌ [Notification] Failed to send ${notificationType} to user ${userId}:`, result.error);
    }
  } catch (error) {
    console.error('[Notification] Error tracking notification:', error);
  }
};

/**
 * Main function to send account status notification
 * Called when account status changes
 */
export const notifyAccountStatusChange = async (user, oldStatus, newStatus, context = {}) => {
  try {
    // Only notify on status changes to suspended or deactivated
    if (newStatus !== 'suspended' && newStatus !== 'deactivated') {
      return { success: true, skipped: true, reason: 'Status not requiring notification' };
    }

    // Don't notify if already in that status (prevent duplicate notifications)
    if (oldStatus === newStatus) {
      return { success: true, skipped: true, reason: 'Status unchanged' };
    }

    // Verify user exists and has email
    if (!user || !user.email) {
      return { success: false, error: 'User or email not found' };
    }

    // Detect notification type and source
    const sourceInfo = detectStatusChangeSource(oldStatus, newStatus, context);
    
    // Get user context
    const plan = user.subscriptionPlan || 'free';
    const maxDevices = context.maxDevices || 1;
    
    // Get violation reason
    const violationReason = getViolationReason(sourceInfo.reason, plan);
    
    // Get resolution steps
    const resolutionSteps = getResolutionSteps(sourceInfo.type, plan, maxDevices);

    // Prepare notification data
    const notificationData = {
      userName: user.name || 'User',
      userEmail: user.email,
      accountStatus: newStatus,
      notificationType: sourceInfo.type,
      violationReason,
      resolutionSteps,
      plan,
      maxDevices,
      adminCaseId: sourceInfo.adminCaseId,
      violationDate: new Date().toISOString(),
    };

    // Send email notification
    const result = await sendAccountStatusNotification(notificationData);

    // Track notification
    await trackNotification(user.id, sourceInfo.type, newStatus, result);

    return result;
  } catch (error) {
    console.error('[Notification] Error in notifyAccountStatusChange:', error);
    
    // Track failed notification
    await trackNotification(
      user?.id || 'unknown',
      context.notificationType || 'unknown',
      newStatus,
      { success: false, error: error.message }
    );

    return { success: false, error: error.message };
  }
};

/**
 * Helper to get device limit for plan
 */
export const getDeviceLimitForPlan = (plan) => {
  const limits = {
    free: 1,
    starter: 2,
    pro: 3,
    enterprise: -1, // unlimited
  };
  return limits[plan] || 1;
};

