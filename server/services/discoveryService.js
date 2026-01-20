import { getPrisma } from '../config/postgres.js';
import { canonicalizeUrl } from '../utils/urlCanonicalizer.js';

/**
 * PHASE 1: DISCOVERY SERVICE
 * 
 * Saves all discovered URLs immediately without validation.
 * No rejection logic - everything gets saved as candidate stores.
 * 
 * Core Principle: Never reject a store during discovery
 * 
 * Deduplication: Uses canonical URL to prevent duplicate stores
 * A store is saved ONCE in its lifetime, regardless of verification status
 */
export const saveDiscoveredStore = async (storeData) => {
  const { url, source, metadata = {} } = storeData;
  
  try {
    // Canonicalize URL (single source of truth for normalization)
    const canonicalUrl = canonicalizeUrl(url);
    
    if (!canonicalUrl) {
      console.warn(`⚠️  [Discovery] Invalid URL format, skipping: ${url}`);
      return { saved: false, reason: 'invalid_url', url };
    }
    
    const prisma = getPrisma();
    
    // Extract domain name from URL for initial name (will be updated later)
    let initialName = 'Unknown Store';
    try {
      const urlObj = new URL(canonicalUrl);
      let domain = urlObj.hostname.replace(/^www\./, '');
      domain = domain.replace(/\.myshopify\.com$/, '');
      initialName = domain || urlObj.hostname.replace(/^www\./, '');
    } catch (e) {
      // Use URL as fallback
      initialName = canonicalUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
    }
    
    // CRITICAL: Check if store already exists (using canonical URL)
    // This check includes ALL stores regardless of verification/health status
    // A store is saved ONCE - never re-save, never reset state
    const existing = await prisma.store.findUnique({
      where: { url: canonicalUrl },
      select: { 
        id: true, 
        dateAdded: true,
        shopifyStatus: true,
        healthStatus: true,
      },
    });
    
    if (existing) {
      // Store already exists - DO NOT re-save, DO NOT reset state
      // Only update discovery metadata (non-destructive update)
      // This preserves verification/health status from previous phases
      console.log(`   ℹ️  [Discovery] Store already exists, skipping: ${canonicalUrl} (ID: ${existing.id}, shopifyStatus: ${existing.shopifyStatus || 'null'}, healthStatus: ${existing.healthStatus || 'null'})`);
      
      // Only update lastScraped timestamp (non-destructive)
      await prisma.store.update({
        where: { url: canonicalUrl },
        data: {
          lastScraped: new Date(),
        },
      });
      
      return { saved: false, reason: 'already_exists', url: canonicalUrl, storeId: existing.id };
    }
    
    // Save new candidate store - NO VALIDATION, NO REJECTION
    // This is the ONLY place stores are created - saved ONCE for lifetime
    const newStore = await prisma.store.create({
      data: {
        url: canonicalUrl.substring(0, 500), // Use canonical URL for storage
        name: initialName.substring(0, 500),
        country: 'Unknown', // Will be detected in health check phase
        productCount: null, // Will be detected later - no defaults
        shopifyStatus: null, // Discovery phase - not yet verified (preserves uncertainty)
        shopifyConfidence: null,
        storeStatus: 'pending', // Pending strict verification
        verified: false, // Not verified until strict checks pass
        healthStatus: null, // Discovery phase - not yet checked (preserves uncertainty)
        productCountStatus: 'unknown',
        primaryBusinessModel: null,
        businessModelConfidence: null,
        tags: [], // Empty - will be assigned in classification phase
        businessModel: 'Unknown', // Legacy field for backward compatibility
        source: (source || 'discovery').substring(0, 20),
        discoverySource: source || null,
        discoveryMetadata: metadata || {},
        isActive: true, // Default to active (will be updated in health check)
        isShopify: false, // Not yet verified (will be updated in verification)
        retryCount: 0,
        dateAdded: new Date(),
        lastScraped: new Date(),
      },
    });
    
    console.log(`✅ [Discovery] Saved NEW candidate store: ${newStore.name} (${newStore.url})`);
    
    return { saved: true, storeId: newStore.id, url: canonicalUrl };
  } catch (error) {
    // Handle unique constraint violation (race condition - another process saved it first)
    if (error.code === 'P2002' || error.message.includes('Unique constraint') || error.message.includes('unique')) {
      console.log(`   ℹ️  [Discovery] Store already exists (race condition/duplicate): ${canonicalUrl}`);
      
      // Try to find the existing store
      try {
        const existing = await prisma.store.findUnique({
          where: { url: canonicalUrl },
          select: { id: true },
        });
        return { saved: false, reason: 'duplicate', url: canonicalUrl, storeId: existing?.id };
      } catch (e) {
        return { saved: false, reason: 'duplicate', url: canonicalUrl };
      }
    }
    
    console.error(`❌ [Discovery] Error saving store ${canonicalUrl}:`, error.message);
    return { saved: false, reason: 'error', url: canonicalUrl, error: error.message };
  }
};

/**
 * Batch save discovered stores
 */
export const saveDiscoveredStores = async (stores) => {
  const results = {
    saved: 0,
    duplicates: 0,
    errors: 0,
    total: stores.length,
  };
  
  for (const store of stores) {
    const result = await saveDiscoveredStore(store);
    
    if (result.saved) {
      results.saved++;
    } else if (result.reason === 'already_exists' || result.reason === 'duplicate') {
      results.duplicates++;
    } else {
      results.errors++;
    }
  }
  
  return results;
};
