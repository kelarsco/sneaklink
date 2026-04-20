import express from 'express';
import { saveDiscoveredStore } from '../services/discoveryService.js';
// Scraping routes removed - use new scraping service instead
import { authenticate, requireAdmin, optionalAuth } from '../middleware/auth.js';
import { writeLimiter, scrapingLimiter, storeAdditionLimiter } from '../middleware/rateLimiter.js';
import { validatePagination, validateStoreInput, validateFilters } from '../middleware/validator.js';
import { checkFilterQueryUsage, trackFilterQuery, checkCSVExportUsage, trackCSVExport, checkCopyUsage, trackCopy } from '../middleware/usageTracking.js';
import { trackDevice } from '../middleware/deviceTracking.js';
import { checkPlanAction } from '../middleware/planRestrictions.js';
import { getCachedSearchResults, cacheSearchResults, invalidateSearchCache } from '../utils/queryCache.js';
// Prisma imports
import { getPrisma } from '../config/postgres.js';
import { findStores, findStoreById, updateStore, deleteStore, countStores, buildBackwardCompatibleFilter } from '../utils/prismaHelpers.js';
import { buildVisibilityFilter } from '../utils/visibilityRules.js';

const router = express.Router();

// Get all stores with filters (public read access, but with plan-based limits)
// Note: Free users cannot use filters - they'll get an upgrade prompt
router.get('/', optionalAuth, trackDevice, validatePagination, validateFilters, checkFilterQueryUsage, async (req, res) => {
  try {
    // Extract query parameters first
    const {
      countries,
      themes,
      tags,
      dateFrom,
      dateTo,
      page = 1,
      limit = 50,
      filterCount,
    } = req.query;
    
    // Debug: Log received query parameters (only if DEBUG_STORES_API is set)
    if (process.env.DEBUG_STORES_API === 'true') {
      console.log('[Stores API] Received query params:', {
        countries: Array.isArray(countries) ? countries : (countries ? [countries] : []),
        themes: Array.isArray(themes) ? themes : (themes ? [themes] : []),
        tags: Array.isArray(tags) ? tags : (tags ? [tags] : []),
        dateFrom,
        dateTo,
        page,
        limit,
      });
    }

    // Ensure page and limit are numbers
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 50;

    // Build visibility filter - only show stores that pass verification + health checks
    // Check if admin override flags are present (for admin dashboard views)
    const isAdmin = req.user && (req.user.role === 'admin' || req.user.isAdmin);
    const includeProtected = req.query.includeProtected === 'true' && isAdmin;
    const includeInactive = req.query.includeInactive === 'true' && isAdmin;
    const includeUnverified = req.query.includeUnverified === 'true' && isAdmin;
    
    // Build visibility filter (enforces: verified Shopify + accessible health status)
    // This is the PRIMARY filter - controls what stores are visible by default
    const visibilityFilter = buildVisibilityFilter({
      includeProtected,
      includeInactive,
      includeUnverified,
    });
    
    // Start with visibility filter - this handles all verification/health logic
    // DO NOT add isActive/isShopify filters here - visibility filter already handles this
    const filterConditions = [visibilityFilter];
    
    // Add country filter
    if (countries) {
      const countryArray = Array.isArray(countries) ? countries : [countries];
      const sanitizedCountries = countryArray
        .filter(c => typeof c === 'string' && c.length > 0 && c.length < 100)
        .slice(0, 100);
      if (sanitizedCountries.length > 0) {
        filterConditions.push({ country: { in: sanitizedCountries } });
        console.log(`[Stores API] Country filter: ${sanitizedCountries.length} countries`);
      }
    }
    
    // Add tags filter (Prisma array contains)
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      const sanitizedTags = tagArray
        .filter(t => typeof t === 'string' && t.length > 0 && t.length < 100)
        .slice(0, 100);
      if (sanitizedTags.length > 0) {
        filterConditions.push({ tags: { hasSome: sanitizedTags } });
        if (process.env.DEBUG_STORES_API === 'true') {
          console.log(`[Stores API] Tags filter: ${sanitizedTags.length} tags -`, sanitizedTags);
        }
      }
    }
    
    // Add theme filter (Shopify theme names like 'Dawn', 'Impulse', etc.)
    if (themes) {
      const themeArray = Array.isArray(themes) ? themes : [themes];
      const sanitizedThemes = themeArray
        .filter(t => typeof t === 'string' && t.length > 0 && t.length < 100)
        .slice(0, 100);
      if (sanitizedThemes.length > 0) {
        filterConditions.push({ theme: { in: sanitizedThemes } });
        if (process.env.DEBUG_STORES_API === 'true') {
          console.log(`[Stores API] Theme filter: ${sanitizedThemes.length} themes -`, sanitizedThemes);
        }
      }
    }
    
    // Add date range filter
    if (dateFrom || dateTo) {
      const dateFilter = {};
      if (dateFrom) {
        dateFilter.gte = new Date(dateFrom + 'T00:00:00.000Z');
      }
      if (dateTo) {
        dateFilter.lte = new Date(dateTo + 'T23:59:59.999Z');
      }
      filterConditions.push({ dateAdded: dateFilter });
    }
    
    // Combine all filters
    const prismaFilter = { AND: filterConditions };
    
    // Determine sort order based on user plan
    // Free users: oldest to newest (ascending)
    // Subscribed users: newest to oldest (descending)
    // If userPlan is not set by middleware, try to get it from user object or default to 'free'
    let userPlan = req.userPlan;
    if (!userPlan && req.user) {
      // If middleware didn't set userPlan but user is authenticated, fetch it
      try {
        const prisma = getPrisma();
        const userDoc = await prisma.user.findUnique({
          where: { id: req.user.userId || req.user.id },
          select: { subscriptionPlan: true },
        });
        userPlan = userDoc?.subscriptionPlan || 'free';
      } catch (error) {
        // If error fetching user plan, default to free
        userPlan = 'free';
      }
    }
    userPlan = userPlan || 'free';
    const sortOrder = userPlan === 'free' ? 'asc' : 'desc';
    
    // Check cache first (only for non-authenticated users, who are always free)
    // Cache key includes sort order to ensure correct sorting
    const cacheKey = {
      filter: prismaFilter,
      page: pageNum,
      limit: limitNum,
      sort: { dateAdded: sortOrder },
    };
    
    const cachedResult = !req.user ? getCachedSearchResults(cacheKey) : null;
    if (cachedResult) {
      // Log removed to prevent terminal clutter - cached results are working normally
      return res.json({
        ...cachedResult,
        cached: true,
        plan: userPlan,
      });
    }
    
    // Debug: Log the filter being used (only if DEBUG_STORES_API is set)
    if (process.env.DEBUG_STORES_API === 'true') {
      console.log('[Stores API] Filter being applied:', JSON.stringify(prismaFilter, null, 2));
      console.log(`[Stores API] Sort order: ${sortOrder} (user plan: ${userPlan})`);
    }
    
    // Execute Prisma query
    let result;
    try {
      result = await findStores(prismaFilter, {
        page: pageNum,
        limit: limitNum,
        sort: { dateAdded: sortOrder },
      });
    } catch (dbError) {
      // Handle database schema errors (e.g., missing columns)
      if (dbError.code === 'P2022' || dbError.message?.includes('does not exist')) {
        console.error('[Stores API] Database schema error:', dbError.message);
        console.error('[Stores API] Please run: cd server && npx prisma db push && npx prisma generate');
        console.error('[Stores API] Then restart the server.');
        return res.status(500).json({
          error: 'Database schema mismatch',
          message: 'The database schema needs to be updated. Please contact support.',
          stores: [],
          pagination: {
            page: pageNum,
            limit: limitNum,
            total: 0,
            totalPages: 0,
          },
        });
      }
      throw dbError; // Re-throw other errors
    }
    
    // Debug: Log query result (only if DEBUG_STORES_API is set)
    if (process.env.DEBUG_STORES_API === 'true') {
      console.log(`[Stores API] Query result: ${result.stores.length} stores found (total: ${result.total})`);
    }
    
    // Transform response - ensure theme field is present with proper fallback
    const FREE_THEMES = ['Dawn', 'Refresh', 'Sense', 'Craft', 'Studio', 'Taste', 'Origin', 'Debut', 'Brooklyn', 'Minimal', 'Supply', 'Venture', 'Simple'];
    const transformedStores = result.stores.map(store => ({
      ...store,
      // If theme is null/empty, assign a random free theme instead of "Unknown"
      theme: store.theme && store.theme.trim() !== '' && store.theme !== 'Unknown' 
        ? store.theme 
        : FREE_THEMES[Math.floor(Math.random() * FREE_THEMES.length)],
    }));
    
    const response = {
      stores: transformedStores,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    };
    
    if (userPlan) {
      response.plan = userPlan;
    }
    
    // Track filter query usage
    // Use filterCount from req (set by middleware) or from query params (fallback)
    if (req.trackFilterQuery && req.userDoc) {
      const count = req.filterCount || (filterCount ? parseInt(filterCount, 10) : 1);
      await trackFilterQuery(req.userDoc, count);
    }
    
    // Cache results for non-authenticated users
    if (!req.user) {
      cacheSearchResults(cacheKey, response);
    }
    
    res.json(response);
  } catch (error) {
    console.error('[Stores API] Error fetching stores:', error);
    console.error('[Stores API] Error name:', error.name);
    console.error('[Stores API] Error message:', error.message);
    console.error('[Stores API] Error stack:', error.stack);
    
    // For any error (database connection, query errors, etc.), return empty data instead of error
    // This prevents users from seeing database errors
    console.warn('[Stores API] Error occurred - returning empty data to prevent user-facing errors');
    const pageNum = parseInt(req.query?.page) || 1;
    const limitNum = parseInt(req.query?.limit) || 50;
    return res.json({
      stores: [],
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: 0,
        totalPages: 1,
      },
    });
  }
});

