/**
 * OPTIMIZED Query Result Cache for MongoDB Atlas Free Tier
 * 
 * PURPOSE:
 * - Prevents duplicate expensive queries
 * - Reduces database reads and writes
 * - In-memory cache (no MongoDB storage needed)
 * 
 * USAGE:
 * - Cache search results for 5 minutes
 * - Cache counts for 1 minute
 * - Auto-invalidate on data changes
 */

// In-memory cache (simple Map)
const cache = new Map();
const CACHE_TTL = {
  SEARCH_RESULTS: 5 * 60 * 1000, // 5 minutes
  COUNT: 60 * 1000, // 1 minute
  EXPORT: 2 * 60 * 1000, // 2 minutes
};

/**
 * Generate cache key from query parameters
 */
function generateCacheKey(prefix, params) {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}:${JSON.stringify(params[key])}`)
    .join('|');
  return `${prefix}:${sortedParams}`;
}

/**
 * Get cached result
 */
export function getCached(key) {
  const cached = cache.get(key);
  if (!cached) return null;
  
  // Check if expired
  if (Date.now() > cached.expiresAt) {
    cache.delete(key);
    return null;
  }
  
  return cached.data;
}

/**
 * Set cache with TTL
 */
export function setCached(key, data, ttl = CACHE_TTL.SEARCH_RESULTS) {
  cache.set(key, {
    data,
    expiresAt: Date.now() + ttl,
  });
  
  // Limit cache size (prevent memory bloat)
  if (cache.size > 1000) {
    // Remove oldest entries
    const entries = Array.from(cache.entries());
    entries.sort((a, b) => a[1].expiresAt - b[1].expiresAt);
    const toRemove = entries.slice(0, 100); // Remove 100 oldest
    toRemove.forEach(([key]) => cache.delete(key));
  }
}

/**
 * Invalidate cache by prefix (e.g., invalidate all search results)
 */
export function invalidateCache(prefix) {
  const keysToDelete = [];
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      keysToDelete.push(key);
    }
  }
  keysToDelete.forEach(key => cache.delete(key));
}

/**
 * Clear all cache
 */
export function clearCache() {
  cache.clear();
}

/**
 * Cache search results
 */
export function cacheSearchResults(queryParams, results) {
  const key = generateCacheKey('search', queryParams);
  setCached(key, results, CACHE_TTL.SEARCH_RESULTS);
  return key;
}

/**
 * Get cached search results
 */
export function getCachedSearchResults(queryParams) {
  const key = generateCacheKey('search', queryParams);
  return getCached(key);
}

/**
 * Cache count query
 */
export function cacheCount(queryParams, count) {
  const key = generateCacheKey('count', queryParams);
  setCached(key, count, CACHE_TTL.COUNT);
  return key;
}

/**
 * Get cached count
 */
export function getCachedCount(queryParams) {
  const key = generateCacheKey('count', queryParams);
  return getCached(key);
}

/**
 * Invalidate all search caches (call after store updates)
 */
export function invalidateSearchCache() {
  invalidateCache('search:');
  invalidateCache('count:');
}
