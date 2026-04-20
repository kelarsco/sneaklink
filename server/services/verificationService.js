import axios from 'axios';
import { getPrisma } from '../config/postgres.js';
import { performStrictVerification } from './strictShopifyVerification.js';

/**
 * PHASE 2: SHOPIFY VERIFICATION SERVICE
 * 
 * Confidence-based Shopify verification (0.0 - 1.0)
 * Never rejects stores - only updates confidence scores and status
 * 
 * Core Principle: All uncertainty must be stored, not discarded
 */

/**
 * Calculate Shopify confidence score based on multiple signals
 * Returns: { confidence: 0.0-1.0, signals: {...}, status: 'confirmed'|'probable'|'unlikely'|'unverified' }
 */
export const verifyShopifyStore = async (url) => {
  try {
    const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
    const urlObj = new URL(normalizedUrl);
    const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
    const urlLower = normalizedUrl.toLowerCase();
    
    const signals = {
      cartJs: false,
      xShopId: false,
      cdnShopify: false,
      productsJson: false,
      myshopifyDomain: false,
    };
    
    let confidence = 0.0;
    
    // Helper function to make requests with error handling
    const makeRequest = async (requestUrl, options = {}) => {
      try {
        const defaultOptions = {
          timeout: 8000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
          maxRedirects: 5,
          validateStatus: (status) => status < 500,
        };
        
        const response = await axios.get(requestUrl, { ...defaultOptions, ...options });
        return { response, error: null };
      } catch (error) {
        return { response: null, error };
      }
    };
    
    // SIGNAL 1: /cart.js endpoint (weight: 0.4 - highest confidence)
    try {
      const cartUrl = `${baseUrl}/cart.js`;
      const { response: cartResponse } = await makeRequest(cartUrl);
      
      if (cartResponse && cartResponse.status === 200) {
        const contentType = cartResponse.headers['content-type'] || '';
        if (contentType.includes('application/json') || contentType.includes('text/javascript')) {
          try {
            const data = typeof cartResponse.data === 'string' 
              ? JSON.parse(cartResponse.data) 
              : cartResponse.data;
            if (data && (data.items !== undefined || data.token !== undefined || data.total_price !== undefined)) {
              signals.cartJs = true;
              confidence += 0.4;
            }
          } catch (e) {
            if (contentType.includes('application/json')) {
              signals.cartJs = true;
              confidence += 0.3; // JSON response but not cart structure
            }
          }
        }
      }
    } catch (error) {
      // Signal not found - no penalty
    }
    
    // SIGNAL 2: X-ShopId header (weight: 0.3)
    try {
      const { response: headerResponse } = await makeRequest(normalizedUrl);
      if (headerResponse && headerResponse.headers) {
        const shopId = headerResponse.headers['x-shopid'] || headerResponse.headers['X-ShopId'];
        if (shopId) {
          signals.xShopId = true;
          confidence += 0.3;
        }
      }
    } catch (error) {
      // Signal not found - no penalty
    }
    
    // SIGNAL 3: /products.json endpoint (weight: 0.2)
    try {
      const productsUrl = `${baseUrl}/products.json`;
      const { response: productsResponse } = await makeRequest(productsUrl);
      
      if (productsResponse && productsResponse.status === 200) {
        try {
          const data = typeof productsResponse.data === 'string' 
            ? JSON.parse(productsResponse.data) 
            : productsResponse.data;
          if (data && Array.isArray(data.products)) {
            signals.productsJson = true;
            confidence += 0.2;
          }
        } catch (e) {
          // Not valid JSON
        }
      }
    } catch (error) {
      // Signal not found - no penalty
    }
    
    // SIGNAL 4: cdn.shopify.com in assets (weight: 0.15)
    try {
      const { response: pageResponse } = await makeRequest(normalizedUrl);
      if (pageResponse && pageResponse.data) {
        const html = typeof pageResponse.data === 'string' ? pageResponse.data : '';
        if (html.includes('cdn.shopify.com') || html.includes('shopify.theme') || html.includes('shopify.checkout')) {
          signals.cdnShopify = true;
          confidence += 0.15;
        }
      }
    } catch (error) {
      // Signal not found - no penalty
    }
    
    // SIGNAL 5: .myshopify.com domain (weight: 0.1 - weakest signal)
    if (urlLower.includes('.myshopify.com')) {
      signals.myshopifyDomain = true;
      confidence += 0.1;
    }
    
    // Clamp confidence to 0.0-1.0
    confidence = Math.min(1.0, Math.max(0.0, confidence));
    
    // Determine status based on confidence
    let status = 'unverified';
    if (confidence >= 0.6) {
      status = 'confirmed';
    } else if (confidence >= 0.4) {
      status = 'probable';
    } else if (confidence > 0.0) {
      status = 'unlikely';
    }
    
    return {
      confidence,
      signals,
      status,
    };
  } catch (error) {
    console.error(`[Verification] Error verifying store ${url}:`, error.message);
    // Return unverified on error (don't penalize)
    return {
      confidence: 0.0,
      signals: {},
      status: 'unverified',
      error: error.message,
    };
  }
};

/**
 * Update store with Shopify verification results
 * Includes strict verification checks to prevent inactive/dead stores from being approved
 */
