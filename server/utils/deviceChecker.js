import { getPrisma } from '../config/postgres.js';

/**
 * Check device limits based on subscription plan and handle warnings/suspensions
 * @param {string} userId - User ID
 * @param {string} deviceId - Device ID from frontend
 * @returns {Promise<{allowed: boolean, warning?: string, shouldSuspend?: boolean, deviceCount?: number}>}
 */
export const checkDeviceLimits = async (userId, deviceId) => {
  const prisma = getPrisma();
  
  // Get user and their plan
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      devices: true, // Get all devices for this user
    },
  });
  
  if (!user) {
    throw new Error('User not found');
  }
  
  const plan = user.subscriptionPlan || 'free';
  
  // Enterprise plan: 10 devices max
  if (plan === 'enterprise') {
    const existingDevice = user.devices.find(d => d.deviceId === deviceId);
    const uniqueDevices = user.devices.length;
    
    // If device already exists, just update lastActive and allow
    if (existingDevice) {
      await prisma.userDevice.update({
        where: { id: existingDevice.id },
        data: { lastActive: new Date() },
      });
      return { allowed: true, deviceCount: uniqueDevices };
    }
    
    // New device - check limits (10 devices max)
    const newDeviceCount = uniqueDevices + 1;
    
    if (newDeviceCount <= 10) {
      // 1-10 devices - allow
      return { allowed: true, deviceCount: newDeviceCount };
    } else if (newDeviceCount === 11) {
      // 11th device - suspend
      return { 
        allowed: false, 
        shouldSuspend: true, 
        deviceCount: newDeviceCount 
      };
    }
    
    // More than 11 devices - suspend
    return { 
      allowed: false, 
      shouldSuspend: true, 
      deviceCount: newDeviceCount 
    };
  }
  
  // Check if this device already exists for the user
  const existingDevice = user.devices.find(d => d.deviceId === deviceId);
  const uniqueDevices = user.devices.length;
  
  // If device already exists, just update lastActive and allow
  if (existingDevice) {
    await prisma.userDevice.update({
      where: { id: existingDevice.id },
      data: { lastActive: new Date() },
    });
    return { allowed: true, deviceCount: uniqueDevices };
  }
  
  // New device - check limits based on plan
  const newDeviceCount = uniqueDevices + 1;
  
  // Starter plan: 1 device allowed, warn on 2nd, suspend at 4+
  if (plan === 'starter') {
    if (newDeviceCount === 1) {
      // First device - allow (within limit)
      return { allowed: true, deviceCount: newDeviceCount };
    } else if (newDeviceCount === 2) {
      // Second device - allow with warning (exceeding limit, but allowed)
      return { 
        allowed: true, 
        warning: 'You are using your 2nd device. Your Starter plan allows 1 device. Please log out from other devices.',
        deviceCount: newDeviceCount 
      };
    } else if (newDeviceCount === 3) {
      // Third device - allow with warning (still allowed, but closer to suspension)
      return { 
        allowed: true, 
        warning: 'You are using your 3rd device. Your Starter plan allows 1 device. You will be suspended if you login from a 4th device.',
        deviceCount: newDeviceCount 
      };
    } else if (newDeviceCount >= 4) {
      // 4th or more device - suspend
      return { 
        allowed: false, 
        shouldSuspend: true, 
        deviceCount: newDeviceCount 
      };
    }
  }
  
  // Pro plan: 3 devices allowed, warn on 4th, suspend at 5+
  if (plan === 'pro') {
    if (newDeviceCount <= 3) {
      // 1-3 devices - allow
      return { allowed: true, deviceCount: newDeviceCount };
    } else if (newDeviceCount === 4) {
      // 4th device - allow with warning
      return { 
        allowed: true, 
        warning: 'You are using your 4th device. Your Pro plan allows 3 devices. Please log out from other devices.',
        deviceCount: newDeviceCount 
      };
    } else if (newDeviceCount >= 5) {
      // 5th or more device - suspend
      return { 
        allowed: false, 
        shouldSuspend: true, 
        deviceCount: newDeviceCount 
      };
    }
  }
  
  // Free plan: no limits (default)
  return { allowed: true, deviceCount: newDeviceCount };
};

/**
 * Register a device for a user
 * @param {string} userId - User ID
 * @param {string} deviceId - Device ID from frontend
 */
export const registerDevice = async (userId, deviceId) => {
  const prisma = getPrisma();
  
  // Upsert device (create if not exists, update lastActive if exists)
  await prisma.userDevice.upsert({
    where: {
      userId_deviceId: {
        userId: userId,
        deviceId: deviceId,
      },
    },
    update: {
      lastActive: new Date(),
    },
    create: {
      userId: userId,
      deviceId: deviceId,
      lastActive: new Date(),
    },
  });
};

/**
 * Suspend user and revoke all sessions
 * @param {string} userId - User ID
 */
export const suspendUserAndRevokeSessions = async (userId) => {
  const prisma = getPrisma();
  
  // Suspend user
  await prisma.user.update({
    where: { id: userId },
    data: {
      isActive: false,
      accountStatus: 'suspended',
    },
  });
  
  // Revoke all active sessions
  await prisma.session.updateMany({
    where: {
      userId: userId,
      isActive: true,
    },
    data: {
      isActive: false,
    },
  });
};