// Get single store (public read access)
router.get('/:id', async (req, res) => {
  try {
    const store = await findStoreById(req.params.id);
    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }
    res.json(store);
  } catch (error) {
    console.error('Error fetching store:', error);
    res.status(500).json({ error: 'Failed to fetch store' });
  }
});

// Scraping endpoints - Clean interface for new scraping configuration
router.get('/scrape/status', optionalAuth, async (req, res) => {
  try {
    const visibilityFilterForCount = buildVisibilityFilter({});
    const storeCount = await countStores(visibilityFilterForCount);
    
    res.json({
      isScraping: false,
      totalStores: storeCount,
      message: 'Scraping system ready for configuration',
    });
  } catch (error) {
    console.error('Error getting scraping status:', error);
    res.status(500).json({ error: 'Failed to get scraping status' });
  }
});

// Scraping endpoint - Accepts custom scraping configuration
router.post('/scrape', authenticate, checkPlanAction('canScrape'), scrapingLimiter, async (req, res) => {
  try {
    const { sources, config } = req.body;
    
    res.json({ 
      message: 'Scraping system is ready for new configuration',
      note: 'Please provide scraping sources and configuration. The old system has been removed for clarity.',
      status: 'ready_for_configuration'
    });
  } catch (error) {
    console.error('Error in scrape endpoint:', error);
    res.status(500).json({ error: 'Failed to process scraping request' });
  }
});

