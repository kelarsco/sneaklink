/**
 * Prisma Helper Utilities
 * 
 * Common helper functions for Prisma operations
 * These make it easier to migrate from Mongoose to Prisma
 */

import { getPrisma } from '../config/postgres.js';
import { buildVisibilityFilter } from './visibilityRules.js';

/**
 * Normalize URL to root homepage only (remove all subpaths)
 * Examples:
 * - https://store.myshopify.com/products/item → https://store.myshopify.com
 * - https://example.com/collections/sale → https://example.com
 * - https://www.example.com/pages/about → https://www.example.com
 */
export const normalizeUrlToRoot = (url) => {
  if (!url) return null;
  
  try {
    // Remove whitespace
    let cleanUrl = url.trim();
    
    // Add protocol if missing
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = `https://${cleanUrl}`;
    }
    
    // Parse URL to extract root domain
    const urlObj = new URL(cleanUrl);
    
    // Reconstruct root URL (protocol + hostname only)
    const rootUrl = `${urlObj.protocol}//${urlObj.hostname}`;
    
    // Convert to lowercase and remove trailing slash
    return rootUrl.toLowerCase().replace(/\/$/, '');
  } catch (error) {
    // If URL parsing fails, try basic cleanup
    const basicClean = url.trim().toLowerCase();
    // Remove everything after first / (but keep protocol and domain)
    const match = basicClean.match(/^(https?:\/\/[^\/]+)/);
    return match ? match[1] : basicClean.replace(/\/$/, '');
  }
};

/**
 * Normalize URL for consistent storage (legacy - now uses root normalization)
 */
export const normalizeUrl = (url) => {
  return normalizeUrlToRoot(url);
};

/**
 * Build backward-compatible filter that works with both old and new schema fields
 * This ensures stores are filtered correctly regardless of whether they use:
 * - Old fields: isShopify, isActive, businessModel
 * - New fields: shopifyStatus, shopifyConfidence, primaryBusinessModel, healthStatus
 */
