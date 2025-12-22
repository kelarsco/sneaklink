/**
 * Script to delete stores that are unavailable (have the "SHOPIFY Sorry, this store is currently unavailable" message)
 * 
 * Usage:
 *   node scripts/deleteUnavailableStores.js
 *   node scripts/deleteUnavailableStores.js --dry-run  (preview what would be deleted)
 *   node scripts/deleteUnavailableStores.js --limit=100  (process only first 100 stores)
 *   node scripts/deleteUnavailableStores.js --skip=500  (skip first 500 stores)
 *   node scripts/deleteUnavailableStores.js --resume  (continue from last checkpoint)
 *   node scripts/deleteUnavailableStores.js --reset  (clear checkpoint and start fresh)
 * 
 * This script:
 * 1. Fetches all stores from the database
 * 2. Checks each store URL using isStoreActive()
 * 3. Deletes stores that are detected as unavailable
 * 4. Processes in batches with delays to avoid rate limiting
 * 5. Saves progress periodically so you can resume if interrupted
 */

import { getPrisma } from '../config/postgres.js';
import { isStoreActive } from '../utils/shopifyDetector.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') });

// State file path for resume capability
const STATE_FILE = join(__dirname, '.deleteUnavailableStores_state.json');

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const limitArg = args.find(arg => arg.startsWith('--limit='));
const skipArg = args.find(arg => arg.startsWith('--skip='));
const resumeArg = args.includes('--resume');
const resetArg = args.includes('--reset');
const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : null;
const skip = skipArg ? parseInt(skipArg.split('=')[1], 10) : 0;

/**
 * Load state from file
 */
function loadState() {
  if (resetArg || !existsSync(STATE_FILE)) {
    return null;
  }
  try {
    const stateData = readFileSync(STATE_FILE, 'utf-8');
    return JSON.parse(stateData);
  } catch (error) {
    console.warn('⚠️  Could not load state file:', error.message);
    return null;
  }
}

/**
 * Save state to file
 */