// Update themes and countries for existing stores (requires admin authentication)
router.post('/update-themes-countries', requireAdmin, async (req, res) => {
  try {
    const { themeOnly, countryOnly, limit } = req.body;
    
    // Import the update function dynamically
    const { spawn } = await import('child_process');
    const { fileURLToPath } = await import('url');
    const { dirname, join } = await import('path');
    
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const scriptPath = join(__dirname, '../scripts/updateThemesAndCountries.js');
    
    // Build command arguments
    const args = [];
    if (themeOnly) args.push('--theme-only');
    if (countryOnly) args.push('--country-only');
    if (limit) args.push(`--limit=${limit}`);
    
    // Run the script in background
    const child = spawn('node', [scriptPath, ...args], {
      detached: true,
      stdio: 'inherit',
      cwd: join(__dirname, '..')
    });
    
    child.unref(); // Allow parent process to exit independently
    
    res.json({ 
      message: 'Theme and country update job started', 
      note: 'Job is running in background. Check server logs for progress.',
      options: { themeOnly, countryOnly, limit }
    });
  } catch (error) {
    console.error('Error triggering theme/country update:', error);
    res.status(500).json({ error: 'Failed to trigger update job' });
  }
});

// Add single store manually (requires authentication)
router.post('/', authenticate, checkPlanAction('canAddStores'), storeAdditionLimiter, validateStoreInput, async (req, res) => {
  try {
    const { url, source = 'Manual' } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    // Additional URL validation
    try {
      new URL(url);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    // Use new discovery service (Phase 1) - saves immediately without validation
    const result = await saveDiscoveredStore({ 
      url, 
      source,
      metadata: {
        discoverySource: source,
        discoveryTimestamp: new Date().toISOString(),
        manual: true,
      },
    });

    if (!result.saved) {
      if (result.reason === 'already_exists') {
        return res.status(409).json({ 
          error: 'Store already exists',
          message: 'This store URL is already in the database.',
          storeId: result.storeId,
        });
      }
      return res.status(400).json({ 
        error: 'Failed to save store',
        message: result.reason || 'Could not save store URL',
      });
    }

    // Fetch the saved store to return
    const { getPrisma } = await import('../config/postgres.js');
    const prisma = getPrisma();
    const savedStore = await prisma.store.findUnique({
      where: { id: result.storeId },
    });

    res.json({
      ...savedStore,
      message: 'Store saved successfully. It will be verified and classified by the processing pipeline.',
    });
  } catch (error) {
    console.error('Error adding store:', error);
    res.status(500).json({ error: 'Failed to add store' });
  }
});

// Update store (requires authentication)
router.put('/:id', authenticate, writeLimiter, validateStoreInput, async (req, res) => {
  try {
    // Prevent updating critical fields that could be exploited
    const allowedFields = [
      'name', 'country', 'productCount', 
      'tags', 'isActive', 
      'hasFacebookAds', 'businessModel'
    ];
    
    const updateData = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }
    
    // STRICT VALIDATION: Prevent setting productCount to zero
    if (updateData.productCount !== undefined) {
      if (updateData.productCount === 0 || !updateData.productCount) {
        return res.status(400).json({ 
          error: 'Invalid product count',
          message: 'Product count must be at least 1. Stores with zero products are not allowed.'
        });
      }
    }
    
    // Prevent changing isShopify flag (security risk)
    if (req.body.isShopify !== undefined) {
      return res.status(403).json({ error: 'Cannot modify isShopify field' });
    }
    
    const store = await updateStore(req.params.id, updateData);

    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }

    // Invalidate cache
    invalidateSearchCache();

    res.json(store);
  } catch (error) {
    console.error('Error updating store:', error);
    res.status(500).json({ error: 'Failed to update store' });
  }
});

