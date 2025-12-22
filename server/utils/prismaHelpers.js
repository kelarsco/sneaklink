/**
 * Prisma Helper Utilities
 * 
 * Common helper functions for Prisma operations
 * These make it easier to migrate from Mongoose to Prisma
 */

import { getPrisma } from '../config/postgres.js';

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
 * Convert MongoDB filter to Prisma where clause
 */
export const convertMongoFilterToPrisma = (mongoFilter) => {
  const where = {};
  
  // Direct field mappings
  if (mongoFilter.isActive !== undefined) {
    where.isActive = mongoFilter.isActive;
  }
  
  if (mongoFilter.isShopify !== undefined) {
    where.isShopify = mongoFilter.isShopify;
  }
  
  if (mongoFilter.country) {
    if (mongoFilter.country.$in) {
      where.country = { in: mongoFilter.country.$in };
    } else {
      where.country = mongoFilter.country;
    }
  }
  
  if (mongoFilter.tags) {
    if (mongoFilter.tags.$in) {
      where.tags = { hasSome: mongoFilter.tags.$in };
    } else if (mongoFilter.tags.$all) {
      where.tags = { hasEvery: mongoFilter.tags.$all };
    }
  }
  
  if (mongoFilter.businessModel) {
    if (mongoFilter.businessModel.$in) {
      where.businessModel = { in: mongoFilter.businessModel.$in };
    } else {
      where.businessModel = mongoFilter.businessModel;
    }
  }
  
  // Date range filters
  if (mongoFilter.dateAdded) {
    where.dateAdded = {};
    if (mongoFilter.dateAdded.$gte) {
      where.dateAdded.gte = mongoFilter.dateAdded.$gte;
    }
    if (mongoFilter.dateAdded.$lte) {
      where.dateAdded.lte = mongoFilter.dateAdded.$lte;
    }
  }
  
  return where;
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
