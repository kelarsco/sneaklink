/**
 * STRICT SHOPIFY STORE VERIFICATION SYSTEM
 * 
 * Prevents inactive, paused, trial-expired, or dead Shopify stores
 * from being approved or rendered in the UI.
 * 
 * Core Principle: Fail closed - only approve stores that pass ALL checks
 */

import axios from 'axios';
import { getHTMLWithAPI } from '../utils/scrapingApi.js';

/**
 * Inactive Shopify store markers
 * If ANY of these phrases exist, the store MUST be marked as inactive_shopify
 * These are specific phrases that indicate the store is paused, trial-expired, or unavailable
 */
const INACTIVE_SHOPIFY_MARKERS = [
  'sorry, this store is currently unavailable',
  'this store is currently unavailable',
  'are you the store owner',
  'start a free trial',
  'reactivate your store',
  'forgot your store',
  'open a new shopify store',
  'explore other stores',
];

/**
 * Check if homepage returns HTTP 200
 * @param {string} url - Store URL
 * @returns {Promise<{success: boolean, status?: number, error?: string}>}
 */
const checkHomepageStatus = async (url) => {
  try {
    const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
    
    // Try ScrapingAPI first if available
    let response = null;
    if (process.env.SCRAPING_API_KEY) {
      try {
        const html = await getHTMLWithAPI(normalizedUrl);
        if (html) {
          // ScrapingAPI doesn't return status, assume 200 if HTML is returned
          return { success: true, status: 200 };
        }
      } catch (error) {
        // Fall through to direct request
      }
    }
    
    // Fallback to direct request
    response = await axios.get(normalizedUrl, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      maxRedirects: 5,
      validateStatus: () => true, // Don't throw on any status
    });
    
    if (response.status === 200) {
      return { success: true, status: 200 };
    }
    
    return {
      success: false,
      status: response.status,
      error: `HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Network error',
    };
  }
};

/**
 * Scan homepage HTML for inactive Shopify markers
 * @param {string} url - Store URL
 * @returns {Promise<{isInactive: boolean, markers: string[]}>}
 */
const scanForInactiveMarkers = async (url) => {
  try {
    const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
    
    let html = null;
    
    // Try ScrapingAPI first if available
    if (process.env.SCRAPING_API_KEY) {
      html = await getHTMLWithAPI(normalizedUrl);
    }
    
    // Fallback to direct request
    if (!html) {
      try {
        const response = await axios.get(normalizedUrl, {
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
          maxRedirects: 5,
          validateStatus: (status) => status < 500,
        });
        html = response.data;
      } catch (error) {
        // If we can't fetch HTML, we can't check for markers
        // This is a failure case - fail closed
        return { isInactive: true, markers: ['unable_to_fetch_homepage'] };
      }
    }
    
    if (!html || typeof html !== 'string') {
      return { isInactive: true, markers: ['no_html_content'] };
    }
    
    const htmlLower = html.toLowerCase();
    const foundMarkers = [];
    
    // Check for each inactive marker
    for (const marker of INACTIVE_SHOPIFY_MARKERS) {
      if (htmlLower.includes(marker)) {
        foundMarkers.push(marker);
      }
    }
    
    // If ANY marker is found, store is inactive
    return {
      isInactive: foundMarkers.length > 0,
      markers: foundMarkers,
    };
  } catch (error) {
    // On error, fail closed - assume inactive
    return {
      isInactive: true,
      markers: ['verification_error'],
      error: error.message,
    };
  }
};

/**
 * Validate product availability by checking /products.json or /collections.json
 * @param {string} url - Store URL
 * @returns {Promise<{hasProducts: boolean, endpoint?: string, productCount?: number}>}
 */
const validateProductAvailability = async (url) => {
  try {
    const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
    const urlObj = new URL(normalizedUrl);
    const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
    
    // Try /products.json first
    try {
      const productsUrl = `${baseUrl}/products.json`;
      const productsResponse = await axios.get(productsUrl, {
        timeout: 8000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        maxRedirects: 3,
        validateStatus: (status) => status === 200, // Only accept 200
      });
      
      if (productsResponse.status === 200) {
        try {
          const data = typeof productsResponse.data === 'string'
            ? JSON.parse(productsResponse.data)
            : productsResponse.data;
          
          if (data && Array.isArray(data.products) && data.products.length > 0) {
            return {
              hasProducts: true,
              endpoint: '/products.json',
              productCount: data.products.length,
            };
          }
        } catch (e) {
          // Invalid JSON - continue to collections check
        }
      }
    } catch (error) {
      // /products.json failed - try /collections.json
    }
    
    // Try /collections.json as fallback
    try {
      const collectionsUrl = `${baseUrl}/collections.json`;
      const collectionsResponse = await axios.get(collectionsUrl, {
        timeout: 8000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        maxRedirects: 3,
        validateStatus: (status) => status === 200, // Only accept 200
      });
      
      if (collectionsResponse.status === 200) {
        try {
          const data = typeof collectionsResponse.data === 'string'
            ? JSON.parse(collectionsResponse.data)
            : collectionsResponse.data;
          
          if (data && Array.isArray(data.collections) && data.collections.length > 0) {
            return {
              hasProducts: true,
              endpoint: '/collections.json',
              collectionCount: data.collections.length,
            };
          }
        } catch (e) {
          // Invalid JSON
        }
      }
    } catch (error) {
      // Both endpoints failed
    }
    
    // Check if store has /products path (indicates product pages exist)
    try {
      const productsPageUrl = `${baseUrl}/products`;
      const productsPageResponse = await axios.get(productsPageUrl, {
        timeout: 8000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        maxRedirects: 3,
        validateStatus: (status) => status === 200,
      });
      
      if (productsPageResponse.status === 200) {
        const html = typeof productsPageResponse.data === 'string'
          ? productsPageResponse.data
          : '';
        
        // Check if page contains product links or product indicators
        const htmlLower = html.toLowerCase();
        if (htmlLower.includes('/products/') || htmlLower.includes('product-item') || htmlLower.includes('product-card')) {
          return {
            hasProducts: true,
            endpoint: '/products',
          };
        }
      }
    } catch (error) {
      // /products page check failed
    }
    
    // All checks failed - no products found
    return {
      hasProducts: false,
      error: 'No products or collections found',
    };
  } catch (error) {
    return {
      hasProducts: false,
      error: error.message || 'Product validation error',
    };
  }
};

/**
 * Perform strict Shopify store verification
 * A store is VERIFIED and ACTIVE only if:
 * - homepage request succeeds (HTTP 200)
 * - no inactive Shopify text is found
 * - at least one product or collection exists
 * 
 * @param {string} url - Store URL
 * @returns {Promise<{verified: boolean, active: boolean, status: string, reasons: string[], details: object}>}
 */
export const performStrictVerification = async (url) => {
  const results = {
    verified: false,
    active: false,
    status: 'pending',
    reasons: [],
    details: {},
  };
  
  try {
    // STEP 1: Check homepage HTTP status
    const homepageCheck = await checkHomepageStatus(url);
    results.details.homepageStatus = homepageCheck.status;
    
    if (!homepageCheck.success || homepageCheck.status !== 200) {
      results.status = 'dead';
      results.reasons.push(`Homepage returned ${homepageCheck.status || 'error'}`);
      return results;
    }
    
    // STEP 2: Scan for inactive Shopify markers
    const inactiveCheck = await scanForInactiveMarkers(url);
    results.details.inactiveMarkers = inactiveCheck.markers;
    
    if (inactiveCheck.isInactive) {
      results.status = 'inactive_shopify';
      results.reasons.push(`Found inactive markers: ${inactiveCheck.markers.join(', ')}`);
      return results;
    }
    
    // STEP 3: Validate product availability
    const productCheck = await validateProductAvailability(url);
    results.details.productCheck = productCheck;
    
    if (!productCheck.hasProducts) {
      results.status = 'dead';
      results.reasons.push('No products or collections found');
      return results;
    }
    
    // ALL CHECKS PASSED - Store is verified and active
    results.verified = true;
    results.active = true;
    results.status = 'active';
    results.reasons.push('All verification checks passed');
    
    return results;
  } catch (error) {
    // On any error, fail closed
    results.status = 'dead';
    results.reasons.push(`Verification error: ${error.message}`);
    results.details.error = error.message;
    return results;
  }
};

