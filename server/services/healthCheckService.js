import axios from 'axios';
import * as cheerio from 'cheerio';
import { getPrisma } from '../config/postgres.js';
import { getHTMLWithAPI } from '../utils/scrapingApi.js';
import { getStoreName } from '../utils/shopifyDetector.js';
import { detectCountry } from '../utils/countryDetector.js';
import { detectTheme } from '../utils/themeDetector.js';

/**
 * PHASE 3: HEALTH CHECK SERVICE
 * 
 * Soft validation - never rejects stores, only updates status flags
 * Detects password protection, inactivity, product count, etc.
 * 
 * Core Principle: Failures must downgrade confidence, not block saving
 */

/**
 * Check if store is password protected (soft check - doesn't reject)
 */
const checkPasswordProtection = async (url) => {
  try {
    const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
    
    let html = null;
    if (process.env.SCRAPING_API_KEY) {
      html = await getHTMLWithAPI(normalizedUrl);
    }
    
    if (!html) {
      try {
        const response = await axios.get(normalizedUrl, {
          timeout: 10000,
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
          maxRedirects: 5,
          validateStatus: (status) => status < 500,
        });
        html = response.data;
      } catch (error) {
        return { isPasswordProtected: false, confidence: 0.0 }; // Can't determine
      }
    }
    
    if (!html) {
      return { isPasswordProtected: false, confidence: 0.0 };
    }
    
    const htmlLower = html.toLowerCase();
    
    // Strong indicators of password protection
    const strongIndicators = [
      'password is required',
      'enter store password',
      'password required',
      'this store is password protected',
      'storefront password',
    ];
    
    let confidence = 0.0;
    for (const indicator of strongIndicators) {
      if (htmlLower.includes(indicator)) {
        confidence = 0.9;
        break;
      }
    }
    
    return { isPasswordProtected: confidence > 0.5, confidence };
  } catch (error) {
    return { isPasswordProtected: false, confidence: 0.0 };
  }
};

/**
 * Check if store appears inactive (soft check)
 * Returns: { isActive: boolean, confidence: number, reason: string, statusType: 'nonexistent' | 'possibly_inactive' | 'healthy' }
 */
const checkStoreActivity = async (url) => {
  try {
    const normalizedUrl = url.startsWith('http') ? `https://${url}` : url;
    
    let html = null;
    let responseStatus = null;
    if (process.env.SCRAPING_API_KEY) {
      html = await getHTMLWithAPI(normalizedUrl);
    }
    
    if (!html) {
      try {
        const response = await axios.get(normalizedUrl, {
          timeout: 10000,
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
          maxRedirects: 5,
          validateStatus: (status) => status < 500,
        });
        html = response.data;
        responseStatus = response.status;
      } catch (error) {
        return { isActive: true, confidence: 0.0, reason: 'unable_to_check', statusType: 'healthy' }; // Can't determine
      }
    }
    
    if (!html) {
      return { isActive: true, confidence: 0.0, reason: 'no_content', statusType: 'healthy' };
    }
    
    const htmlLower = html.toLowerCase();
    
    // CRITICAL: "This store does not exist" - mark as nonexistent (never visible, no retry)
    if (htmlLower.includes('this store does not exist')) {
      return { 
        isActive: false, 
        confidence: 0.95, 
        reason: 'this store does not exist', 
        statusType: 'nonexistent' 
      };
    }
    
    // Other inactive store indicators (may be temporary)
    const inactiveIndicators = [
      'store is currently unavailable',
      'store unavailable',
      'check out shopify editions',
      'open a new shopify store',
    ];
    
    for (const indicator of inactiveIndicators) {
      if (htmlLower.includes(indicator)) {
        return { isActive: false, confidence: 0.8, reason: indicator, statusType: 'possibly_inactive' };
      }
    }
    
    // Check HTTP status
    try {
      const response = await axios.get(normalizedUrl, {
        timeout: 5000,
        validateStatus: () => true, // Don't throw on any status
      });
      
      if (response.status >= 500) {
        return { isActive: false, confidence: 0.7, reason: `http_${response.status}`, statusType: 'possibly_inactive' };
      }
    } catch (error) {
      // Network error - mark as unknown (still visible if verified)
      return { isActive: true, confidence: 0.0, reason: 'network_error', statusType: 'healthy' };
    }
    
    return { isActive: true, confidence: 0.8, reason: 'appears_active', statusType: 'healthy' };
  } catch (error) {
    return { isActive: true, confidence: 0.0, reason: 'check_failed', statusType: 'healthy' };
  }
};

/**
 * Get product count (with error handling - never defaults)
 */
const checkProductCount = async (url) => {
  try {
    const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
    const baseUrl = normalizedUrl.replace(/\/$/, '');
    
    // Try /products.json endpoint
    try {
      const response = await axios.get(`${baseUrl}/products.json`, {
        timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        validateStatus: (status) => status < 500,
      });
      
      if (response.status === 200) {
        try {
          const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
          if (data && Array.isArray(data.products)) {
            return {
              productCount: data.products.length,
              status: 'confirmed',
              confidence: 1.0,
            };
          }
        } catch (e) {
          // Not valid JSON
        }
      }
      
      // Rate limiting detected
      if (response.status === 429) {
        return {
          productCount: null,
          status: 'rate_limited',
          confidence: 0.0,
        };
      }
    } catch (error) {
      if (error.response?.status === 429) {
        return {
          productCount: null,
          status: 'rate_limited',
          confidence: 0.0,
        };
      }
    }
    
    // Unable to determine
    return {
      productCount: null,
      status: 'unknown',
      confidence: 0.0,
    };
  } catch (error) {
    return {
      productCount: null,
      status: 'unknown',
      confidence: 0.0,
    };
  }
};

