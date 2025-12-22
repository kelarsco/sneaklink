import {
  scrapeReddit,
  scrapeShopifyMarketplace,
  scrapeSearchEngines,
  scrapeSocialMedia,
  scrapeFreeAPIs,
} from '../utils/scrapers.js';
import { scrapeCommonCrawl, scrapeCommonCrawlByCountry } from '../utils/commonCrawl.js';
import { processStore, saveStore } from './storeProcessor.js';

let isScraping = false;
let lastScrapeTime = null;

/**
 * Run scraping job
 */
export const runScrapingJob = async () => {
  // Prevent concurrent scraping jobs
  if (isScraping) {
    console.log('⏸️  Scraping job already in progress, skipping...');
    return;
  }

  // Check if database is connected
  const { getPrisma } = await import('../config/postgres.js');
  const prisma = getPrisma();
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (dbError) {
    console.error('❌ Cannot run scraping job: Database not connected');
    console.error('   Please check your PostgreSQL connection and restart the server.');
    return;
  }

  isScraping = true;
  const startTime = Date.now();
  console.log('\n' + '='.repeat(60));
  console.log('🚀 Starting automatic scraping job...');
  console.log(`⏰ Time: ${new Date().toISOString()}`);
  console.log('='.repeat(60));

  try {
    const allStores = [];
    
    // Scrape from all sources
    console.log('📡 Scraping from multiple sources...');
    const [redditStores, marketplaceStores, searchStores, socialStores, apiStores, commonCrawlStores] = await Promise.all([
      scrapeReddit().catch(err => {
        console.error('Error scraping Reddit:', err.message);
        return [];
      }),
      scrapeShopifyMarketplace().catch(err => {
        console.error('Error scraping Shopify Marketplace:', err.message);
        return [];
      }),
      scrapeSearchEngines(['United States', 'United Kingdom', 'Germany', 'France', 'Canada', 'Spain', 'Italy', 'Netherlands', 'Australia']).catch(err => {
        console.error('Error scraping search engines:', err.message);
        return [];
      }),
      scrapeSocialMedia().catch(err => {
        console.error('Error scraping social media:', err.message);
        return [];
      }),
      scrapeFreeAPIs().catch(err => {
        console.error('Error scraping free APIs:', err.message);
        return [];
      }),
      scrapeCommonCrawl().catch(err => {
        console.error('Error scraping Common Crawl:', err.message);
        return [];
      }),
    ]);

    allStores.push(...redditStores, ...marketplaceStores, ...searchStores, ...socialStores, ...apiStores, ...commonCrawlStores);
    
    // Remove duplicates based on URL
    const uniqueStores = [];
    const seenUrls = new Set();
    for (const store of allStores) {
      const normalizedUrl = store.url.toLowerCase().trim().replace(/\/$/, '');
      if (!seenUrls.has(normalizedUrl)) {
        seenUrls.add(normalizedUrl);
        uniqueStores.push(store);
      }
    }
    
    console.log(`📦 Found ${uniqueStores.length} unique potential Shopify store URLs (${allStores.length - uniqueStores.length} duplicates removed)`);
    
    // Log breakdown by source
    console.log(`📊 Source breakdown:`);
    console.log(`   Reddit: ${redditStores.length}`);
    console.log(`   Shopify Marketplace: ${marketplaceStores.length}`);
    console.log(`   Search Engines: ${searchStores.length}`);
    console.log(`   Additional Platforms (Product Hunt, Indie Hackers, Medium): ${socialStores.length}`);
    console.log(`   Free APIs (Common Crawl): ${apiStores.length}`);
    console.log(`   Common Crawl: ${commonCrawlStores.length}`);
    
    if (uniqueStores.length === 0) {
      console.log(`⚠️  WARNING: No store URLs found from any source!`);
      console.log(`   This could mean:`);
      console.log(`   - Scrapers are not finding URLs`);
      console.log(`   - All URLs are being filtered out by pre-validation`);
      console.log(`   - Network/API issues preventing scraping`);
    }

    // Process and save stores
    let saved = 0;
    let skipped = 0;
    let errors = 0;
    
    // Track rejection reasons
    const rejectionStats = {
      not_shopify: 0,
      password_protected: 0,
      inactive: 0,
      zero_products: 0,
      error: 0,
    };

    for (let i = 0; i < uniqueStores.length; i++) {
      const storeData = uniqueStores[i];
      try {
        const processedStore = await processStore(storeData);
        
        // Check if store was rejected
        if (processedStore && processedStore.rejected) {
          skipped++;
          const reason = processedStore.reason || 'unknown';
          if (rejectionStats.hasOwnProperty(reason)) {
            rejectionStats[reason]++;
          } else {
            rejectionStats.error++;
          }
          continue;
        }
        
        if (processedStore && processedStore.isShopify === true) {
          const saveResult = await saveStore(processedStore);
          saved++;
          const action = saveResult.isNew ? 'NEW' : 'UPDATED';
          if ((i + 1) % 10 === 0 || saved === 1) {
            console.log(`✅ [${i + 1}/${uniqueStores.length}] ${action}: ${saveResult.store.name} (${saveResult.store.country}) - ${saveResult.store.productCount} products`);
          }
        } else {
          skipped++;
          rejectionStats.error++;
        }
      } catch (error) {
        errors++;
        rejectionStats.error++;
        console.error(`❌ ERROR processing ${storeData.url}:`, error.message);
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    lastScrapeTime = new Date();
    
    console.log(`\n✨ Scraping job completed in ${duration}s`);
    console.log(`📊 Results: ${saved} saved, ${skipped} skipped, ${errors} errors`);
    
    // Display rejection statistics
    const totalRejected = Object.values(rejectionStats).reduce((sum, count) => sum + count, 0);
    if (totalRejected > 0) {
      console.log(`\n📊 Rejection Statistics:`);
      console.log(`   ❌ Not Shopify stores: ${rejectionStats.not_shopify}`);
      console.log(`   🔒 Password protected: ${rejectionStats.password_protected}`);
      console.log(`   ⚠️  Inactive stores: ${rejectionStats.inactive}`);
      console.log(`   📦 Zero products: ${rejectionStats.zero_products}`);
      console.log(`   ⚠️  Processing errors: ${rejectionStats.error}`);
    }
    
    if (saved === 0 && uniqueStores.length > 0) {
      console.log(`\n⚠️  WARNING: Found ${uniqueStores.length} URLs but none were saved!`);
      console.log(`   Breakdown:`);
      console.log(`   - Not confirmed Shopify stores: ${rejectionStats.not_shopify} (${Math.round(rejectionStats.not_shopify / uniqueStores.length * 100)}%)`);
      console.log(`   - Password protected: ${rejectionStats.password_protected} (${Math.round(rejectionStats.password_protected / uniqueStores.length * 100)}%)`);
      console.log(`   - Inactive stores: ${rejectionStats.inactive} (${Math.round(rejectionStats.inactive / uniqueStores.length * 100)}%)`);
      console.log(`   - Zero products: ${rejectionStats.zero_products} (${Math.round(rejectionStats.zero_products / uniqueStores.length * 100)}%)`);
      console.log(`   - Processing errors: ${rejectionStats.error} (${Math.round(rejectionStats.error / uniqueStores.length * 100)}%)`);
      console.log(`\n   💡 TIP: Most stores are likely being rejected because:`);
      console.log(`   - They're not actual Shopify stores (most common)`);
      console.log(`   - They have password protection enabled`);
      console.log(`   - They're inactive/closed stores`);
      console.log(`   - They have zero products listed`);
    }
    
    console.log(`🕐 Next scrape will run automatically\n`);

  } catch (error) {
    console.error('❌ Fatal error in scraping job:', error);
  } finally {
    isScraping = false;
  }
};

/**
 * Get scraping status
 */
export const getScrapingStatus = () => {
  return {
    isScraping,
    lastScrapeTime,
  };
};
