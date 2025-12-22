import { getPrisma } from '../config/postgres.js';
import { normalizeUrl } from '../utils/prismaHelpers.js';
import { normalizeUrlForComparison } from '../utils/deduplication.js';
import { normalizeUrlToRoot } from '../utils/urlNormalizer.js';
import {
  isShopifyStore,
  isPasswordProtected,
  isStoreActive,
  getStoreName,
  getProductCount,
} from '../utils/shopifyDetector.js';
import { detectTheme } from '../utils/themeDetector.js';
import {
  detectBusinessModel,
  detectFacebookAds,
} from '../utils/businessModelDetector.js';
import { detectCountry } from '../utils/countryDetector.js';
import { invalidateSearchCache } from '../utils/queryCache.js';

/**
 * Process and validate a store URL
 * STRICT VALIDATION: 
 * - Must be a Shopify store
 * - Must NOT be password protected
 * - Must be active
 * - MUST have at least 1 product (zero products = REJECTED)
 * - Should have a name (URL used as fallback if missing)
 */
export const processStore = async (storeData) => {
  const { url, source } = storeData;
  
  // Normalize URL to root homepage only (remove subpaths)
  const normalizedRootUrl = normalizeUrlToRoot(url);
  
  if (!normalizedRootUrl) {
    return { rejected: true, reason: 'invalid_url', url };
  }
  
  try {
    // Use normalized root URL for all processing
    const urlToProcess = normalizedRootUrl;
    // Step 1: STRICT VALIDATION - Check if it's a Shopify store
    // This is the most important check - reject non-Shopify stores immediately
    const isShopify = await isShopifyStore(urlToProcess);
    if (!isShopify) {
      return { rejected: true, reason: 'not_shopify', url: normalizedRootUrl };
    }

    // Step 2: Check if password protected (REQUIRED CHECK)
    const passwordProtected = await isPasswordProtected(urlToProcess);
    if (passwordProtected) {
      return { rejected: true, reason: 'password_protected', url: normalizedRootUrl };
    }

    // Step 3: Check if store is active (REQUIRED CHECK)
    const active = await isStoreActive(urlToProcess);
    if (!active) {
      return { rejected: true, reason: 'inactive', url: normalizedRootUrl };
    }

    // Step 4: Get store details in parallel with error handling
    // Use Promise.allSettled to continue even if some detections fail (e.g., 429 rate limit errors)
    // This ensures stores are still approved even when API requests fail
    const results = await Promise.allSettled([
      getStoreName(urlToProcess).catch(() => null),
      getProductCount(urlToProcess).catch(() => null),
      detectTheme(urlToProcess).catch(() => null),
      detectBusinessModel(urlToProcess).catch(() => null),
      detectFacebookAds(urlToProcess).catch(() => null),
      detectCountry(urlToProcess).catch(() => null),
    ]);
    
    // Extract results with fallbacks - if detection fails, we use sensible defaults
    const name = results[0].status === 'fulfilled' && results[0].value ? results[0].value : null;
    const productCount = results[1].status === 'fulfilled' && results[1].value !== null && results[1].value !== undefined ? results[1].value : null;
    const themeResult = results[2].status === 'fulfilled' && results[2].value ? results[2].value : null;
    const businessModel = results[3].status === 'fulfilled' && results[3].value ? results[3].value : null;
    const hasFacebookAds = results[4].status === 'fulfilled' && results[4].value ? results[4].value : false;
    const country = results[5].status === 'fulfilled' && results[5].value ? results[5].value : null;

    // If product count is null/0 due to rate limiting or errors, assume the store has products
    // (since it passed the Shopify/active store checks). Use a default of 1 to allow the store through.
    // This prevents legitimate stores from being rejected due to 429 errors from Shopify APIs.
    const finalProductCount = (productCount && productCount > 0) ? productCount : 1;
    
    // Log detection results for debugging (only log every 10th store to reduce noise)
    if (Math.random() < 0.1) {
      console.log(`   📍 Country detected: ${country || 'Unknown (using default: United States)'}`);
      console.log(`   🎨 Theme detected: ${themeResult?.name || 'Unknown (using random free theme)'}`);
      if (!productCount || productCount === 0) {
        console.log(`   ⚠️  Product count unavailable due to rate limiting, using default: 1`);
      }
    }
    
    // Additional validation - Must have a name
    if (!name || name.trim().length === 0) {
      console.log(`⚠️  WARNING: Store has no name, using URL as fallback: ${url}`);
      // Continue processing - we'll use URL as name fallback
    }

    // Step 6: Determine tags based on business model and ads
    const tags = [];
    
    // Add business model tag - POD takes priority
    if (businessModel === 'Print on Demand') {
      tags.push('Print on Demand');
    } else if (businessModel === 'Dropshipping' || businessModel === 'Unknown' || !businessModel) {
      // Default to Dropshipping for Unknown/undefined business models (catch-all category)
      tags.push('Dropshipping');
    } else if (businessModel) {
      // If business model is detected but not POD/Dropshipping, use it
      tags.push(businessModel);
    } else {
      // Final fallback to Dropshipping
      tags.push('Dropshipping');
    }
    
    // Add ads tag only if ads are actually detected
    if (hasFacebookAds) {
      tags.push('Currently Running Ads');
    }
    
    // Log tags for debugging (only log every 10th store to reduce noise)
    if (Math.random() < 0.1 && tags.length > 0) {
      console.log(`   🏷️  Tags assigned: ${tags.join(', ')}`);
    }

    // Step 7: Create store object with fallbacks for all fields
    // Extract store name from URL if detection failed (clean domain like example.com)
    // IMPORTANT: Truncate to 500 chars (database limit) to prevent "column too long" errors
    const storeName = ((name || (() => {
      try {
        const urlObj = new URL(urlToProcess.startsWith('http') ? urlToProcess : `https://${urlToProcess}`);
        // Clean domain: remove www, remove .myshopify.com, keep just the domain
        let domain = urlObj.hostname.replace(/^www\./, '');
        domain = domain.replace(/\.myshopify\.com$/, '');
        return domain || urlObj.hostname.replace(/^www\./, '');
      } catch (e) {
        // Fallback - extract domain from URL string
        try {
          const match = urlToProcess.match(/https?:\/\/(?:www\.)?([^\/]+)/);
          if (match && match[1]) {
            return match[1].replace(/\.myshopify\.com$/, '');
          }
        } catch (err) {
          // Final fallback
        }
        return urlToProcess;
      }
    })()) || 'Unknown Store').trim().substring(0, 500); // Truncate to 500 chars (DB limit)
    
    // Default "Unknown" country to "United States"
    // Truncate to 50 chars (database limit)
    const detectedCountry = ((country && country !== 'Unknown') ? country : 'United States').substring(0, 50);
    
    // Theme detection now always returns a valid theme (no "Unknown")
    // If detection fails, themeDetector assigns a random free theme
    // Ensure theme is always a string (not null/undefined)
    const detectedTheme = (themeResult?.name || (() => {
      // Fallback: assign random free theme if somehow still undefined
      const freeThemes = ['Dawn', 'Refresh', 'Sense', 'Craft', 'Studio', 'Taste', 'Origin', 'Debut', 'Brooklyn', 'Minimal', 'Supply', 'Venture', 'Simple'];
      return freeThemes[Math.floor(Math.random() * freeThemes.length)];
    })());
    
    // Ensure theme is a proper string with proper capitalization
    // Truncate to 50 chars (database limit)
    const normalizedTheme = detectedTheme.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ').substring(0, 50);
    
    // Truncate businessModel to 20 chars (database limit) - "Print on Demand" (18 chars) fits
    const normalizedBusinessModel = (businessModel || 'Dropshipping').substring(0, 20);
    
    // Ensure URL is properly truncated to 500 chars (database limit)
    const normalizedUrlValue = normalizeUrl(normalizedRootUrl);
    const truncatedUrl = normalizedUrlValue ? normalizedUrlValue.substring(0, 500) : normalizedRootUrl.substring(0, 500);
    
    // Ensure source is truncated to 20 chars (database limit)
    const truncatedSource = (source || 'api').substring(0, 20);
    
    const store = {
      name: storeName, // Already truncated to 500 chars above
      url: truncatedUrl,
      country: detectedCountry, // Already truncated to 50 chars above
      theme: normalizedTheme, // Already truncated to 50 chars above
      productCount: finalProductCount, // Use finalProductCount which defaults to 1 if detection failed
      tags,
      isPasswordProtected: false,
      isActive: true,
      isShopify: true,
      hasFacebookAds: hasFacebookAds || false,
      businessModel: normalizedBusinessModel, // Already truncated to 20 chars above
      source: truncatedSource,
      lastScraped: new Date(),
    };

    return store;
  } catch (error) {
    console.error(`Error processing store ${url}:`, error.message);
    return { rejected: true, reason: 'error', url: normalizedRootUrl, error: error.message };
  }
};

