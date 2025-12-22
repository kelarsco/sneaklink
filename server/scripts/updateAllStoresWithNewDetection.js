/**
 * Update Script: Re-run detection on all existing stores
 * 
 * This script updates all stores in the database with the new enhanced detection features:
 * 1. Store unavailable check (deactivate unavailable stores)
 * 2. Currency-based country detection with diverse fallback
 * 3. HTML title-based store name extraction
 * 4. Enhanced POD detection (50+ platforms)
 * 5. Multi-platform ad pixel detection
 * 6. Updated business model classification logic
 * 
 * Usage:
 *   node server/scripts/updateAllStoresWithNewDetection.js
 * 
 * Options:
 *   --limit=N      Process only N stores (for testing)
 *   --skip=N       Skip first N stores (for resuming)
 *   --batch-size=N Process N stores per batch (default: 10)
 *   --dry-run      Show what would be updated without making changes
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { getPrisma } from '../config/postgres.js';
import {
  isShopifyStore,
  isPasswordProtected,
  isStoreActive,
  getStoreName,
  getProductCount,
} from '../utils/shopifyDetector.js';
import { detectTheme } from '../utils/themeDetector.js';
import {
  detectBusinessModel,
  detectFacebookAds,
} from '../utils/businessModelDetector.js';
import { detectCountry } from '../utils/countryDetector.js';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

// Parse command line arguments
const args = process.argv.slice(2);
const limitArg = args.find(arg => arg.startsWith('--limit='));
const skipArg = args.find(arg => arg.startsWith('--skip='));
const batchSizeArg = args.find(arg => arg.startsWith('--batch-size='));
const dryRun = args.includes('--dry-run');

const limit = limitArg ? parseInt(limitArg.split('=')[1]) : null;
const skip = skipArg ? parseInt(skipArg.split('=')[1]) : 0;
const BATCH_SIZE = batchSizeArg ? parseInt(batchSizeArg.split('=')[1]) : 10;
const DELAY_BETWEEN_BATCHES = 3000; // 3 seconds between batches to avoid rate limits

let stats = {
  total: 0,
  processed: 0,
  updated: 0,
  deactivated: 0,
  skipped: 0,
  errors: 0,
  updates: {
    name: 0,
    country: 0,
    businessModel: 0,
    tags: 0,
    theme: 0,
    hasFacebookAds: 0,
    productCount: 0,
  }
};

/**
 * Process a single store with all new detection features
 */
