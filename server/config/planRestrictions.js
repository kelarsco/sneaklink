/**
 * Plan-based Feature Restrictions
 * Defines what features each subscription plan can access
 */

export const PLAN_RESTRICTIONS = {
  free: {
    name: 'Free',
    price: 0,
    // Free users can view stores but cannot use filters or export features
    canUseFilters: false, // Cannot use filters (countries, themes, tags, dates)
    canExportCSV: false, // Cannot export to CSV
    canCopyLinks: false, // Cannot copy links
    canSearch: true, // Can search/view stores without filters
    maxFilterQueriesPerMonth: 0,
    maxCSVExportsPerDay: 0,
    maxCopyOperationsPerDay: 0,
    maxUsers: 0,
    maxDevices: -1, // Unlimited devices for new/free users
    maxLinksPerCSV: 0,
    requiresUpgrade: false, // Can use basic features
    suspendAfterDevices: -1, // Never suspend free users
  },
  starter: {
    name: 'Starter',
    price: 49, // $49 per month
    canUseFilters: true,
    canExportCSV: true,
    canCopyLinks: true,
    canSearch: true,
    maxFilterQueriesPerMonth: 1000,
    maxCSVExportsPerDay: 2,
    maxCopyOperationsPerDay: 2,
    maxUsers: 1,
    maxDevices: 2, // Up to 2 devices
    maxLinksPerCSV: 200, // Max 200 links per CSV export
    suspendAfterDevices: 3, // Suspend account if logged in on 3rd device (exceeds limit)
  },
  pro: {
    name: 'Pro',
    price: null, // Price not specified
    canUseFilters: true,
    canExportCSV: true,
    canCopyLinks: true,
    canSearch: true,
    maxFilterQueriesPerMonth: 10000,
    maxCSVExportsPerDay: 10,
    maxCopyOperationsPerDay: 5,
    maxUsers: 3,
    maxDevices: 3, // Up to 3 devices
    maxLinksPerCSV: 500, // Max 500 links per CSV export
    suspendAfterDevices: 4, // Suspend account if logged in on 4th device (exceeds limit)
  },
  enterprise: {
    name: 'Enterprise',
    price: null, // Custom pricing
    canUseFilters: true,
    canExportCSV: true,
    canCopyLinks: true,
    canSearch: true,
    maxFilterQueriesPerMonth: -1, // Unlimited
    maxCSVExportsPerDay: -1, // Unlimited
    maxCopyOperationsPerDay: -1, // Unlimited
    maxUsers: -1, // Unlimited
    maxDevices: 10, // Up to 10 devices
    maxLinksPerCSV: -1, // Unlimited
    suspendAfterDevices: 11, // Suspend account if logged in on 11th device (exceeds limit)
  },
};

/**
 * Get restrictions for a specific plan
 */
export const getPlanRestrictions = (plan) => {
  return PLAN_RESTRICTIONS[plan] || PLAN_RESTRICTIONS.free;
};

/**
 * Check if a plan can perform a specific action
 */
export const canPerformAction = (plan, action) => {
  const restrictions = getPlanRestrictions(plan);
  return restrictions[action] || false;
};

/**
 * Get maximum filter queries per month for a plan
 */
export const getMaxFilterQueriesPerMonth = (plan) => {
  const restrictions = getPlanRestrictions(plan);
  return restrictions.maxFilterQueriesPerMonth === -1 ? Infinity : restrictions.maxFilterQueriesPerMonth;
};

/**
 * Get maximum CSV exports per day for a plan
 */
export const getMaxCSVExportsPerDay = (plan) => {
  const restrictions = getPlanRestrictions(plan);
  return restrictions.maxCSVExportsPerDay === -1 ? Infinity : restrictions.maxCSVExportsPerDay;
};

/**
 * Get maximum copy operations per day for a plan
 */
export const getMaxCopyOperationsPerDay = (plan) => {
  const restrictions = getPlanRestrictions(plan);
  return restrictions.maxCopyOperationsPerDay === -1 ? Infinity : restrictions.maxCopyOperationsPerDay;
};

/**
 * Get maximum devices for a plan
 */
export const getMaxDevices = (plan) => {
  const restrictions = getPlanRestrictions(plan);
  return restrictions.maxDevices === -1 ? Infinity : restrictions.maxDevices;
};

/**
 * Get maximum links per CSV for a plan
 */
export const getMaxLinksPerCSV = (plan) => {
  const restrictions = getPlanRestrictions(plan);
  // -1 means unlimited, null means no limit specified (treat as unlimited for backward compatibility)
  if (restrictions.maxLinksPerCSV === -1 || restrictions.maxLinksPerCSV === null) {
    return Infinity;
  }
  return restrictions.maxLinksPerCSV;
};

/**
 * Get device suspension threshold for a plan
 */
export const getSuspendAfterDevices = (plan) => {
  const restrictions = getPlanRestrictions(plan);
  return restrictions.suspendAfterDevices === -1 ? Infinity : restrictions.suspendAfterDevices;
};