export const buildBackwardCompatibleFilter = (filter = {}) => {
  const where = {};
  const andConditions = [];
  
  // Shopify filter: Prefer shopifyStatus, fallback to isShopify for backward compatibility
  if (filter.isShopify !== undefined || filter.shopifyStatus !== undefined) {
    if (filter.isShopify === true) {
      // Show confirmed/probable Shopify stores OR legacy stores with isShopify=true (including null shopifyStatus)
      andConditions.push({
        OR: [
          { shopifyStatus: { in: ['confirmed', 'probable'] } },
          { isShopify: true, shopifyStatus: null }, // Legacy stores without shopifyStatus
        ],
      });
    } else if (filter.isShopify === false) {
      // Show unlikely/unverified stores OR legacy stores with isShopify=false
      andConditions.push({
        OR: [
          { shopifyStatus: { in: ['unlikely', 'unverified'] } },
          { isShopify: false, shopifyStatus: null }, // Legacy stores without shopifyStatus
        ],
      });
    } else if (filter.shopifyStatus) {
      // If shopifyStatus is explicitly set, use it directly
      if (Array.isArray(filter.shopifyStatus)) {
        andConditions.push({ shopifyStatus: { in: filter.shopifyStatus } });
      } else {
        andConditions.push({ shopifyStatus: filter.shopifyStatus });
      }
    }
  }
  
  // Active filter: Use isActive AND healthStatus (backward compatibility)
  if (filter.isActive !== undefined) {
    if (filter.isActive === true) {
      // Show active stores that are not marked as inactive
      andConditions.push({ isActive: true });
      // Exclude stores marked as possibly_inactive (allow null for legacy/discovery-phase stores)
      andConditions.push({
        OR: [
          { healthStatus: { not: 'possibly_inactive' } },
          { healthStatus: null }, // Discovery phase or legacy stores
        ],
      });
    } else {
      andConditions.push({ isActive: false });
    }
  }
  
  // Country filter
  if (filter.country) {
    if (filter.country.$in) {
      andConditions.push({ country: { in: filter.country.$in } });
    } else if (Array.isArray(filter.country)) {
      andConditions.push({ country: { in: filter.country } });
    } else {
      andConditions.push({ country: filter.country });
    }
  }
  
  // Tags filter
  if (filter.tags) {
    if (filter.tags.$in) {
      andConditions.push({ tags: { hasSome: filter.tags.$in } });
    } else if (filter.tags.$all) {
      andConditions.push({ tags: { hasEvery: filter.tags.$all } });
    } else if (Array.isArray(filter.tags)) {
      andConditions.push({ tags: { hasSome: filter.tags } });
    }
  }
  
  // Theme filter
  if (filter.theme) {
    if (filter.theme.$in) {
      andConditions.push({ theme: { in: filter.theme.$in } });
    } else if (Array.isArray(filter.theme)) {
      andConditions.push({ theme: { in: filter.theme } });
    } else {
      andConditions.push({ theme: filter.theme });
    }
  }
  
  // Business model filter: Support both old (businessModel) and new (primaryBusinessModel) fields
  if (filter.businessModel !== undefined || filter.primaryBusinessModel !== undefined) {
    const businessModelFilter = filter.primaryBusinessModel || filter.businessModel;
    if (businessModelFilter) {
      if (Array.isArray(businessModelFilter)) {
        andConditions.push({
          OR: [
            { primaryBusinessModel: { in: businessModelFilter } },
            { businessModel: { in: businessModelFilter } },
          ],
        });
      } else if (typeof businessModelFilter === 'object' && businessModelFilter.$in) {
        andConditions.push({
          OR: [
            { primaryBusinessModel: { in: businessModelFilter.$in } },
            { businessModel: { in: businessModelFilter.$in } },
          ],
        });
      } else {
        andConditions.push({
          OR: [
            { primaryBusinessModel: businessModelFilter },
            { businessModel: businessModelFilter },
          ],
        });
      }
    }
  }
  
  // Date range filters
  if (filter.dateAdded) {
    const dateFilter = {};
    if (filter.dateAdded.$gte || filter.dateAdded.gte) {
      dateFilter.gte = filter.dateAdded.$gte || filter.dateAdded.gte;
    }
    if (filter.dateAdded.$lte || filter.dateAdded.lte) {
      dateFilter.lte = filter.dateAdded.$lte || filter.dateAdded.lte;
    }
    if (Object.keys(dateFilter).length > 0) {
      andConditions.push({ dateAdded: dateFilter });
    }
  }
  
  // Return where clause - if we have AND conditions, use them; otherwise return empty object
  if (andConditions.length > 0) {
    return { AND: andConditions };
  }
  
  return where;
};

/**
 * Convert MongoDB filter to Prisma where clause (legacy - uses backward-compatible filter)
 */
export const convertMongoFilterToPrisma = (mongoFilter) => {
  return buildBackwardCompatibleFilter(mongoFilter);
};

/**
 * Find stores with filters and pagination
 */
