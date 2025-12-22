/**
 * Usage Tracking Middleware
 * Tracks and enforces usage limits based on subscription plans
 */

import { getPrisma } from '../config/postgres.js';
import {
  getPlanRestrictions,
  getMaxFilterQueriesPerMonth,
  getMaxCSVExportsPerDay,
  getMaxCopyOperationsPerDay,
  getMaxLinksPerCSV,
} from '../config/planRestrictions.js';

/**
 * Reset usage counters if needed (monthly/daily resets)
 */
export const resetUsageIfNeeded = async (userDoc) => {
  const prisma = getPrisma();
  const now = new Date();
  const updateData = {};

  // Reset monthly filter queries if needed
  if (userDoc.filterQueriesResetDate) {
    const resetDate = new Date(userDoc.filterQueriesResetDate);
    const nextMonth = new Date(resetDate);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    
    if (now >= nextMonth) {
      updateData.filterQueriesThisMonth = 0;
      updateData.filterQueriesResetDate = now;
    }
  }

  // Reset daily CSV exports if needed
  if (userDoc.csvExportsResetDate) {
    const resetDate = new Date(userDoc.csvExportsResetDate);
    const nextDay = new Date(resetDate);
    nextDay.setDate(nextDay.getDate() + 1);
    
    if (now >= nextDay) {
      updateData.csvExportsToday = 0;
      updateData.csvExportsResetDate = now;
    }
  }

  // Reset daily copy operations if needed
  if (userDoc.copyOperationsResetDate) {
    const resetDate = new Date(userDoc.copyOperationsResetDate);
    const nextDay = new Date(resetDate);
    nextDay.setDate(nextDay.getDate() + 1);
    
    if (now >= nextDay) {
      updateData.copyOperationsToday = 0;
      updateData.copyOperationsResetDate = now;
    }
  }

  if (Object.keys(updateData).length > 0) {
    const updated = await prisma.user.update({
      where: { id: userDoc.id },
      data: updateData,
    });
    return updated;
  }

  return userDoc;
};

/**
 * Check and track filter query usage
 * Only blocks if filters are actually being used
 */
export const checkFilterQueryUsage = async (req, res, next) => {
  try {
    // Check if any filters are being used
    const hasFilters = !!(
      req.query.countries || 
      req.query.themes || 
      req.query.tags || 
      req.query.dateFrom || 
      req.query.dateTo ||
      req.query.businessModel
    );

    // If no filters are used, allow the request to proceed (anyone can view stores without filters)
    if (!hasFilters) {
      // Still try to get user info for plan limits, but don't block
      if (req.user) {
        try {
          const prisma = getPrisma();
          const userDoc = await prisma.user.findUnique({
            where: { id: req.user.userId || req.user.id },
          });
          if (userDoc) {
            const plan = userDoc.subscriptionPlan || 'free';
            req.userPlan = plan;
            req.userRestrictions = getPlanRestrictions(plan);
            req.userDoc = userDoc;
          }
        } catch (error) {
          // Ignore errors when getting user info for non-filtered queries
        }
      }
      return next();
    }

    // Filters are being used - check plan restrictions
    if (!req.user) {
      // Unauthenticated users cannot use filters
      return res.status(403).json({
        error: 'Authentication required',
        message: 'Filtering requires authentication. Please log in to use filters.',
        requiresAuth: true,
      });
    }

    const prisma = getPrisma();
    let userDoc = await prisma.user.findUnique({
      where: { id: req.user.userId || req.user.id },
    });
    if (!userDoc) {
      return res.status(404).json({
        error: 'User not found',
      });
    }

    // Reset usage if needed
    userDoc = await resetUsageIfNeeded(userDoc);

    const plan = userDoc.subscriptionPlan || 'free';
    const restrictions = getPlanRestrictions(plan);

    // Free users cannot use filters
    if (plan === 'free' || !restrictions.canUseFilters) {
      return res.status(403).json({
        error: 'Upgrade required',
        message: 'Filtering is not available on the Free plan. Please upgrade to access this feature.',
        requiresUpgrade: true,
        upgradeUrl: '/account/manage-plan',
      });
    }

    // Check monthly limit
    // Get filterCount from query params (if provided, represents number of filter interactions)
    const filterCount = req.query.filterCount ? parseInt(req.query.filterCount, 10) : 1;
    const effectiveFilterCount = Math.max(1, filterCount || 1); // Ensure at least 1
    
    const maxQueries = getMaxFilterQueriesPerMonth(plan);
    const currentUsage = userDoc.filterQueriesThisMonth || 0;
    const projectedUsage = currentUsage + effectiveFilterCount;
    
    if (currentUsage >= maxQueries) {
      return res.status(403).json({
        error: 'Monthly limit reached',
        message: `You have reached your monthly limit of ${maxQueries} filter queries. Please upgrade or wait until next month.`,
        limit: maxQueries,
        used: currentUsage,
      });
    }
    
    // Check if adding filterCount would exceed the limit
    if (projectedUsage > maxQueries) {
      return res.status(403).json({
        error: 'Monthly limit exceeded',
        message: `Applying ${effectiveFilterCount} filter(s) would exceed your monthly limit of ${maxQueries} filter queries (${currentUsage} used, ${maxQueries - currentUsage} remaining). Please reduce the number of filters or upgrade your plan.`,
        limit: maxQueries,
        used: currentUsage,
        requested: effectiveFilterCount,
        remaining: maxQueries - currentUsage,
      });
    }

    // Increment usage (will be saved after successful query)
    req.trackFilterQuery = true;
    req.userDoc = userDoc;
    req.userPlan = plan;
    req.userRestrictions = restrictions;
    req.filterCount = effectiveFilterCount; // Store for use in tracking

    next();
  } catch (error) {
    console.error('Error checking filter query usage:', error);
    // Don't block the request if there's an error - allow it to proceed
    next();
  }
};