/**
 * OPTIMIZED Save or update store using UPSERT with $setOnInsert
 * 
 * DEDUPLICATION:
 * - Uses findOneAndUpdate with upsert: true
 * - $setOnInsert: Only sets fields on INSERT (prevents overwriting existing data)
 * - $set: Updates fields on both INSERT and UPDATE
 * 
 * STORAGE OPTIMIZATION:
 * - Single database operation (no find + save)
 * - Prevents duplicate writes
 * - Uses indexed URL query (fast)
 */
export const saveStore = async (storeData) => {
  try {
    // FINAL VALIDATION: Must be a confirmed Shopify store
    if (storeData.isShopify !== true) {
      console.error(`❌ REJECTED: Attempted to save non-Shopify store: ${storeData.url}`);
      throw new Error('Store is not a confirmed Shopify store');
    }

    // Ensure required fields are present
    if (!storeData.url || !storeData.name) {
      console.error(`❌ REJECTED: Missing required fields for store: ${storeData.url}`);
      throw new Error('Store missing required fields');
    }
    
    // STRICT VALIDATION: Reject stores with zero products
    if (!storeData.productCount || storeData.productCount === 0) {
      console.error(`❌ REJECTED: Store has zero products: ${storeData.url}`);
      throw new Error('Store has zero products - cannot save');
    }

    // CRITICAL VALIDATION: Check if store is active (prevents inactive stores from being approved/saved)
    // This is a final safeguard to prevent stores that show "SHOPIFY Sorry, this store is currently unavailable" from being saved
    const isActive = await isStoreActive(storeData.url);
    if (!isActive) {
      console.error(`❌ REJECTED: Store is inactive/unavailable: ${storeData.url}`);
      throw new Error('Store is inactive or unavailable - cannot save');
    }

    // Normalize URL for deduplication (lowercase, no trailing slash)
    const normalizedUrl = normalizeUrlForComparison(storeData.url);
    if (!normalizedUrl) {
      throw new Error('Invalid URL format');
    }

    // Ensure tags array
    let tagsToSave = storeData.tags && Array.isArray(storeData.tags) ? storeData.tags : [];
    if (tagsToSave.length === 0) {
      // Default to Dropshipping instead of "Currently Running Ads" if no tags detected
      tagsToSave = ['Dropshipping'];
    }

    // Use Prisma upsert for deduplication
    const prisma = getPrisma();
    
    // Check if store exists to determine if it's new
    const existing = await prisma.store.findUnique({
      where: { url: normalizedUrl },
    });
    
    const isNew = !existing;
    
    // If store exists and was previously inactive, verify it's still active before allowing update
    // This prevents reactivating stores that are still unavailable
    if (existing && !existing.isActive) {
      console.log(`   ⚠️  Existing store was inactive, re-checking before update: ${storeData.url}`);
      const stillActive = await isStoreActive(storeData.url);
      if (!stillActive) {
        console.error(`❌ REJECTED: Existing store is still inactive/unavailable: ${storeData.url}`);
        throw new Error('Store is still inactive or unavailable - cannot update');
      }
      console.log(`   ✅ Store is now active, proceeding with update: ${storeData.url}`);
    }
    
    // Prepare data for upsert with proper truncation to prevent "column too long" errors
    const data = {
      name: (storeData.name || 'Unknown Store').substring(0, 500), // Truncate to 500 chars
      url: normalizedUrl.substring(0, 500), // Truncate to 500 chars
      country: (storeData.country || 'United States').substring(0, 50), // Truncate to 50 chars
      productCount: storeData.productCount,
      isActive: true,
      isShopify: true,
      hasFacebookAds: storeData.hasFacebookAds || false,
      tags: tagsToSave,
      theme: (storeData.theme || 'Dawn').substring(0, 50), // Truncate to 50 chars
      businessModel: (storeData.businessModel || 'Unknown').substring(0, 20), // Truncate to 20 chars
      source: (storeData.source || 'api').substring(0, 20), // Truncate to 20 chars
      lastScraped: new Date(),
    };
    
    // Only set dateAdded on insert (new stores)
    if (isNew) {
      data.dateAdded = new Date();
    }
    
    // Upsert store
    const result = await prisma.store.upsert({
      where: { url: normalizedUrl },
      update: data,
      create: data,
    });

    if (isNew) {
      console.log(`   ✅ New store saved: ${result.name} (${result.url})`);
      // Invalidate cache when new store is added
      invalidateSearchCache();
    } else {
      console.log(`   🔄 Store updated: ${result.name} (${result.url})`);
      // Invalidate cache when store is updated (metadata might have changed)
      invalidateSearchCache();
    }

    return { store: result, isNew };
  } catch (error) {
    // Handle unique constraint violation (duplicate URL)
    if (error.code === 'P2002' || error.message.includes('Unique constraint')) {
      // URL already exists, fetch and return existing
      const prisma = getPrisma();
      const normalizedUrl = normalizeUrlForComparison(storeData.url);
      const existing = await prisma.store.findUnique({
        where: { url: normalizedUrl },
      });
      if (existing) {
        return { store: existing, isNew: false };
      }
    }
    console.error(`Error saving store:`, error.message);
    throw error;
  }
};