/**
 * Perform health check on a store
 */
export const performHealthCheck = async (storeId) => {
  const prisma = getPrisma();
  
  try {
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: { id: true, url: true, storeStatus: true },
    });
    
    if (!store) {
      return { success: false, error: 'Store not found' };
    }
    
    // Run all health checks in parallel
    const [passwordCheck, activityCheck, productCountCheck, nameResult, countryResult, themeResult] = await Promise.allSettled([
      checkPasswordProtection(store.url),
      checkStoreActivity(store.url),
      checkProductCount(store.url),
      getStoreName(store.url).catch(() => null),
      detectCountry(store.url).catch(() => null),
      detectTheme(store.url).catch(() => null),
    ]);
    
    // Extract results
    const passwordResult = passwordCheck.status === 'fulfilled' ? passwordCheck.value : { isPasswordProtected: false, confidence: 0.0 };
    const activityResult = activityCheck.status === 'fulfilled' ? activityCheck.value : { isActive: true, confidence: 0.0 };
    const productCountResult = productCountCheck.status === 'fulfilled' ? productCountCheck.value : { productCount: null, status: 'unknown' };
    const name = nameResult.status === 'fulfilled' && nameResult.value ? nameResult.value : null;
    const country = countryResult.status === 'fulfilled' && countryResult.value ? countryResult.value : null;
    const themeResultValue = themeResult.status === 'fulfilled' && themeResult.value ? themeResult.value : null;
    
    // Determine health status based on checks
    let healthStatus = 'healthy';
    
    // Priority 1: Password protection (highest priority - store exists but locked)
    if (passwordResult.isPasswordProtected) {
      healthStatus = 'password_protected';
    }
    // Priority 2: Store does not exist (critical - never visible, no retry)
    else if (activityResult.statusType === 'nonexistent') {
      healthStatus = 'nonexistent';
    }
    // Priority 3: Check for inactive Shopify markers (from strict verification)
    // If store was marked as inactive_shopify, keep that status
    else if (store.storeStatus === 'inactive_shopify') {
      healthStatus = 'possibly_inactive'; // Health check confirms inactivity
    }
    // Priority 4: Rate limiting (temporary issue - retry later)
    else if (productCountResult.status === 'rate_limited') {
      healthStatus = 'rate_limited';
    }
    // Priority 5: Possibly inactive (may be temporary - allow retry)
    else if (!activityResult.isActive && activityResult.statusType === 'possibly_inactive') {
      healthStatus = 'possibly_inactive';
    }
    // Default: healthy
    else {
      healthStatus = 'healthy';
    }
    
    // Update store with health check results
    const updateData = {
      isPasswordProtected: passwordResult.isPasswordProtected,
      healthStatus,
      productCount: productCountResult.productCount,
      productCountStatus: productCountResult.status,
      isActive: activityResult.isActive && healthStatus !== 'nonexistent', // Mark inactive if nonexistent
      lastScraped: new Date(),
    };
    
    // Set retry eligibility: nonexistent stores should NOT retry
    if (healthStatus === 'nonexistent') {
      updateData.nextRetryAt = null; // Never retry nonexistent stores
    } else if (productCountResult.status === 'rate_limited' || productCountResult.status === 'unknown') {
      updateData.nextRetryAt = new Date(Date.now() + 60 * 60 * 1000); // Retry in 1 hour
    }
    
    // Update name if detected
    if (name && name.trim()) {
      updateData.name = name.substring(0, 500);
    }
    
    // Update country if detected
    if (country && country !== 'Unknown') {
      updateData.country = country.substring(0, 50);
    }
    
    // Update theme if detected
    if (themeResultValue?.name) {
      updateData.theme = themeResultValue.name.substring(0, 50);
    }
    
    await prisma.store.update({
      where: { id: storeId },
      data: updateData,
    });
    
    return { success: true };
  } catch (error) {
    console.error(`[HealthCheck] Error checking store ${storeId}:`, error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Perform health checks on stores that need checking
 */
export const performPendingHealthChecks = async (limit = 100) => {
  const prisma = getPrisma();
  
  // Get stores that need health checks
  const stores = await prisma.store.findMany({
    where: {
      OR: [
        { healthStatus: 'unknown' },
        { productCountStatus: 'unknown' },
        { productCount: null },
        { nextRetryAt: { lte: new Date() } },
      ],
      shopifyStatus: { in: ['confirmed', 'probable'] }, // Only check verified Shopify stores
    },
    take: limit,
    select: {
      id: true,
      url: true,
      retryCount: true,
    },
  });
  
  console.log(`[HealthCheck] Processing ${stores.length} stores for health checks...`);
  
  const results = {
    checked: 0,
    healthy: 0,
    rateLimited: 0,
    inactive: 0,
    errors: 0,
  };
  
  for (const store of stores) {
    try {
      const result = await performHealthCheck(store.id);
      if (result.success) {
        results.checked++;
        // Check what status was set (would need to fetch store to know for sure)
        // For now, just count as checked
      } else {
        results.errors++;
        
        // Update retry count
        await prisma.store.update({
          where: { id: store.id },
          data: {
            retryCount: store.retryCount + 1,
            nextRetryAt: new Date(Date.now() + 60 * 60 * 1000 * (store.retryCount + 1)),
          },
        });
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`[HealthCheck] Error processing store ${store.id}:`, error.message);
      results.errors++;
    }
  }
  
  console.log(`[HealthCheck] Completed: ${results.checked} checked, ${results.errors} errors`);
  
  return results;
};