/**
 * Track filter query after successful request
 * @param {Object} userDoc - User document
 * @param {number} count - Number of filter interactions to track (default: 1)
 */
export const trackFilterQuery = async (userDoc, count = 1) => {
  if (!userDoc) return;
  
  // Ensure count is a positive integer
  const filterCount = Math.max(1, parseInt(count, 10) || 1);
  
  const prisma = getPrisma();
  await prisma.user.update({
    where: { id: userDoc.id },
    data: {
      filterQueriesThisMonth: (userDoc.filterQueriesThisMonth || 0) + filterCount,
    },
  });
};

/**
 * Check and track CSV export usage
 */
export const checkCSVExportUsage = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    const prisma = getPrisma();
    let userDoc = await prisma.user.findUnique({
      where: { id: req.user.userId || req.user.id },
    });
    if (!userDoc) {
      return res.status(404).json({
        error: 'User not found',
      });
    }

    // Reset usage if needed
    userDoc = await resetUsageIfNeeded(userDoc);

    const plan = userDoc.subscriptionPlan || 'free';
    const { getPlanRestrictions, getMaxCSVExportsPerDay, getMaxLinksPerCSV } = await import('../config/planRestrictions.js');
    const restrictions = getPlanRestrictions(plan);

    // Free users cannot export
    if (plan === 'free' || !restrictions.canExportCSV) {
      return res.status(403).json({
        error: 'Upgrade required',
        message: 'CSV export is not available on the Free plan. Please upgrade to access this feature.',
        requiresUpgrade: true,
        upgradeUrl: '/account/manage-plan',
      });
    }

    // Check daily limit
    const maxExports = getMaxCSVExportsPerDay(plan);
    if (userDoc.csvExportsToday >= maxExports) {
      return res.status(403).json({
        error: 'Daily limit reached',
        message: `You have reached your daily limit of ${maxExports} CSV exports. Please upgrade or try again tomorrow.`,
        limit: maxExports,
        used: userDoc.csvExportsToday,
        limitReached: true, // Flag to distinguish from free user restriction
      });
    }

    // Check links per CSV limit
    const maxLinks = getMaxLinksPerCSV(plan);
    if (maxLinks !== Infinity && req.body?.storeIds && req.body.storeIds.length > maxLinks) {
      return res.status(403).json({
        error: 'CSV size limit exceeded',
        message: `Your plan allows up to ${maxLinks} links per CSV export. Please reduce the number of links or upgrade.`,
        limit: maxLinks,
        requested: req.body.storeIds.length,
      });
    }

    req.trackCSVExport = true;
    req.userDoc = userDoc;
    req.userPlan = plan;

    next();
  } catch (error) {
    console.error('Error checking CSV export usage:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to check usage limits',
    });
  }
};

/**
 * Track CSV export after successful request
 */
export const trackCSVExport = async (userDoc) => {
  if (!userDoc) return;
  
  const prisma = getPrisma();
  await prisma.user.update({
    where: { id: userDoc.id },
    data: {
      csvExportsToday: (userDoc.csvExportsToday || 0) + 1,
    },
  });
};

/**
 * Check and track copy operation usage
 */
export const checkCopyUsage = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    const prisma = getPrisma();
    let userDoc = await prisma.user.findUnique({
      where: { id: req.user.userId || req.user.id },
    });
    if (!userDoc) {
      return res.status(404).json({
        error: 'User not found',
      });
    }

    // Reset usage if needed
    userDoc = await resetUsageIfNeeded(userDoc);

    const plan = userDoc.subscriptionPlan || 'free';
    const restrictions = getPlanRestrictions(plan);

    // Free users cannot copy
    if (plan === 'free' || !restrictions.canCopyLinks) {
      return res.status(403).json({
        error: 'Upgrade required',
        message: 'Copy links is not available on the Free plan. Please upgrade to access this feature.',
        requiresUpgrade: true,
        upgradeUrl: '/account/manage-plan',
      });
    }

    // Check daily limit
    const maxCopies = getMaxCopyOperationsPerDay(plan);
    if (userDoc.copyOperationsToday >= maxCopies) {
      return res.status(403).json({
        error: 'Daily limit reached',
        message: `You have reached your daily limit of ${maxCopies} copy operations. Please upgrade or try again tomorrow.`,
        limit: maxCopies,
        used: userDoc.copyOperationsToday,
      });
    }

    req.trackCopy = true;
    req.userDoc = userDoc;
    req.userPlan = plan;

    next();
  } catch (error) {
    console.error('Error checking copy usage:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to check usage limits',
    });
  }
};

/**
 * Track copy operation after successful request
 */
export const trackCopy = async (userDoc) => {
  if (!userDoc) return;
  
  const prisma = getPrisma();
  await prisma.user.update({
    where: { id: userDoc.id },
    data: {
      copyOperationsToday: (userDoc.copyOperationsToday || 0) + 1,
    },
  });
};
