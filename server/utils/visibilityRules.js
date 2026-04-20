/**
 * VISIBILITY RULES FOR STORE DISPLAY
 * 
 * Core Principle: Saved ≠ Visible
 * Only stores that pass STRICT verification + health checks should be visible to users.
 * 
 * Visibility Rules (STRICT):
 * A store is user-visible ONLY IF:
 *   - verified = true (passed all strict verification checks)
 *   - AND storeStatus = 'active' (not inactive_shopify, dead, blocked, or pending)
 *   - AND healthStatus NOT IN ('nonexistent', 'password_protected') - Must be accessible
 *   - AND healthStatus != null (discovery phase stores are hidden until verified)
 */

/**
 * Check if a store should be visible to users by default
 * @param {Object} store - Store record from database
 * @returns {boolean} - true if store should be visible
 */
export const isStoreVisible = (store) => {
  // NEW SYSTEM: Strict verification (verified = true AND storeStatus = 'active')
  const isNewSystemVerified = store.verified === true && store.storeStatus === 'active';
  
  // OLD SYSTEM: Backward compatibility (shopifyStatus confirmed/probable AND isShopify = true AND isActive = true)
  const isOldSystemVerified = (
    (store.shopifyStatus === 'confirmed' || store.shopifyStatus === 'probable') &&
    store.isShopify === true &&
    store.isActive === true
  );
  
  // PENDING: Stores that are pending verification and active (show while processing)
  const isPendingButActive = (
    store.storeStatus === 'pending' &&
    store.isActive === true
  );
  
  // Store must pass either new system, old system, or be pending and active
  if (!isNewSystemVerified && !isOldSystemVerified && !isPendingButActive) {
    return false;
  }
  
  // Hide stores that don't exist, are password protected, or marked as dead/inactive/blocked
  if (store.healthStatus === 'nonexistent' || 
      store.healthStatus === 'password_protected' ||
      store.storeStatus === 'dead' ||
      store.storeStatus === 'inactive_shopify' ||
      store.storeStatus === 'blocked') {
    return false;
  }
  
  // Note: We allow null healthStatus for pending stores (they're being processed)
  // This allows newly discovered stores to be visible while verification happens
  
  // All other cases are visible (healthy, possibly_inactive with retry, etc.)
  return true;
};

/**
 * Build Prisma filter for visible stores (for use in queries)
 * @param {Object} options - Optional overrides
 * @param {boolean} options.includeProtected - Include password-protected stores (admin only)
 * @param {boolean} options.includeInactive - Include inactive/nonexistent stores (admin only)
 * @param {boolean} options.includeUnverified - Include unverified/discovery stores (admin only)
 * @returns {Object} - Prisma where clause
 */
export const buildVisibilityFilter = (options = {}) => {
  const { 
    includeProtected = false, 
    includeInactive = false, 
    includeUnverified = false 
  } = options;
  
  const conditions = [];
  
  // STRICT: Only show verified and active stores by default
  // Backward compatibility: Also show stores verified with old system
  // Also show pending stores that are active and health-checked (they're being processed, show them while verification happens)
  // Admin override: Can include unverified/pending/inactive stores
  if (!includeUnverified) {
    // NEW SYSTEM: Strict verification (verified = true AND storeStatus = 'active')
    // OLD SYSTEM: Backward compatibility (shopifyStatus confirmed/probable AND isShopify = true AND isActive = true)
    // PENDING: Stores that are pending verification, active, and have been health-checked (show them while they're being processed)
    conditions.push({
      OR: [
        // New strict verification system
        {
          verified: true,
          storeStatus: 'active',
        },
        // Old system (backward compatibility for existing stores)
        {
          shopifyStatus: { in: ['confirmed', 'probable'] },
          isShopify: true,
          isActive: true,
        },
        // Pending stores with shopifyStatus probable/confirmed (they're likely Shopify, just not strictly verified yet)
        // This is MORE INCLUSIVE - shows stores that have been identified as Shopify but not yet strictly verified
        {
          storeStatus: 'pending',
          isActive: true,
          shopifyStatus: { in: ['confirmed', 'probable'] },
        },
        // Pending stores that are active AND have been health-checked (healthStatus is not null)
        // This shows stores that are in the verification pipeline but haven't completed strict verification yet
        {
          storeStatus: 'pending',
          isActive: true,
          healthStatus: { not: null }, // Must have been health-checked
        },
        // Show ALL pending active stores (most inclusive - shows newly discovered stores immediately)
        // This ensures newly saved stores appear in the dashboard right away
        {
          storeStatus: 'pending',
          isActive: true,
        },
      ],
    });
  } else {
    // Admin override: Include all stores (verified + unverified + discovery)
    conditions.push({
      OR: [
        { verified: true, storeStatus: 'active' }, // Verified active stores (new system)
        { shopifyStatus: { in: ['confirmed', 'probable'] }, isShopify: true, isActive: true }, // Old system
        { storeStatus: 'pending' }, // Pending verification
        { storeStatus: null }, // Legacy stores without storeStatus
      ],
    });
  }
  
  // Health status exclusions (stores that should be hidden)
  // Hide stores marked as dead, nonexistent, inactive_shopify, blocked, or password protected
  const healthExclusions = [];
  if (!includeInactive) {
    healthExclusions.push({ healthStatus: 'nonexistent' });
    healthExclusions.push({ storeStatus: 'dead' }); // Hide stores marked as dead
    healthExclusions.push({ storeStatus: 'inactive_shopify' }); // Hide inactive Shopify stores
    healthExclusions.push({ storeStatus: 'blocked' }); // Hide blocked stores
  }
  if (!includeProtected) {
    healthExclusions.push({ healthStatus: 'password_protected' });
  }
  
  // Apply health status exclusions
  // BUT: Allow pending stores even if they would normally be excluded
  // This ensures newly discovered stores are visible immediately
  if (healthExclusions.length > 0) {
    conditions.push({
      OR: [
        // Pending stores are always allowed (even if they would be excluded)
        {
          storeStatus: 'pending',
        },
        // Non-pending stores must not be excluded
        {
          AND: [
            {
              NOT: {
                OR: healthExclusions,
            },
          },
          ],
        },
      ],
    });
  }
  
  // Note: We allow null healthStatus for pending stores (they're being processed)
  // This allows newly discovered stores to be visible while verification happens
  
  return { AND: conditions };
};

