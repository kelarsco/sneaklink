/**
 * Migration Script: Update themes and countries for existing stores
 * 
 * This script updates all stores in the database with:
 * 1. Improved theme detection (replaces "Unknown" themes with detected or random free themes)
 * 2. Improved country detection (updates countries with better accuracy)
 * 
 * Usage:
 *   node server/scripts/updateThemesAndCountries.js
 * 
 * Options:
 *   --theme-only    Only update themes
 *   --country-only  Only update countries
 *   --limit=N      Process only N stores (for testing)
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Store from '../models/Store.js';
import { detectTheme } from '../utils/themeDetector.js';
import { detectCountry } from '../utils/countryDetector.js';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ Error: MONGODB_URI is not set in .env file');
  process.exit(1);
}

// Parse command line arguments
const args = process.argv.slice(2);
const themeOnly = args.includes('--theme-only');
const countryOnly = args.includes('--country-only');
const limitArg = args.find(arg => arg.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : null;

// Free themes list (must match themeDetector.js)
const FREE_THEMES = [
  'dawn', 'refresh', 'sense', 'craft', 'studio', 'taste', 'origin',
  'debut', 'brooklyn', 'minimal', 'supply', 'venture', 'simple'
];

/**
 * Get a random free theme name
 */
const getRandomFreeTheme = () => {
  const randomTheme = FREE_THEMES[Math.floor(Math.random() * FREE_THEMES.length)];
  return randomTheme.split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
};

async function updateThemesAndCountries() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Build query based on what we're updating
    let query = {};
    if (themeOnly) {
      // Find stores with "Unknown" theme or invalid themes
      query = { 
        $or: [
          { theme: 'Unknown' },
          { theme: { $exists: false } },
          { theme: null }
        ]
      };
    } else if (countryOnly) {
      // Find stores with "Unknown" country or potentially inaccurate countries
      query = { 
        $or: [
          { country: 'Unknown' },
          { country: { $exists: false } },
          { country: null }
        ]
      };
    } else {
      // Update all stores (or those with Unknown values)
      query = {
        $or: [
          { theme: 'Unknown' },
          { country: 'Unknown' },
          { theme: { $exists: false } },
          { country: { $exists: false } }
        ]
      };
    }

    // Get total count
    const totalStores = await Store.countDocuments(query);
    console.log(`📊 Found ${totalStores} stores to update`);

    if (totalStores === 0) {
      console.log('✅ No stores need updating. All stores already have valid themes and countries.');
      await mongoose.disconnect();
      return;
    }

    // Apply limit if specified
    const storesToProcess = limit ? await Store.find(query).limit(limit) : await Store.find(query);
    const actualCount = storesToProcess.length;
    console.log(`🔄 Processing ${actualCount} stores...\n`);

    let themeUpdated = 0;
    let countryUpdated = 0;
    let themeErrors = 0;
    let countryErrors = 0;
    let skipped = 0;

    // Process stores in batches to avoid overwhelming the system
    const BATCH_SIZE = 10;
    const DELAY_BETWEEN_BATCHES = 2000; // 2 seconds

    for (let i = 0; i < storesToProcess.length; i += BATCH_SIZE) {
      const batch = storesToProcess.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(actualCount / BATCH_SIZE);

      console.log(`📦 Processing batch ${batchNumber}/${totalBatches} (${batch.length} stores)...`);

      const batchPromises = batch.map(async (store) => {
        try {
          const updates = {};
          let needsUpdate = false;

          // Update theme if needed
          if (!countryOnly) {
            if (!store.theme || store.theme === 'Unknown') {
              try {
                console.log(`   🎨 Detecting theme for: ${store.url}`);
                const themeResult = await detectTheme(store.url);
                
                if (themeResult && themeResult.name && themeResult.name !== 'Unknown') {
                  updates.theme = themeResult.name;
                  updates.themeType = themeResult.type || 'free';
                  needsUpdate = true;
                  themeUpdated++;
                  console.log(`      ✅ Theme: ${themeResult.name} (${themeResult.type})`);
                } else {
                  // Fallback to random free theme
                  const randomTheme = getRandomFreeTheme();
                  updates.theme = randomTheme;
                  updates.themeType = 'free';
                  needsUpdate = true;
                  themeUpdated++;
                  console.log(`      ⚠️  Theme not detected, assigned random: ${randomTheme}`);
                }
              } catch (error) {
                themeErrors++;
                console.error(`      ❌ Error detecting theme for ${store.url}:`, error.message);
                // Assign random free theme on error
                const randomTheme = getRandomFreeTheme();
                updates.theme = randomTheme;
                updates.themeType = 'free';
                needsUpdate = true;
                themeUpdated++;
              }
            }
          }

          // Update country if needed
          if (!themeOnly) {
            if (!store.country || store.country === 'Unknown') {
              try {
                console.log(`   🌍 Detecting country for: ${store.url}`);
                const country = await detectCountry(store.url);
                
                if (country && country !== 'Unknown') {
                  updates.country = country;
                  needsUpdate = true;
                  countryUpdated++;
                  console.log(`      ✅ Country: ${country}`);
                } else {
                  // Fallback to United States
                  updates.country = 'United States';
                  needsUpdate = true;
                  countryUpdated++;
                  console.log(`      ⚠️  Country not detected, defaulting to: United States`);
                }
              } catch (error) {
                countryErrors++;
                console.error(`      ❌ Error detecting country for ${store.url}:`, error.message);
                // Default to United States on error
                updates.country = 'United States';
                needsUpdate = true;
                countryUpdated++;
              }
            }
          }

          // Update store if needed
          if (needsUpdate) {
            await Store.updateOne(
              { _id: store._id },
              { $set: updates }
            );
          } else {
            skipped++;
          }
        } catch (error) {
          console.error(`   ❌ Error processing store ${store.url}:`, error.message);
        }
      });

      await Promise.all(batchPromises);

      // Rate limiting between batches
      if (i + BATCH_SIZE < storesToProcess.length) {
        console.log(`   ⏳ Waiting ${DELAY_BETWEEN_BATCHES}ms before next batch...\n`);
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('✨ Migration Summary');
    console.log('='.repeat(80));
    if (!countryOnly) {
      console.log(`🎨 Themes:`);
      console.log(`   - Updated: ${themeUpdated} stores`);
      console.log(`   - Errors: ${themeErrors} stores`);
    }
    if (!themeOnly) {
      console.log(`🌍 Countries:`);
      console.log(`   - Updated: ${countryUpdated} stores`);
      console.log(`   - Errors: ${countryErrors} stores`);
    }
    console.log(`   - Skipped: ${skipped} stores (already had valid values)`);
    console.log(`   - Total processed: ${actualCount} stores`);

    // Verify the migration
    console.log('\n🔍 Verifying migration...');
    const remainingUnknownThemes = await Store.countDocuments({ theme: 'Unknown' });
    const remainingUnknownCountries = await Store.countDocuments({ country: 'Unknown' });

    if (remainingUnknownThemes > 0) {
      console.log(`⚠️  Warning: ${remainingUnknownThemes} stores still have "Unknown" theme`);
    } else {
      console.log(`✅ All stores now have valid themes`);
    }

    if (remainingUnknownCountries > 0) {
      console.log(`⚠️  Warning: ${remainingUnknownCountries} stores still have "Unknown" country`);
    } else {
      console.log(`✅ All stores now have valid countries`);
    }

    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    console.log('✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during migration:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the migration
updateThemesAndCountries();
