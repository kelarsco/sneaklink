/**
 * Deduplication Utilities
 * Prevents scraping URLs that have already been processed
 * 
 * Uses canonical URL normalization for consistency with discovery service
 */

import { getPrisma } from '../config/postgres.js';
import { canonicalizeUrl } from './urlCanonicalizer.js';

/**
 * Normalize URL for comparison (DEPRECATED - use canonicalizeUrl instead)
 * @deprecated Use canonicalizeUrl from urlCanonicalizer.js for consistency
 */
export const normalizeUrlForComparison = (url) => {
  // Use canonical URL normalization for consistency
  return canonicalizeUrl(url);
};

/**
 * Check if a URL already exists in the database
 * Returns true if URL exists (already scraped), false if new
 * Uses canonical URL normalization for consistent matching
 */
export const isUrlAlreadyScraped = async (url) => {
  try {
    const canonicalUrl = canonicalizeUrl(url);
    
    if (!canonicalUrl) {
      return false; // Invalid URL, treat as new
    }
    
    const prisma = getPrisma();
    
    // Check for exact match using canonical URL (database stores canonical URLs)
    const existingStore = await prisma.store.findUnique({
      where: {
        url: canonicalUrl, // URL field has unique constraint, so findUnique works
      },
    });
    
    return !!existingStore;
  } catch (error) {
    console.error('Error checking if URL already scraped:', error.message);
    // On error, assume not scraped (allow processing)
    return false;
  }
};

/**
 * Filter out URLs that have already been scraped
 * Returns array of new URLs only
 * Uses canonical URL normalization for consistent matching
 */
export const filterAlreadyScrapedUrls = async (urls) => {
  if (!Array.isArray(urls) || urls.length === 0) {
    return [];
  }
  
  try {
    // Canonicalize all URLs
    const canonicalUrls = urls
      .map(url => canonicalizeUrl(url))
      .filter(url => url !== null);
    
    if (canonicalUrls.length === 0) {
      return [];
    }
    
    const prisma = getPrisma();
    
    // Batch check in database using canonical URLs (URL field has unique constraint)
    const existingStores = await prisma.store.findMany({
      where: {
        url: { in: canonicalUrls }, // Direct match on unique URL field
      },
      select: { url: true },
    });
    
    // Create set of existing canonical URLs
    const existingUrlsSet = new Set(existingStores.map(store => store.url));
    
    // Filter out already scraped URLs
    const newUrls = urls.filter(url => {
      const canonical = canonicalizeUrl(url);
      return canonical && !existingUrlsSet.has(canonical);
    });
    
    return newUrls;
  } catch (error) {
    console.error('Error filtering already scraped URLs:', error.message);
    // On error, return all URLs (allow processing)
    return urls;
  }
};

/**
 * Get count of new vs already scraped URLs
 * Uses canonical URL normalization for consistent matching
 */
export const getDeduplicationStats = async (urls) => {
  if (!Array.isArray(urls) || urls.length === 0) {
    return { total: 0, new: 0, alreadyScraped: 0 };
  }
  
  try {
    const canonicalUrls = urls
      .map(url => canonicalizeUrl(url))
      .filter(url => url !== null);
    
    if (canonicalUrls.length === 0) {
      return { total: urls.length, new: 0, alreadyScraped: urls.length };
    }
    
    const prisma = getPrisma();
    
    const existingStores = await prisma.store.findMany({
      where: {
        url: { in: canonicalUrls }, // Direct match on unique URL field
      },
      select: { url: true },
    });
    
    const existingUrlsSet = new Set(existingStores.map(store => store.url));
    
    const newUrls = urls.filter(url => {
      const canonical = canonicalizeUrl(url);
      return canonical && !existingUrlsSet.has(canonical);
    });
    
    return {
      total: urls.length,
      new: newUrls.length,
      alreadyScraped: urls.length - newUrls.length,
    };
  } catch (error) {
    console.error('Error getting deduplication stats:', error.message);
    return { total: urls.length, new: urls.length, alreadyScraped: 0 };
  }
};

