/**
 * Migration Script: Add "Currently Running Ads" tag to stores with no tags
 * 
 * This script updates all stores in the database that have:
 * - Empty tags array []
 * - Null/undefined tags
 * - No tags at all
 * 
 * It assigns them the "Currently Running Ads" tag as the default.
 * 
 * Usage:
 *   node server/scripts/migrateEmptyTags.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Store from '../models/Store.js';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ Error: MONGODB_URI is not set in .env file');
  process.exit(1);
}

async function migrateEmptyTags() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find all stores with empty tags or no tags
    const storesWithoutTags = await Store.find({
      $or: [
        { tags: { $exists: false } },
        { tags: null },
        { tags: [] },
        { tags: { $size: 0 } }
      ]
    });

    console.log(`\n📊 Found ${storesWithoutTags.length} stores without tags`);

    if (storesWithoutTags.length === 0) {
      console.log('✅ No stores need updating. All stores already have tags.');
      await mongoose.disconnect();
      return;
    }

    // Update all stores to have "Currently Running Ads" tag
    const result = await Store.updateMany(
      {
        $or: [
          { tags: { $exists: false } },
          { tags: null },
          { tags: [] },
          { tags: { $size: 0 } }
        ]
      },
      {
        $set: {
          tags: ['Currently Running Ads']
        }
      }
    );

    console.log(`\n✅ Migration complete!`);
    console.log(`   - Updated ${result.modifiedCount} stores`);
    console.log(`   - All stores now have the "Currently Running Ads" tag by default`);

    // Verify the migration
    const storesStillWithoutTags = await Store.find({
      $or: [
        { tags: { $exists: false } },
        { tags: null },
        { tags: [] },
        { tags: { $size: 0 } }
      ]
    });

    if (storesStillWithoutTags.length > 0) {
      console.log(`\n⚠️  Warning: ${storesStillWithoutTags.length} stores still have no tags`);
    } else {
      console.log(`\n✅ Verification: All stores now have tags`);
    }

    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during migration:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the migration
migrateEmptyTags();

