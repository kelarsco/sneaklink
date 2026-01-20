import {
  scrapeReddit,
  scrapeShopifyMarketplace,
  scrapeSearchEngines,
  scrapeSocialMedia,
  scrapeFreeAPIs,
  scrapeGoogleCustomSearch,
} from '../utils/scrapers.js';
import { scrapeCommonCrawl, scrapeCommonCrawlByCountry } from '../utils/commonCrawl.js';
import { runMassiveScrape, scrapeCertificateTransparency } from '../utils/massiveScraper.js';
import { findNewStoresViaFingerprints } from '../utils/shopifyFingerprintScraper.js';
import { scrapeSocialMediaForStores } from '../utils/socialMediaScraper.js';
import { findStoresViaCdnPatterns } from '../utils/shopifyCdnScraper.js';
import { findStoresViaGoogleIndex } from '../utils/googleIndexScraper.js';
import { processStore, saveStore } from './storeProcessor.js';
import { getPrisma } from '../config/postgres.js';
import { filterAlreadyScrapedUrls, getDeduplicationStats } from '../utils/deduplication.js';

// Scraping state management
let isScraping = false;
let lastScrapeTime = null;
let totalStoresScraped = 0;
let totalStoresSaved = 0;
let currentJobId = null;
let scrapingStats = {
  totalJobs: 0,
  successfulJobs: 0,
  failedJobs: 0,
  averageStoresPerJob: 0,
};

// Configuration - OPTIMIZED FOR MAXIMUM THROUGHPUT
const SCRAPING_CONFIG = {
  // Interval between automatic scrapes (in minutes) - Reduced for faster scraping
  AUTO_SCRAPE_INTERVAL: 5, // Run every 5 minutes for continuous discovery
  
  // Batch size for processing stores - INCREASED for faster processing
  BATCH_SIZE: 200, // Process 200 stores at a time
  
  // Maximum concurrent processing - INCREASED for parallel processing
  MAX_CONCURRENT: 50, // Process 50 stores concurrently
  
  // Retry configuration
  MAX_RETRIES: 2, // Reduced retries for faster processing
  RETRY_DELAY: 2000, // 2 seconds (reduced from 5)
  
  // Rate limiting delays (in milliseconds) - MINIMIZED for maximum speed
  DELAY_BETWEEN_SOURCES: 500, // Reduced from 2000ms to 500ms
  DELAY_BETWEEN_STORES: 100, // Reduced from 500ms to 100ms
  
  // Countries to scrape - GLOBAL (all countries, no limits)
  // Empty array means scrape globally without country restrictions
  COUNTRIES: [], // Global scraping - no country limits
  
  // Enable/disable specific sources - ALL ENABLED FOR MAXIMUM COVERAGE
  ENABLED_SOURCES: {
    // Original sources - ALL ENABLED
    reddit: true,
    marketplace: true,
    searchEngines: true, // Includes Google Custom Search if configured
    socialMedia: true,
    commonCrawl: true,
    freeAPIs: true,
    massive: true, // Internet-wide massive scraping
    
    // NEW: Advanced detection methods (Tier 1 - Ultra Early) - ALL ENABLED
    shopifyFingerprints: true, // New domain fingerprint detection
    shopifyCdn: true, // CDN pattern scanning
    
    // NEW: Social media scraping (Tier 2 - Early) - ALL ENABLED
    socialMediaAdvanced: true, // TikTok, Instagram, Pinterest, Google Ads
    
    // NEW: Google index gaps (Tier 3 - Delayed) - ENABLED
    googleIndexGaps: true, // Google time-filtered searches
  },
};

/**
 * Enhanced scraping job with better error handling and queue management
 */
