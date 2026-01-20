import { getPrisma } from '../config/postgres.js';
import { detectBusinessModelWithScores } from '../utils/businessModelDetectorV2.js';
import { detectFacebookAds } from '../utils/businessModelDetector.js';

/**
 * PHASE 4: BUSINESS MODEL CLASSIFICATION SERVICE
 * 
 * Confidence-based classification with scoring
 * NEVER assigns Dropshipping as fallback
 * Only tags when confidence >= 0.7
 * Allows multiple business models (hybrid stores)
 * 
 * Core Principle: All uncertainty must be stored, not discarded
 * Anti-Pattern: Never use Dropshipping as default/catch-all
 */

/**
 * Classify business model with confidence scores
 * Returns: { scores: { model: score }, primaryBusinessModel: string, businessModelConfidence: number, tags: string[] }
 */
export const classifyBusinessModel = async (url) => {
  try {
    // Get business model detection with confidence scores
    const businessModelResult = await detectBusinessModelWithScores(url);
    const hasAds = await detectFacebookAds(url);
    
    // Use scores directly from detector
    const scores = businessModelResult.scores || {
      'Print on Demand': 0.0,
      'Dropshipping': 0.0,
      'Branded Ecommerce': 0.0,
      'Marketplace': 0.0,
    };
    
    // Get primary model and confidence from detector
    const primaryModel = businessModelResult.primaryModel || null;
    const primaryConfidence = businessModelResult.confidence || 0.0;
    
    // Determine tags - only tag when confidence >= 0.7
    const tags = [];
    
    if (primaryConfidence >= 0.7) {
      // Tag the primary model only if confidence is high enough
      tags.push(primaryModel);
    } else {
      // Confidence too low - tag as Unclassified
      tags.push('Unclassified');
    }
    
    // Add behavioral tags (these are independent of business model)
    // Tag name must match UI filter: "Currently Running Ads"
    if (hasAds) {
      tags.push('Currently Running Ads');
    }
    
    // NOTE: Additional tags like "New Store", "Established Store", "Shopify Plus", etc.
    // should be added in a separate classification step based on other signals
    
    // Store signals in scores for explainability (remove _signals prefix if present)
    const scoresWithSignals = {
      ...scores,
      _signals: businessModelResult.signals || {},
    };
    
    return {
      scores: scoresWithSignals,
      primaryBusinessModel: primaryConfidence >= 0.7 ? primaryModel : null,
      businessModelConfidence: primaryConfidence,
      tags,
    };
  } catch (error) {
    console.error(`[Classification] Error classifying store ${url}:`, error.message);
    // Return unclassified on error
    return {
      scores: {
        'Print on Demand': 0.25,
        'Dropshipping': 0.25,
        'Branded Ecommerce': 0.25,
        'Marketplace': 0.25,
      },
      primaryBusinessModel: null,
      businessModelConfidence: 0.25,
      tags: ['Unclassified'],
      error: error.message,
    };
  }
};

/**
 * Update store with classification results (only if tags are not locked)
 */
export const updateStoreClassification = async (storeId, classificationResult) => {
  const prisma = getPrisma();
  
  try {
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: { id: true, tagsLocked: true },
    });
    
    if (!store) {
      return { success: false, error: 'Store not found' };
    }
    
    // If tags are locked by admin, don't update classification
    if (store.tagsLocked) {
      console.log(`[Classification] Skipping store ${storeId} - tags are locked by admin`);
      return { success: false, error: 'Tags are locked', skipped: true };
    }
    
    // Determine tags array (filter out Unclassified if we have a primary model)
    let tags = classificationResult.tags || [];
    if (classificationResult.primaryBusinessModel && tags.includes('Unclassified')) {
      tags = tags.filter(t => t !== 'Unclassified');
    }
    
    // Update store
    await prisma.store.update({
      where: { id: storeId },
      data: {
        primaryBusinessModel: classificationResult.primaryBusinessModel,
        businessModelConfidence: classificationResult.businessModelConfidence,
        businessModelScores: classificationResult.scores,
        tags,
        businessModel: classificationResult.primaryBusinessModel || 'Unknown', // Legacy field for backward compatibility
        lastClassificationAttempt: new Date(),
        nextRetryAt: classificationResult.businessModelConfidence < 0.7 
          ? new Date(Date.now() + 24 * 60 * 60 * 1000) // Retry in 24h if low confidence
          : null,
      },
    });
    
    return { success: true };
  } catch (error) {
    console.error(`[Classification] Error updating store ${storeId}:`, error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Classify stores that need classification
 */
export const classifyPendingStores = async (limit = 100) => {
  const prisma = getPrisma();
  
  // Get stores that need classification
  // Priority: confirmed Shopify stores with null or low-confidence classifications
  const stores = await prisma.store.findMany({
    where: {
      AND: [
        { shopifyStatus: { in: ['confirmed', 'probable'] } }, // Only verified Shopify stores
        { healthStatus: { in: ['healthy'] } }, // Only healthy stores
        {
          OR: [
            { primaryBusinessModel: null },
            { businessModelConfidence: null },
            { businessModelConfidence: { lt: 0.7 } },
            { 
              tags: { isEmpty: true },
              tagsLocked: false,
            },
            {
              nextRetryAt: { lte: new Date() },
            },
          ],
        },
        { tagsLocked: false }, // Don't classify stores with locked tags
      ],
    },
    take: limit,
    select: {
      id: true,
      url: true,
      retryCount: true,
      tagsLocked: true,
    },
  });
  
  console.log(`[Classification] Processing ${stores.length} stores for business model classification...`);
  
  const results = {
    classified: 0,
    highConfidence: 0,
    unclassified: 0,
    skipped: 0,
    errors: 0,
  };
  
  for (const store of stores) {
    try {
      const classificationResult = await classifyBusinessModel(store.url);
      const updateResult = await updateStoreClassification(store.id, classificationResult);
      
      if (updateResult.success) {
        results.classified++;
        if (classificationResult.businessModelConfidence >= 0.7) {
          results.highConfidence++;
        } else {
          results.unclassified++;
        }
      } else if (updateResult.skipped) {
        results.skipped++;
      } else {
        results.errors++;
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`[Classification] Error processing store ${store.id}:`, error.message);
      results.errors++;
      
      // Update retry count and schedule retry
      await prisma.store.update({
        where: { id: store.id },
        data: {
          retryCount: store.retryCount + 1,
          nextRetryAt: new Date(Date.now() + 60 * 60 * 1000 * (store.retryCount + 1)),
        },
      });
    }
  }
  
  console.log(`[Classification] Completed: ${results.classified} classified (${results.highConfidence} high confidence, ${results.unclassified} unclassified), ${results.skipped} skipped, ${results.errors} errors`);
  
  return results;
};
