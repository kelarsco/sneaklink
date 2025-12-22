/**
 * Device Tracking Middleware
 * Tracks user devices and enforces device limits based on subscription plans
 */

import { getPrisma } from '../config/postgres.js';
import { getPlanRestrictions, getMaxDevices, getSuspendAfterDevices } from '../config/planRestrictions.js';
import crypto from 'crypto';

/**
 * Generate a device ID from request headers
 */
export const generateDeviceId = (req) => {
  const userAgent = req.headers['user-agent'] || '';
  const ip = req.ip || req.connection.remoteAddress || '';
  const acceptLanguage = req.headers['accept-language'] || '';
  
  // Create a hash of device characteristics
  const deviceString = `${userAgent}-${ip}-${acceptLanguage}`;
  return crypto.createHash('sha256').update(deviceString).digest('hex').substring(0, 16);
};

/**
 * Track device and enforce device limits
 */
export const trackDevice = async (req, res, next) => {
  try {
    if (!req.user) {
      // No authentication, skip device tracking
      return next();
    }

    const prisma = getPrisma();
    const userDoc = await prisma.user.findUnique({
      where: { id: req.user.userId || req.user.id },
      include: {
        devices: true,
      },
    });
    
    if (!userDoc) {
      return next();
    }

    const plan = userDoc.subscriptionPlan || 'free';
    const deviceId = generateDeviceId(req);
    const sessionId = req.user.sessionId;

    // Find existing device
    const existingDevice = userDoc.devices.find(
      d => d.deviceId === deviceId
    );

    // Update maxDevices based on plan if not set correctly
    let planMaxDevices = getMaxDevices(plan);
    
    // Free users need at least 1 device to use the app (viewing stores)
    if (planMaxDevices === 0) {
      planMaxDevices = 1;
    }
    
    const effectiveMaxDevices = Math.max(1, planMaxDevices);
    
    if (!userDoc.maxDevices || userDoc.maxDevices < 1) {
      await prisma.user.update({
        where: { id: userDoc.id },
        data: { maxDevices: effectiveMaxDevices },
      });
    }
    
    const maxDevices = userDoc.maxDevices || effectiveMaxDevices;
    const suspendAfterDevices = getSuspendAfterDevices(plan);

    // If device exists, update last active
    if (existingDevice) {
      await prisma.userDevice.update({
        where: { id: existingDevice.id },
        data: { lastActive: new Date() },
      });
      return next();
    }

    // Get current device count
    const currentDeviceCount = userDoc.devices.length;

    // New device - check limits
    if (maxDevices === 1) {
      // Single device plan - log out all other devices
      if (currentDeviceCount > 0) {
        // Get all device IDs to remove
        const deviceIds = userDoc.devices.map(d => d.id);
        
        // Delete all other devices
        await prisma.userDevice.deleteMany({
          where: {
            userId: userDoc.id,
            id: { in: deviceIds },
          },
        });

        // Terminate all other sessions
        await prisma.session.updateMany({
          where: {
            userId: userDoc.id,
            isActive: true,
          },
          data: { isActive: false },
        });
      }
      
      // Create new device
      await prisma.userDevice.create({
        data: {
          userId: userDoc.id,
          deviceId,
          lastActive: new Date(),
        },
      });
    } else if (maxDevices !== -1 && currentDeviceCount >= maxDevices) {
      // Device limit reached
      if (plan === 'free' && maxDevices >= 1) {
        // Free user - replace existing device
        const oldestDevice = userDoc.devices.sort((a, b) => 
          new Date(a.lastActive) - new Date(b.lastActive)
        )[0];
        
        if (oldestDevice) {
          await prisma.userDevice.delete({
            where: { id: oldestDevice.id },
          });
        }
        
        await prisma.userDevice.create({
          data: {
            userId: userDoc.id,
            deviceId,
            lastActive: new Date(),
          },
        });
        return next();
      }
      
      // Block paid users who exceed their device limit
      return res.status(403).json({
        error: 'Device limit reached',
        message: `Your plan allows up to ${maxDevices} device${maxDevices === 1 ? '' : 's'}. Please log out from another device or upgrade your plan.`,
        maxDevices,
        currentDevices: currentDeviceCount,
      });
    } else {
      // Add new device
      await prisma.userDevice.create({
        data: {
          userId: userDoc.id,
          deviceId,
          lastActive: new Date(),
        },
      });
    }

    // Check for suspension threshold
    if (suspendAfterDevices !== -1) {
      const updatedDevices = await prisma.userDevice.findMany({
        where: { userId: userDoc.id },
      });
      
      if (updatedDevices.length >= suspendAfterDevices) {
        // Get old status before updating
        const oldStatus = userDoc.accountStatus || 'active';
        const currentSuspensionCount = userDoc.suspensionCount || 0;
        
        // Check if this is the second suspension - auto-deactivate
        if (currentSuspensionCount >= 1) {
          // Second suspension - auto-deactivate
          await prisma.user.update({
            where: { id: userDoc.id },
            data: {
              isActive: false,
              accountStatus: 'deactivated',
              suspensionCount: currentSuspensionCount + 1,
            },
          });
          
          // Terminate all sessions
          await prisma.session.updateMany({
            where: { userId: userDoc.id },
            data: { isActive: false },
          });

          // Send deactivation notification
          const { notifyAccountStatusChange } = await import('../services/accountStatusNotificationService.js');
          notifyAccountStatusChange(
            userDoc,
            oldStatus,
            'deactivated',
            {
              deviceLimitExceeded: true,
              maxDevices: suspendAfterDevices,
              currentDevices: updatedDevices.length,
              notificationType: 'auto_deactivation_repeat_violation',
              reason: 'Multiple device login violations. Your account has been automatically deactivated after a second suspension. Please contact support for review.',
            }
          ).catch(err => console.error('[Device Tracking] Failed to send notification:', err));

          return res.status(403).json({
            error: 'Account deactivated',
            message: `Your account has been automatically deactivated because you have violated the device login limit multiple times. Please contact support for review.`,
            deactivated: true,
          });
        }
        
        // First suspension - suspend the account and increment count
        await prisma.user.update({
          where: { id: userDoc.id },
          data: {
            isActive: false,
            accountStatus: 'suspended',
            suspensionCount: currentSuspensionCount + 1,
          },
        });
        
        // Terminate all sessions
        await prisma.session.updateMany({
          where: { userId: userDoc.id },
          data: { isActive: false },
        });

        // Send notification email (async, don't wait)
        const { notifyAccountStatusChange } = await import('../services/accountStatusNotificationService.js');
        notifyAccountStatusChange(
          userDoc,
          oldStatus,
          'suspended',
          {
            deviceLimitExceeded: true,
            maxDevices: suspendAfterDevices,
            currentDevices: updatedDevices.length,
            notificationType: 'auto_suspension_device',
          }
        ).catch(err => console.error('[Device Tracking] Failed to send notification:', err));

        return res.status(403).json({
          error: 'Account suspended',
          message: `Your account has been suspended because you have logged in from ${updatedDevices.length} different devices, which exceeds your plan's limit of ${suspendAfterDevices}. Please contact support.`,
          suspended: true,
        });
      }
    }

    next();
  } catch (error) {
    console.error('Error tracking device:', error);
    // Don't block the request if device tracking fails
    next();
  }
};

/**
 * Clean up old devices (remove devices not used in last 30 days)
 */
export const cleanupOldDevices = async (userDoc) => {
  if (!userDoc || !userDoc.id) {
    return;
  }

  const prisma = getPrisma();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  await prisma.userDevice.deleteMany({
    where: {
      userId: userDoc.id,
      lastActive: {
        lt: thirtyDaysAgo,
      },
    },
  });
};