export const updateStoreVerification = async (storeId, verificationResult, storeUrl) => {
  const prisma = getPrisma();
  
  try {
    // Perform strict verification checks
    const strictVerification = await performStrictVerification(storeUrl);
    
    // Determine final status based on both confidence-based and strict verification
    let finalStatus = 'pending';
    let verified = false;
    
    // If strict verification fails, store is NOT verified regardless of confidence
    if (!strictVerification.verified || !strictVerification.active) {
      finalStatus = strictVerification.status; // 'inactive_shopify', 'dead', etc.
      verified = false;
    } else if (verificationResult.confidence >= 0.6) {
      // Strict checks passed AND high confidence = active
      finalStatus = 'active';
      verified = true;
    } else if (verificationResult.confidence >= 0.4) {
      // Strict checks passed but lower confidence = still active but may need review
      finalStatus = 'active';
      verified = true;
    } else {
      // Low confidence = pending (not verified yet)
      finalStatus = 'pending';
      verified = false;
    }
    
    // Check if store was previously marked as inactive/dead
    const existingStore = await prisma.store.findUnique({
      where: { id: storeId },
      select: { storeStatus: true, verified: true },
    });
    
    // If store was previously marked as inactive_shopify or dead, don't auto-approve
    // Require explicit reverification (admin action)
    if (existingStore && (existingStore.storeStatus === 'inactive_shopify' || existingStore.storeStatus === 'dead' || existingStore.storeStatus === 'blocked')) {
      // Don't auto-approve - keep existing status unless explicitly reverified
      // Only update if strict verification now passes (manual reverification)
      if (strictVerification.verified && strictVerification.active) {
        // Store was manually reverified - allow status update
        await prisma.store.update({
          where: { id: storeId },
          data: {
            shopifyStatus: verificationResult.status,
            shopifyConfidence: verificationResult.confidence,
            shopifySignals: verificationResult.signals,
            storeStatus: finalStatus,
            verified: verified,
            isShopify: verificationResult.confidence >= 0.4, // Backward compatibility
            lastVerificationAttempt: new Date(),
            nextRetryAt: verified ? null : new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        });
      } else {
        // Keep existing status - don't update
        console.log(`[Verification] Store ${storeId} previously marked as ${existingStore.storeStatus}, keeping status (not auto-approving)`);
        return { success: true, status: 'kept_existing', message: 'Store status preserved (not auto-approved)' };
      }
    } else {
      // Normal update for new or pending stores
      await prisma.store.update({
        where: { id: storeId },
        data: {
          shopifyStatus: verificationResult.status,
          shopifyConfidence: verificationResult.confidence,
          shopifySignals: verificationResult.signals,
          storeStatus: finalStatus,
          verified: verified,
          isShopify: verificationResult.confidence >= 0.4, // Backward compatibility
          lastVerificationAttempt: new Date(),
          nextRetryAt: verified ? null : new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });
    }
    
    return { success: true, strictVerification, finalStatus, verified };
  } catch (error) {
    console.error(`[Verification] Error updating store ${storeId}:`, error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Verify stores that need verification (unverified or low confidence)
 */
export const verifyPendingStores = async (limit = 100) => {
  const prisma = getPrisma();
  
  // Get stores that need verification
  // Priority: null status (discovery phase) > unlikely (retry) > scheduled retry
  const stores = await prisma.store.findMany({
    where: {
      OR: [
        { shopifyStatus: null }, // Discovery phase stores (highest priority)
        { shopifyStatus: 'unlikely' }, // Low confidence, may retry
        {
          nextRetryAt: { lte: new Date() }, // Scheduled retry
          shopifyStatus: { not: null }, // Only retry stores that have been verified before
        },
      ],
    },
    take: limit,
    select: {
      id: true,
      url: true,
      shopifyStatus: true,
      retryCount: true,
    },
  });
  
  console.log(`[Verification] Processing ${stores.length} stores for Shopify verification...`);
  
  const results = {
    verified: 0,
    confirmed: 0,
    probable: 0,
    unlikely: 0,
    errors: 0,
  };
  
  for (const store of stores) {
    try {
      // Step 1: Confidence-based Shopify detection
      const verificationResult = await verifyShopifyStore(store.url);
      
      // Step 2: Strict verification (homepage, inactive markers, products)
      const updateResult = await updateStoreVerification(store.id, verificationResult, store.url);
      
      if (updateResult.success) {
        results.verified++;
        if (verificationResult.status === 'confirmed') results.confirmed++;
        else if (verificationResult.status === 'probable') results.probable++;
        else if (verificationResult.status === 'unlikely') results.unlikely++;
        
        // Log strict verification results
        if (updateResult.strictVerification) {
          if (!updateResult.strictVerification.verified) {
            console.log(`   ⚠️  [Verification] Store ${store.id} failed strict checks: ${updateResult.strictVerification.reasons.join(', ')}`);
          }
        }
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`[Verification] Error processing store ${store.id}:`, error.message);
      results.errors++;
      
      // Update retry count and schedule retry
      await prisma.store.update({
        where: { id: store.id },
        data: {
          retryCount: store.retryCount + 1,
          nextRetryAt: new Date(Date.now() + 60 * 60 * 1000 * (store.retryCount + 1)), // Exponential backoff
        },
      });
    }
  }
  
  console.log(`[Verification] Completed: ${results.verified} verified (${results.confirmed} confirmed, ${results.probable} probable, ${results.unlikely} unlikely), ${results.errors} errors`);
  
  return results;
};