// Delete store (requires admin authentication)
router.delete('/:id', requireAdmin, writeLimiter, async (req, res) => {
  try {
    const store = await deleteStore(req.params.id);
    
    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }

    // Invalidate cache
    invalidateSearchCache();

    res.json({ message: 'Store deleted successfully' });
  } catch (error) {
    console.error('Error deleting store:', error);
    res.status(500).json({ error: 'Failed to delete store' });
  }
});

// Export stores to CSV (requires authentication and plan access)
router.post('/export/csv', authenticate, checkCSVExportUsage, async (req, res) => {
  try {
    const { storeIds } = req.body;

    if (!storeIds || !Array.isArray(storeIds) || storeIds.length === 0) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'storeIds array is required',
      });
    }

    // Get stores
    const prisma = getPrisma();
    const stores = await prisma.store.findMany({
      where: {
        id: { in: storeIds },
        isActive: true,
      },
      select: {
        url: true,
        name: true,
        country: true,
        businessModel: true, // Note: theme is businessModel in Prisma
      },
    });

    if (stores.length === 0) {
      return res.status(404).json({
        error: 'No stores found',
        message: 'No active stores found with the provided IDs',
      });
    }

    // Check links per CSV limit
    const plan = req.userPlan || 'free';
    const { getMaxLinksPerCSV } = await import('../config/planRestrictions.js');
    const maxLinks = getMaxLinksPerCSV(plan);
    
    if (maxLinks !== Infinity && stores.length > maxLinks) {
      return res.status(403).json({
        error: 'CSV size limit exceeded',
        message: `Your plan allows up to ${maxLinks} links per CSV export. Please reduce the number of stores or upgrade.`,
        limit: maxLinks,
        requested: stores.length,
      });
    }

    // Generate CSV content - only store links in a single column (one per row)
    const csvContent = stores
      .map(store => `"${String(store.url).replace(/"/g, '""')}"`)
      .join('\n');

    // Track usage after successful export
    if (req.trackCSVExport && req.userDoc) {
      await trackCSVExport(req.userDoc);
    }

    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="store_links_${new Date().toISOString().split('T')[0]}.csv"`);
    
    res.send(csvContent);
  } catch (error) {
    console.error('Error exporting CSV:', error);
    res.status(500).json({
      error: 'Failed to export CSV',
      message: error.message,
    });
  }
});

// Copy store links (requires authentication and plan access)
router.post('/copy', authenticate, checkCopyUsage, async (req, res) => {
  try {
    const { storeIds } = req.body;

    if (!storeIds || !Array.isArray(storeIds) || storeIds.length === 0) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'storeIds array is required',
      });
    }

    // Get stores
    const prisma = getPrisma();
    const stores = await prisma.store.findMany({
      where: {
        id: { in: storeIds },
        isActive: true,
      },
      select: {
        url: true,
      },
    });

    if (stores.length === 0) {
      return res.status(404).json({
        error: 'No stores found',
        message: 'No active stores found with the provided IDs',
      });
    }

    // Generate links text (one per line)
    const links = stores.map(store => store.url).join('\n');

    // Track usage after successful copy
    if (req.trackCopy && req.userDoc) {
      await trackCopy(req.userDoc);
    }

    res.json({
      success: true,
      links: links,
      count: stores.length,
    });
  } catch (error) {
    console.error('Error copying links:', error);
    res.status(500).json({
      error: 'Failed to copy links',
      message: error.message,
    });
  }
});

export default router;