async function processStore(store, dryRun = false) {
  try {
    const url = store.url;
    let updates = {};
    let shouldUpdate = false;
    let shouldDeactivate = false;
    const storeUpdates = {
      name: false,
      country: false,
      businessModel: false,
      tags: false,
      theme: false,
      hasFacebookAds: false,
      productCount: false,
    };

    console.log(`\n🔄 Processing: ${url}`);

    // Check 1: Store unavailable check
    const isActive = await isStoreActive(url);
    if (!isActive) {
      console.log(`   ❌ Store is unavailable - will deactivate`);
      shouldDeactivate = true;
      if (!dryRun) {
        const prisma = getPrisma();
        await prisma.store.update({
          where: { id: store.id },
          data: { isActive: false },
        });
      }
      stats.deactivated++;
      return { deactivated: true };
    }

    // Check 2: Shopify store check (should already be Shopify, but verify)
    const isShopify = await isShopifyStore(url);
    if (!isShopify) {
      console.log(`   ❌ Store is not a Shopify store - will deactivate`);
      shouldDeactivate = true;
      if (!dryRun) {
        const prisma = getPrisma();
        await prisma.store.update({
          where: { id: store.id },
          data: { isActive: false, isShopify: false },
        });
      }
      stats.deactivated++;
      return { deactivated: true };
    }

    // Check 3: Password protected check
    const passwordProtected = await isPasswordProtected(url);
    if (passwordProtected) {
      console.log(`   ❌ Store is password protected - will deactivate`);
      shouldDeactivate = true;
      if (!dryRun) {
        const prisma = getPrisma();
        await prisma.store.update({
          where: { id: store.id },
          data: { isActive: false },
        });
      }
      stats.deactivated++;
      return { deactivated: true };
    }

    // Run all detections in parallel for efficiency
    const results = await Promise.allSettled([
      getStoreName(url).catch(() => null),
      getProductCount(url).catch(() => null),
      detectTheme(url).catch(() => null),
      detectBusinessModel(url).catch(() => null),
      detectFacebookAds(url).catch(() => null),
      detectCountry(url).catch(() => null),
    ]);

    // Extract results
    const name = results[0].status === 'fulfilled' && results[0].value ? results[0].value : null;
    const productCount = results[1].status === 'fulfilled' && results[1].value !== null && results[1].value !== undefined ? results[1].value : null;
    const themeResult = results[2].status === 'fulfilled' && results[2].value ? results[2].value : null;
    const businessModel = results[3].status === 'fulfilled' && results[3].value ? results[3].value : null;
    const hasFacebookAds = results[4].status === 'fulfilled' && results[4].value ? results[4].value : false;
    const country = results[5].status === 'fulfilled' && results[5].value ? results[5].value : null;

    // Use defaults if detection failed
    const finalProductCount = (productCount && productCount > 0) ? productCount : 1;
    // IMPORTANT: Truncate to 200 chars (database limit) to prevent "column too long" errors
    const finalName = ((name || (() => {
      try {
        const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
        // Clean domain: remove www, remove .myshopify.com, keep just the domain (e.g., example.com)
        let domain = urlObj.hostname.replace(/^www\./, '');
        domain = domain.replace(/\.myshopify\.com$/, '');
        return domain || urlObj.hostname.replace(/^www\./, '');
      } catch (e) {
        // Fallback - extract domain from URL string
        try {
          const match = url.match(/https?:\/\/(?:www\.)?([^\/]+)/);
          if (match && match[1]) {
            return match[1].replace(/\.myshopify\.com$/, '');
          }
        } catch (err) {
          // Final fallback
        }
        return url;
      }
    })()) || store.name || 'Unknown Store').trim().substring(0, 200); // Truncate to 200 chars (DB limit)
    // Truncate country to 50 chars (database limit)
    const finalCountry = (country || 'United States').substring(0, 50);
    // Truncate theme to 50 chars (database limit)
    const finalTheme = ((themeResult?.name || store.theme || 'Dawn').split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ')).substring(0, 50);
    // Truncate businessModel to 20 chars (database limit) - "Print on Demand" (18 chars) fits
    const finalBusinessModel = (businessModel || store.businessModel || 'Dropshipping').substring(0, 20);

    // Determine tags based on business model and ads (corrected logic)
    const tags = [];
    
    // Add business model tag - POD takes priority
    if (finalBusinessModel === 'Print on Demand') {
      tags.push('Print on Demand');
    } else if (finalBusinessModel === 'Dropshipping' || finalBusinessModel === 'Unknown' || !finalBusinessModel) {
      // Default to Dropshipping for Unknown/undefined business models (catch-all category)
      tags.push('Dropshipping');
    } else if (finalBusinessModel) {
      // If business model is detected but not POD/Dropshipping, use it
      tags.push(finalBusinessModel);
    } else {
      // Final fallback to Dropshipping
      tags.push('Dropshipping');
    }
    
    // Add ads tag only if ads are actually detected
    if (hasFacebookAds) {
      tags.push('Currently Running Ads');
    }

    // Check what needs updating
    if (store.name !== finalName) {
      updates.name = finalName;
      storeUpdates.name = true;
      shouldUpdate = true;
      console.log(`   📝 Name: "${store.name}" → "${finalName}"`);
    }

    if (store.country !== finalCountry) {
      updates.country = finalCountry;
      storeUpdates.country = true;
      shouldUpdate = true;
      console.log(`   🌍 Country: "${store.country}" → "${finalCountry}"`);
    }

    if (store.businessModel !== finalBusinessModel) {
      updates.businessModel = finalBusinessModel;
      storeUpdates.businessModel = true;
      shouldUpdate = true;
      console.log(`   🏷️  Business Model: "${store.businessModel}" → "${finalBusinessModel}"`);
    }

    // Compare tags arrays
    const tagsChanged = JSON.stringify([...store.tags].sort()) !== JSON.stringify([...tags].sort());
    if (tagsChanged) {
      updates.tags = tags;
      storeUpdates.tags = true;
      shouldUpdate = true;
      console.log(`   🏷️  Tags: [${store.tags.join(', ')}] → [${tags.join(', ')}]`);
    }

    if (store.theme !== finalTheme) {
      updates.theme = finalTheme;
      storeUpdates.theme = true;
      shouldUpdate = true;
      console.log(`   🎨 Theme: "${store.theme}" → "${finalTheme}"`);
    }

    if (store.hasFacebookAds !== hasFacebookAds) {
      updates.hasFacebookAds = hasFacebookAds;
      storeUpdates.hasFacebookAds = true;
      shouldUpdate = true;
      console.log(`   📢 Facebook Ads: ${store.hasFacebookAds} → ${hasFacebookAds}`);
    }

    if (store.productCount !== finalProductCount) {
      updates.productCount = finalProductCount;
      storeUpdates.productCount = true;
      shouldUpdate = true;
      console.log(`   📦 Product Count: ${store.productCount} → ${finalProductCount}`);
    }

    // Always update lastScraped
    updates.lastScraped = new Date();

    // Update store if needed
    if (shouldUpdate) {
      if (!dryRun) {
        const prisma = getPrisma();
        await prisma.store.update({
          where: { id: store.id },
          data: updates,
        });
      }
      
      // Update stats
      Object.keys(storeUpdates).forEach(key => {
        if (storeUpdates[key]) {
          stats.updates[key]++;
        }
      });
      
      stats.updated++;
      console.log(`   ✅ Store updated`);
      return { updated: true, updates: storeUpdates };
    } else {
      stats.skipped++;
      console.log(`   ⏭️  No changes needed`);
      return { skipped: true };
    }

  } catch (error) {
    stats.errors++;
    console.error(`   ❌ Error processing store ${store.url}:`, error.message);
    return { error: true, message: error.message };
  }
}

/**
 * Main update function
 */
async function updateAllStores() {
  try {
    console.log('🔌 Connecting to database...');
    const prisma = getPrisma();
    await prisma.$connect();
    console.log('✅ Connected to database\n');

    if (dryRun) {
      console.log('⚠️  DRY RUN MODE - No changes will be saved\n');
    }

    // Get all active stores
    const whereClause = {
      isActive: true,
    };

    const totalCount = await prisma.store.count({ where: whereClause });
    console.log(`📊 Found ${totalCount} active stores in database`);

    if (totalCount === 0) {
      console.log('✅ No stores to update.');
      await prisma.$disconnect();
      return;
    }

    // Apply skip and limit
    let storesToProcess = await prisma.store.findMany({
      where: whereClause,
      skip: skip,
      take: limit || undefined,
      orderBy: { lastScraped: 'asc' }, // Process oldest scraped first
    });

    const actualCount = storesToProcess.length;
    stats.total = actualCount;

    console.log(`🔄 Processing ${actualCount} stores...`);
    if (skip > 0) {
      console.log(`   (Skipped ${skip} stores)`);
    }
    if (limit) {
      console.log(`   (Limited to ${limit} stores)`);
    }
    console.log(`   Batch size: ${BATCH_SIZE} stores`);
    console.log(`   Delay between batches: ${DELAY_BETWEEN_BATCHES}ms\n`);

    // Process stores in batches
    const totalBatches = Math.ceil(actualCount / BATCH_SIZE);

    for (let i = 0; i < storesToProcess.length; i += BATCH_SIZE) {
      const batch = storesToProcess.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;

      console.log(`\n${'='.repeat(80)}`);
      console.log(`📦 Processing batch ${batchNumber}/${totalBatches} (${batch.length} stores)`);
      console.log(`${'='.repeat(80)}`);

      // Process batch in parallel
      const batchPromises = batch.map(store => processStore(store, dryRun));
      await Promise.all(batchPromises);

      stats.processed += batch.length;

      // Progress summary
      console.log(`\n📊 Progress: ${stats.processed}/${actualCount} stores processed`);
      console.log(`   ✅ Updated: ${stats.updated}`);
      console.log(`   ❌ Deactivated: ${stats.deactivated}`);
      console.log(`   ⏭️  Skipped: ${stats.skipped}`);
      console.log(`   ❌ Errors: ${stats.errors}`);

      // Rate limiting between batches
      if (i + BATCH_SIZE < storesToProcess.length) {
        console.log(`\n⏳ Waiting ${DELAY_BETWEEN_BATCHES}ms before next batch...`);
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
      }
    }

    // Final summary
    console.log('\n' + '='.repeat(80));
    console.log('✨ Update Summary');
    console.log('='.repeat(80));
    console.log(`📊 Total stores: ${stats.total}`);
    console.log(`✅ Updated: ${stats.updated}`);
    console.log(`❌ Deactivated: ${stats.deactivated}`);
    console.log(`⏭️  Skipped: ${stats.skipped}`);
    console.log(`❌ Errors: ${stats.errors}`);
    console.log('\n📝 Update Breakdown:');
    console.log(`   - Names updated: ${stats.updates.name}`);
    console.log(`   - Countries updated: ${stats.updates.country}`);
    console.log(`   - Business models updated: ${stats.updates.businessModel}`);
    console.log(`   - Tags updated: ${stats.updates.tags}`);
    console.log(`   - Themes updated: ${stats.updates.theme}`);
    console.log(`   - Facebook ads updated: ${stats.updates.hasFacebookAds}`);
    console.log(`   - Product counts updated: ${stats.updates.productCount}`);

    if (dryRun) {
      console.log('\n⚠️  This was a DRY RUN - no changes were saved to the database');
    }

    await prisma.$disconnect();
    console.log('\n🔌 Disconnected from database');
    console.log('✅ Update completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during update:', error);
    const prisma = getPrisma();
    await prisma.$disconnect();
    process.exit(1);
  }
}

// Run the update
updateAllStores();