export const runContinuousScrapingJob = async (jobId = null) => {
  // Prevent concurrent scraping jobs
  if (isScraping) {
    console.log('⏸️  Scraping job already in progress, skipping...');
    return { success: false, message: 'Job already in progress' };
  }

  // Check if database is connected
  const prisma = getPrisma();
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (dbError) {
    console.error('❌ Cannot run scraping job: Database not connected');
    return { success: false, message: 'Database not connected' };
  }

  isScraping = true;
  currentJobId = jobId || `job-${Date.now()}`;
  const startTime = Date.now();
  
  console.log('\n' + '='.repeat(80));
  console.log('🚀 Starting CONTINUOUS scraping job...');
  console.log(`📋 Job ID: ${currentJobId}`);
  console.log(`⏰ Time: ${new Date().toISOString()}`);
  console.log(`🌍 Scraping Mode: Global (Unlimited)`);
  console.log('='.repeat(80));

  try {
    scrapingStats.totalJobs++;
    const allStores = [];
    const sourceResults = {};
    
    // Phase 1: Scrape from all enabled sources in parallel batches
    console.log('\n📡 Phase 1: Scraping from multiple sources...');
    const sources = [];
    
    if (SCRAPING_CONFIG.ENABLED_SOURCES.reddit) {
      sources.push({
        name: 'Reddit',
        fn: scrapeReddit,
        priority: 1,
      });
    }
    
    if (SCRAPING_CONFIG.ENABLED_SOURCES.marketplace) {
      sources.push({
        name: 'Shopify Marketplace',
        fn: scrapeShopifyMarketplace,
        priority: 1,
      });
    }
    
    if (SCRAPING_CONFIG.ENABLED_SOURCES.searchEngines) {
      sources.push({
        name: 'Search Engines',
        fn: () => scrapeSearchEngines([]), // Global scraping - no country limits
        priority: 2,
      });
      
      // Add Google Custom Search if configured
      if (process.env.GOOGLE_CSE_API_KEY && process.env.GOOGLE_CSE_ID) {
        sources.push({
          name: 'Google Custom Search Engine',
          fn: scrapeGoogleCustomSearch,
          priority: 2,
        });
      }
    }
    
    if (SCRAPING_CONFIG.ENABLED_SOURCES.socialMedia) {
      sources.push({
        name: 'Social Media & Platforms',
        fn: scrapeSocialMedia,
        priority: 2,
      });
    }
    
    if (SCRAPING_CONFIG.ENABLED_SOURCES.commonCrawl) {
      sources.push({
        name: 'Common Crawl',
        fn: scrapeCommonCrawl,
        priority: 3,
      });
      
      // Also scrape by country for better coverage
      sources.push({
        name: 'Common Crawl (By Country)',
        fn: () => scrapeCommonCrawlByCountry(SCRAPING_CONFIG.COUNTRIES),
        priority: 3,
      });
    }
    
    if (SCRAPING_CONFIG.ENABLED_SOURCES.freeAPIs) {
      sources.push({
        name: 'Free APIs',
        fn: scrapeFreeAPIs,
        priority: 3,
      });
    }
    
    // Add massive scraping sources for internet-wide coverage
    if (SCRAPING_CONFIG.ENABLED_SOURCES.massive) {
      sources.push({
        name: 'Certificate Transparency',
        fn: scrapeCertificateTransparency,
        priority: 4,
      });
      
      sources.push({
        name: 'Massive Internet Scrape',
        fn: runMassiveScrape,
        priority: 4,
      });
    }
    
    // NEW: Tier 1 - Ultra Early Detection (0-6 hours after launch)
    if (SCRAPING_CONFIG.ENABLED_SOURCES.shopifyFingerprints) {
      sources.push({
        name: 'Shopify Fingerprint Detection',
        fn: findNewStoresViaFingerprints,
        priority: 1, // High priority - finds stores earliest
      });
    }
    
    if (SCRAPING_CONFIG.ENABLED_SOURCES.shopifyCdn) {
      sources.push({
        name: 'Shopify CDN Pattern Scanner',
        fn: findStoresViaCdnPatterns,
        priority: 1, // High priority - finds stores earliest
      });
    }
    
    // NEW: Tier 2 - Early Detection (1-24 hours after launch)
    if (SCRAPING_CONFIG.ENABLED_SOURCES.socialMediaAdvanced) {
      sources.push({
        name: 'Social Media Advanced (TikTok/Instagram/Pinterest/Google Ads)',
        fn: scrapeSocialMediaForStores,
        priority: 2, // Medium-high priority
      });
    }
    
    // NEW: Tier 3 - Delayed Detection (24-48 hours after launch)
    if (SCRAPING_CONFIG.ENABLED_SOURCES.googleIndexGaps) {
      sources.push({
        name: 'Google Index Gaps',
        fn: findStoresViaGoogleIndex,
        priority: 3, // Medium priority
      });
    }
    
    // Execute sources in batches with delays
    for (let i = 0; i < sources.length; i++) {
      const source = sources[i];
      try {
        console.log(`\n🔍 [${i + 1}/${sources.length}] Scraping: ${source.name}...`);
        const stores = await source.fn();
        sourceResults[source.name] = stores.length;
        allStores.push(...stores);
        console.log(`   ✅ Found ${stores.length} stores from ${source.name}`);
        
        // Rate limiting between sources
        if (i < sources.length - 1) {
          await new Promise(resolve => setTimeout(resolve, SCRAPING_CONFIG.DELAY_BETWEEN_SOURCES));
        }
      } catch (error) {
        console.error(`   ❌ Error scraping ${source.name}:`, error.message);
        sourceResults[source.name] = 0;
      }
    }
    
    // Phase 2: Deduplicate stores (both in-memory and database)
    console.log('\n📦 Phase 2: Deduplicating stores...');
    
    // First, get all URLs from the collected stores
    const allUrls = allStores.map(store => store.url || (typeof store === 'string' ? store : null)).filter(Boolean);
    
    console.log(`   📊 Total URLs collected: ${allUrls.length}`);
    
    // Check against database to filter out already scraped URLs
    console.log('   🔍 Checking against database for already scraped URLs...');
    const newUrls = await filterAlreadyScrapedUrls(allUrls);
    const alreadyScrapedCount = allUrls.length - newUrls.length;
    
    console.log(`   ✅ New URLs (not scraped before): ${newUrls.length}`);
    console.log(`   ⏭️  Already scraped (skipped): ${alreadyScrapedCount}`);
    
    // Create a Set of new URLs for fast lookup
    const newUrlsSet = new Set(newUrls);
    
    // Filter stores to only include new URLs
    const uniqueStores = [];
    const seenUrls = new Set();
    
    for (const store of allStores) {
      try {
        const storeUrl = store.url || (typeof store === 'string' ? store : null);
        
        if (!storeUrl) {
          continue; // Skip stores without URLs
        }
        
        // Skip if already seen in this batch
        if (seenUrls.has(storeUrl.toLowerCase())) {
          continue;
        }
        
        // Skip if already scraped (in database)
        if (!newUrlsSet.has(storeUrl)) {
          continue; // Already in database, skip
        }
        
        seenUrls.add(storeUrl.toLowerCase());
        const normalizedUrl = store.url.toLowerCase().trim().replace(/\/$/, '').replace(/^https?:\/\//, '');
        if (!seenUrls.has(normalizedUrl)) {
          seenUrls.add(normalizedUrl);
          uniqueStores.push(store);
        }
      } catch (error) {
        // Skip invalid URLs
        continue;
      }
    }
    
    console.log(`   📊 Total URLs found: ${allStores.length}`);
    console.log(`   ✨ Unique URLs: ${uniqueStores.length}`);
    console.log(`   🗑️  Duplicates removed: ${allStores.length - uniqueStores.length}`);
    
    // Log breakdown by source
    console.log('\n📊 Source Breakdown:');
    for (const [source, count] of Object.entries(sourceResults)) {
      console.log(`   ${source}: ${count} stores`);
    }
    
    if (uniqueStores.length === 0) {
      console.log(`\n⚠️  WARNING: No store URLs found from any source!`);
      console.log(`   This could indicate:`);
      console.log(`   - Network/API issues`);
      console.log(`   - Rate limiting from sources`);
      console.log(`   - All URLs filtered by pre-validation`);
    }
    
    // Phase 3: Process and save stores in batches
    console.log(`\n⚙️  Phase 3: Processing ${uniqueStores.length} stores...`);
    let saved = 0;
    let newStores = 0;  // Track new stores separately
    let updatedStores = 0;  // Track updated stores separately
    let skipped = 0;
    let errors = 0;
    let duplicates = 0;
    
    // Process in batches to avoid overwhelming the system
    for (let i = 0; i < uniqueStores.length; i += SCRAPING_CONFIG.BATCH_SIZE) {
      const batch = uniqueStores.slice(i, i + SCRAPING_CONFIG.BATCH_SIZE);
      const batchNumber = Math.floor(i / SCRAPING_CONFIG.BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(uniqueStores.length / SCRAPING_CONFIG.BATCH_SIZE);
      
      console.log(`\n   📦 Processing batch ${batchNumber}/${totalBatches} (${batch.length} stores)...`);
      
      // Process batch with limited concurrency
      const batchPromises = batch.map(async (storeData, index) => {
        const storeIndex = i + index + 1;
        
        try {
          // Note: Duplicate check already done in Phase 2, but keeping as safety check
          // This should rarely trigger since we filtered in Phase 2
          
          // Process store with retry logic
          let processedStore = null;
          let retries = 0;
          
          while (retries < SCRAPING_CONFIG.MAX_RETRIES && !processedStore) {
            try {
              processedStore = await processStore(storeData);
              break;
            } catch (error) {
              retries++;
              if (retries < SCRAPING_CONFIG.MAX_RETRIES) {
                console.log(`   ⚠️  Retry ${retries}/${SCRAPING_CONFIG.MAX_RETRIES} for ${storeData.url}`);
                await new Promise(resolve => setTimeout(resolve, SCRAPING_CONFIG.RETRY_DELAY * retries));
              } else {
                throw error;
              }
            }
          }
          
          if (processedStore && processedStore.isShopify === true) {
            const saveResult = await saveStore(processedStore);
            const savedStore = saveResult.store;
            const isNew = saveResult.isNew;
            
            saved++;
            totalStoresSaved++;
            
            // Track new vs updated stores separately
            if (isNew) {
              newStores++;
            } else {
              updatedStores++;
            }
            
            if (storeIndex % 10 === 0 || saved === 1) {
              const action = isNew ? 'NEW' : 'UPDATED';
              console.log(`   ✅ [${storeIndex}/${uniqueStores.length}] ${action}: ${savedStore.name || savedStore.url} (${savedStore.country || 'Unknown'}) - ${savedStore.productCount || 0} products`);
            }
            
            return { status: 'saved', store: savedStore, isNew };
          } else {
            skipped++;
            return { status: 'skipped', store: storeData.url };
          }
        } catch (error) {
          errors++;
          console.error(`   ❌ [${storeIndex}/${uniqueStores.length}] ERROR processing ${storeData.url}:`, error.message);
          return { status: 'error', store: storeData.url, error: error.message };
        }
      });
      
      // Wait for batch to complete with limited concurrency
      const results = await Promise.allSettled(batchPromises);
      
      // Rate limiting between batches
      if (i + SCRAPING_CONFIG.BATCH_SIZE < uniqueStores.length) {
        await new Promise(resolve => setTimeout(resolve, SCRAPING_CONFIG.DELAY_BETWEEN_STORES * 10));
      }
    }
    
    // Update statistics
    totalStoresScraped += uniqueStores.length;
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    lastScrapeTime = new Date();
    
    // Calculate average stores per job
    scrapingStats.averageStoresPerJob = Math.round(totalStoresScraped / scrapingStats.totalJobs);
    
    // Final summary
    console.log('\n' + '='.repeat(80));
    console.log('✨ CONTINUOUS Scraping Job Completed!');
    console.log('='.repeat(80));
    console.log(`📋 Job ID: ${currentJobId}`);
    console.log(`⏱️  Duration: ${duration}s`);
    console.log(`📊 Results:`);
    console.log(`   ✅ Saved: ${saved} stores total`);
    console.log(`      🆕 New stores: ${newStores} (will appear in UI)`);
    console.log(`      🔄 Updated stores: ${updatedStores} (won't appear as new)`);
    console.log(`   ⏭️  Skipped: ${skipped} stores`);
    console.log(`   🔄 Duplicates: ${duplicates} stores`);
    console.log(`   ❌ Errors: ${errors} stores`);
    console.log(`\n📈 Overall Statistics:`);
    console.log(`   Total stores scraped: ${totalStoresScraped}`);
    console.log(`   Total stores saved: ${totalStoresSaved}`);
    console.log(`   Average per job: ${scrapingStats.averageStoresPerJob} stores`);
    console.log(`   Jobs completed: ${scrapingStats.successfulJobs}/${scrapingStats.totalJobs}`);
    
    if (saved === 0 && uniqueStores.length > 0) {
      console.log(`\n⚠️  WARNING: Found ${uniqueStores.length} URLs but none were saved!`);
      console.log(`   Common reasons:`);
      console.log(`   - Not confirmed Shopify stores`);
      console.log(`   - Password protected`);
      console.log(`   - Inactive stores`);
      console.log(`   - Missing name and product count`);
    }
    
    console.log(`\n🔄 Next automatic scrape will run in ${SCRAPING_CONFIG.AUTO_SCRAPE_INTERVAL} minutes\n`);
    
    scrapingStats.successfulJobs++;
    
    return {
      success: true,
      jobId: currentJobId,
      duration: parseFloat(duration),
      stats: {
        found: uniqueStores.length,
        saved,
        skipped,
        duplicates,
        errors,
      },
      sourceResults,
    };
    
  } catch (error) {
    console.error('\n❌ Fatal error in continuous scraping job:', error);
    scrapingStats.failedJobs++;
    
    return {
      success: false,
      jobId: currentJobId,
      error: error.message,
    };
  } finally {
    isScraping = false;
    currentJobId = null;
  }
};

/**
 * Get scraping status and statistics
 */
export const getContinuousScrapingStatus = () => {
  return {
    isScraping,
    lastScrapeTime,
    currentJobId,
    totalStoresScraped,
    totalStoresSaved,
    stats: scrapingStats,
    config: {
      autoScrapeInterval: SCRAPING_CONFIG.AUTO_SCRAPE_INTERVAL,
      batchSize: SCRAPING_CONFIG.BATCH_SIZE,
      countries: 'Global (Unlimited)',
      enabledSources: Object.keys(SCRAPING_CONFIG.ENABLED_SOURCES).filter(
        key => SCRAPING_CONFIG.ENABLED_SOURCES[key]
      ),
    },
  };
};

/**
 * Update scraping configuration
 */
export const updateScrapingConfig = (newConfig) => {
  Object.assign(SCRAPING_CONFIG, newConfig);
  console.log('📝 Scraping configuration updated:', newConfig);
};

/**
 * Get scraping configuration
 */
export const getScrapingConfig = () => {
  return { ...SCRAPING_CONFIG };
};

