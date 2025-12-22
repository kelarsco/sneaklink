/**
 * Plan-based Access Control Middleware
 * Enforces subscription plan restrictions on API endpoints
 */

import { getPlanRestrictions, canPerformAction } from '../config/planRestrictions.js';
import { getPrisma } from '../config/postgres.js';

/**
 * Middleware to check if user's plan allows a specific action
 * Usage: router.post('/scrape', authenticate, checkPlanAction('canScrape'), handler)
 */
export const checkPlanAction = (action) => {
  return async (req, res, next) => {
    try {
      // Get user from request (set by authenticate middleware)
      const user = req.user;
      
      if (!user) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Authentication required',
        });
      }

      // Get user's current plan from database
      const prisma = getPrisma();
      const userDoc = await prisma.user.findUnique({
        where: { id: user.userId || user.id },
      });
      if (!userDoc) {
        return res.status(404).json({
          error: 'User not found',
          message: 'User account not found',
        });
      }

      // Check subscription status
      if (userDoc.subscriptionStatus !== 'active') {
        return res.status(403).json({
          error: 'Subscription inactive',
          message: 'Your subscription is not active. Please renew your subscription to access this feature.',
          plan: userDoc.subscriptionPlan,
        });
      }

      const plan = userDoc.subscriptionPlan || 'free';
      const canPerform = canPerformAction(plan, action);

      if (!canPerform) {
        const restrictions = getPlanRestrictions(plan);
        return res.status(403).json({
          error: 'Feature not available',
          message: `This feature is not available on the ${restrictions.name} plan. Please upgrade to access this feature.`,
          plan: plan,
          requiredPlans: getRequiredPlansForAction(action),
        });
      }

      // Attach plan info to request for use in route handlers
      req.userPlan = plan;
      req.userRestrictions = getPlanRestrictions(plan);
      req.userDoc = userDoc;

      next();
    } catch (error) {
      console.error('Error checking plan action:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to verify plan access',
      });
    }
  };
};

// Note: applyPlanLimits and validatePlanFilters have been replaced by
// checkFilterQueryUsage in usageTracking.js middleware

/**
 * Helper function to get required plans for an action
 */
function getRequiredPlansForAction(action) {
  // Import the restrictions - use dynamic import at top level
  const requiredPlans = [];
  // Common plans that have most features
  if (action === 'canScrape' || action === 'canExport') {
    return ['pro', 'enterprise'];
  }
  if (action === 'canAddStores') {
    return ['starter', 'pro', 'enterprise'];
  }
  // Default: return all plans that might have the feature
  return ['starter', 'pro', 'enterprise'];
}