export const findStores = async (filter = {}, options = {}) => {
  const prisma = getPrisma();
  
  const {
    page = 1,
    limit = 50,
    sort = { dateAdded: 'desc' },
  } = options;
  
  const skip = (page - 1) * limit;
  
  // Check if filter is already in Prisma format (has 'in', 'hasSome', 'gte', etc.)
  // or MongoDB format (has '$in', '$gte', etc.)
  const hasPrismaOperators = filter && Object.keys(filter).some(key => {
    const value = filter[key];
    if (typeof value === 'object' && value !== null) {
      return value.in !== undefined || 
             value.hasSome !== undefined || 
             value.hasEvery !== undefined ||
             value.gte !== undefined || 
             value.lte !== undefined ||
             value.gt !== undefined || 
             value.lt !== undefined;
    }
    return false;
  });
  
  const hasMongoOperators = filter && Object.keys(filter).some(key => {
    const value = filter[key];
    if (typeof value === 'object' && value !== null) {
      return value.$in !== undefined || 
             value.$all !== undefined || 
             value.$gte !== undefined || 
             value.$lte !== undefined;
    }
    return false;
  });
  
  // Use filter directly if already in Prisma format, otherwise convert
  const where = hasPrismaOperators ? filter : (hasMongoOperators ? convertMongoFilterToPrisma(filter) : filter);
  
  // Debug logging (only if DEBUG_STORES_API is set)
  if (process.env.DEBUG_STORES_API === 'true' && filter && Object.keys(filter).length > 0) {
    console.log('[PrismaHelper] Filter format detection:', {
      hasPrismaOperators,
      hasMongoOperators,
      filterKeys: Object.keys(filter),
      whereKeys: Object.keys(where),
    });
  }
  
  // Convert sort
  const orderBy = {};
  if (sort.dateAdded) {
    orderBy.dateAdded = sort.dateAdded === 'desc' ? 'desc' : 'asc';
  } else if (sort.lastScraped) {
    orderBy.lastScraped = sort.lastScraped === 'desc' ? 'desc' : 'asc';
  } else {
    orderBy.dateAdded = 'desc'; // Default
  }
  
  // Execute query
  const [stores, total] = await Promise.all([
    prisma.store.findMany({
      where,
      skip,
      take: limit,
      orderBy,
    }),
    prisma.store.count({ where }),
  ]);
  
  return {
    stores,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

/**
 * Upsert store (create or update)
 */
export const upsertStore = async (storeData) => {
  const prisma = getPrisma();
  
  const normalizedUrl = normalizeUrl(storeData.url);
  if (!normalizedUrl) {
    throw new Error('URL is required');
  }
  
  // Prepare data
  const data = {
    name: storeData.name || 'Unknown Store',
    url: normalizedUrl,
    country: storeData.country || 'Unknown',
    productCount: storeData.productCount || 1,
    isActive: storeData.isActive !== undefined ? storeData.isActive : true,
    isShopify: storeData.isShopify !== undefined ? storeData.isShopify : true,
    hasFacebookAds: storeData.hasFacebookAds || false,
    tags: storeData.tags || [],
    businessModel: storeData.businessModel || 'Unknown',
    source: storeData.source || 'api',
    lastScraped: new Date(),
  };
  
  // Set dateAdded only on insert
  const dateAdded = storeData.dateAdded || new Date();
  
  return prisma.store.upsert({
    where: { url: normalizedUrl },
    update: data,
    create: {
      ...data,
      dateAdded,
    },
  });
};

/**
 * Find store by URL
 */
export const findStoreByUrl = async (url) => {
  const prisma = getPrisma();
  const normalizedUrl = normalizeUrl(url);
  
  if (!normalizedUrl) return null;
  
  return prisma.store.findUnique({
    where: { url: normalizedUrl },
  });
};

/**
 * Find store by ID
 */
export const findStoreById = async (id) => {
  const prisma = getPrisma();
  return prisma.store.findUnique({
    where: { id },
  });
};

/**
 * Update store
 */
export const updateStore = async (id, data) => {
  const prisma = getPrisma();
  
  // Normalize URL if provided
  if (data.url) {
    data.url = normalizeUrl(data.url);
  }
  
  return prisma.store.update({
    where: { id },
    data,
  });
};

/**
 * Delete store
 */
export const deleteStore = async (id) => {
  const prisma = getPrisma();
  return prisma.store.delete({
    where: { id },
  });
};

/**
 * Count stores with filter
 */
export const countStores = async (filter = {}) => {
  const prisma = getPrisma();
  const where = convertMongoFilterToPrisma(filter);
  return prisma.store.count({ where });
};