function saveState(state) {
  try {
    writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (error) {
    console.warn('⚠️  Could not save state file:', error.message);
  }
}

/**
 * Clear state file
 */
function clearState() {
  if (existsSync(STATE_FILE)) {
    try {
      unlinkSync(STATE_FILE);
    } catch (error) {
      console.warn('⚠️  Could not delete state file:', error.message);
    }
  }
}

async function deleteUnavailableStores() {
  const prisma = getPrisma();
  
  try {
    console.log('🔍 Connecting to database...');
    
    // Load previous state if resuming
    let savedState = null;
    let startIndex = skip;
    if (resumeArg || (!resetArg && !skipArg)) {
      savedState = loadState();
      if (savedState) {
        console.log(`\n📂 Resuming from previous run at index ${savedState.lastProcessedIndex}`);
        console.log(`   Previously checked: ${savedState.stats.checked} stores`);
        console.log(`   Previously deleted: ${savedState.stats.deleted} stores\n`);
        startIndex = savedState.lastProcessedIndex + 1;
      }
    }
    
    if (resetArg) {
      clearState();
      console.log('🔄 State file cleared\n');
    }
    
    // Count total stores
    const totalStores = await prisma.store.count();
    console.log(`\n📊 Total stores in database: ${totalStores}`);
    
    if (totalStores === 0) {
      console.log('✅ No stores to check. Database is empty.');
      await prisma.$disconnect();
      return;
    }

    if (isDryRun) {
      console.log('🔍 DRY RUN MODE: No stores will be deleted, only previewed\n');
    }

    // Fetch all stores (or limited number)
    const stores = await prisma.store.findMany({
      select: {
        id: true,
        name: true,
        url: true,
        isActive: true,
        dateAdded: true,
      },
      orderBy: {
        dateAdded: 'desc',
      },
      take: limit || undefined,
    });

    // If resuming, skip already processed stores
    const storesToProcess = startIndex > 0 ? stores.slice(startIndex) : stores;
    const actualStartIndex = startIndex;
    
    console.log(`\n📋 Processing ${storesToProcess.length} stores (starting from index ${actualStartIndex})...\n`);

    // Initialize stats from saved state or fresh
    const stats = savedState ? { ...savedState.stats } : {
      checked: 0,
      unavailable: 0,
      deleted: 0,
      errors: 0,
      skipped: 0,
    };

    const unavailableStores = savedState ? [...(savedState.unavailableStores || [])] : [];

    // Process stores in batches with delays
    const batchSize = 10;
    const delayBetweenBatches = 2000; // 2 seconds
    const delayBetweenRequests = 500; // 500ms between individual requests

    for (let i = 0; i < storesToProcess.length; i++) {
      const store = storesToProcess[i];
      const currentIndex = actualStartIndex + i;
      stats.checked++;

      try {
        // Check if store is active (this will detect unavailable stores)
        const isActive = await isStoreActive(store.url);

        if (!isActive) {
          stats.unavailable++;
          unavailableStores.push(store);
          console.log(`❌ [${currentIndex + 1}/${stores.length}] Unavailable store found: ${store.name} (${store.url})`);
          
          if (!isDryRun) {
            // Delete the store
            await prisma.store.delete({
              where: { id: store.id },
            });
            stats.deleted++;
            console.log(`   ✅ Deleted store: ${store.name}`);
          } else {
            console.log(`   🔍 Would delete: ${store.name} (DRY RUN)`);
          }
        } else {
          // Store is active, skip it
          if (stats.checked % 50 === 0) {
            console.log(`✓ [${currentIndex + 1}/${stores.length}] Checking stores... (${stats.unavailable} unavailable found so far)`);
          }
        }

        // Save state periodically (every 10 stores) to allow resume
        if ((i + 1) % 10 === 0) {
          saveState({
            lastProcessedIndex: currentIndex,
            stats,
            unavailableStores: unavailableStores.slice(-50), // Keep last 50 for summary
            timestamp: new Date().toISOString(),
          });
        }

        // Add delay between requests to avoid rate limiting
        if (i < storesToProcess.length - 1) {
          await new Promise(resolve => setTimeout(resolve, delayBetweenRequests));
        }

        // Add longer delay between batches
        if ((i + 1) % batchSize === 0 && i < storesToProcess.length - 1) {
          console.log(`\n⏸️  Pausing ${delayBetweenBatches}ms between batches...\n`);
          await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
        }

      } catch (error) {
        stats.errors++;
        console.error(`   ❌ [${currentIndex + 1}/${stores.length}] ERROR checking ${store.url}:`, error.message);
        // Save state even on error so we can resume
        saveState({
          lastProcessedIndex: currentIndex,
          stats,
          unavailableStores: unavailableStores.slice(-50),
          timestamp: new Date().toISOString(),
        });
      }
    }
    
    // Clear state file on successful completion
    if (!isDryRun) {
      clearState();
    }

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total stores checked: ${stats.checked}`);
    console.log(`Unavailable stores found: ${stats.unavailable}`);
    
    if (isDryRun) {
      console.log(`\n🔍 DRY RUN: ${stats.unavailable} stores would be deleted`);
      console.log('\nTo actually delete these stores, run without --dry-run flag:');
      console.log('  node scripts/deleteUnavailableStores.js');
    } else {
      console.log(`Stores deleted: ${stats.deleted}`);
    }
    
    console.log(`Errors encountered: ${stats.errors}`);
    
    if (unavailableStores.length > 0 && !isDryRun) {
      console.log('\n✅ Successfully deleted all unavailable stores!');
    } else if (unavailableStores.length > 0 && isDryRun) {
      console.log('\n📋 Unavailable stores that would be deleted:');
      unavailableStores.forEach(store => {
        console.log(`   - ${store.name} (${store.url})`);
      });
    } else {
      console.log('\n✅ No unavailable stores found!');
    }
    
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ Fatal error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
deleteUnavailableStores()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

