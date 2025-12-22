/**
 * Deduplication Utilities
 * Prevents scraping URLs that have already been processed
 */

import { getPrisma } from '../config/postgres.js';

/**
 * Normalize URL for comparison
 * Removes trailing slashes, normalizes protocol, etc.
 */
export const normalizeUrlForComparison = (url) => {
  if (!url || typeof url !== 'string') {
    return null;
  }
  
  let normalized = url.trim().toLowerCase();
  
  // Add protocol if missing
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = `https://${normalized}`;
  }
  
  // Remove trailing slash
  normalized = normalized.replace(/\/+$/, '');
  
  // Remove www. prefix for comparison (www.example.com = example.com)
  normalized = normalized.replace(/^https?:\/\/www\./, 'https://');
  normalized = normalized.replace(/^http:\/\/www\./, 'http://');
  
  // Remove query parameters and fragments for comparison
  try {
    const urlObj = new URL(normalized);
    normalized = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
    // Remove trailing slash again after removing query
    normalized = normalized.replace(/\/+$/, '');
  } catch (error) {
    // If URL parsing fails, return as-is
  }
  
  return normalized;
};

/**
 * Check if a URL already exists in the database
 * Returns true if URL exists (already scraped), false if new
 */
export const isUrlAlreadyScraped = async (url) => {
  try {
    const normalizedUrl = normalizeUrlForComparison(url);
    
    if (!normalizedUrl) {
      return false; // Invalid URL, treat as new
    }
    
    const prisma = getPrisma();
    
    // Check for exact match (case-insensitive)
    const exactMatch = await prisma.store.findFirst({
      where: {
        url: {
          equals: normalizedUrl,
          mode: 'insensitive',
        },
      },
    });
    
    if (exactMatch) {
      return true;
    }
    
    // Also check variations (with/without www, http/https)
    const variations = [
      normalizedUrl,
      normalizedUrl.replace(/^https:\/\//, 'http://'),
      normalizedUrl.replace(/^http:\/\//, 'https://'),
      normalizedUrl.replace(/^https:\/\//, 'https://www.'),
      normalizedUrl.replace(/^https:\/\/www\./, 'https://'),
    ];
    
    // Remove duplicates
    const uniqueVariations = [...new Set(variations)];
    
    // Check all variations
    const existingStore = await prisma.store.findFirst({
      where: {
        OR: uniqueVariations.map(variation => ({
          url: {
            equals: variation,
            mode: 'insensitive',
          },
        })),
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
 */
export const filterAlreadyScrapedUrls = async (urls) => {
  if (!Array.isArray(urls) || urls.length === 0) {
    return [];
  }
  
  try {
    // Normalize all URLs
    const normalizedUrls = urls
      .map(url => normalizeUrlForComparison(url))
      .filter(url => url !== null);
    
    if (normalizedUrls.length === 0) {
      return [];
    }
    
    const prisma = getPrisma();
    
    // Batch check in database (case-insensitive)
    const existingStores = await prisma.store.findMany({
      where: {
        OR: normalizedUrls.map(url => ({
          url: {
            equals: url,
            mode: 'insensitive',
          },
        })),
      },
      select: { url: true },
    });
    
    // Create set of existing URLs (normalized)
    const existingUrlsSet = new Set(
      existingStores.map(store => normalizeUrlForComparison(store.url))
    );
    
    // Filter out already scraped URLs
    const newUrls = urls.filter(url => {
      const normalized = normalizeUrlForComparison(url);
      return normalized && !existingUrlsSet.has(normalized);
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
 */
export const getDeduplicationStats = async (urls) => {
  if (!Array.isArray(urls) || urls.length === 0) {
    return { total: 0, new: 0, alreadyScraped: 0 };
  }
  
  try {
    const normalizedUrls = urls
      .map(url => normalizeUrlForComparison(url))
      .filter(url => url !== null);
    
    if (normalizedUrls.length === 0) {
      return { total: urls.length, new: 0, alreadyScraped: urls.length };
    }
    
    const prisma = getPrisma();
    
    const existingStores = await prisma.store.findMany({
      where: {
        OR: normalizedUrls.map(url => ({
          url: {
            equals: url,
            mode: 'insensitive',
          },
        })),
      },
      select: { url: true },
    });
    
    const existingUrlsSet = new Set(
      existingStores.map(store => normalizeUrlForComparison(store.url))
    );
    
    const newUrls = urls.filter(url => {
      const normalized = normalizeUrlForComparison(url);
      return normalized && !existingUrlsSet.has(normalized);
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

