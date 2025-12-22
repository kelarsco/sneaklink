/**
 * Migration Script: Update "Unknown" countries to "United States"
 * 
 * Run this script once to update existing stores in the database
 * that have "Unknown" as their country to "United States"
 * 
 * Usage: node scripts/migrateUnknownCountries.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Store from '../models/Store.js';

dotenv.config();

const migrateUnknownCountries = async () => {
  try {
    // Connect to MongoDB
    if (!process.env.MONGODB_URI) {
      console.error('❌ MONGODB_URI is not set in environment variables!');
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find all stores with "Unknown" country
    const unknownStores = await Store.find({ country: 'Unknown' });
    console.log(`📊 Found ${unknownStores.length} stores with "Unknown" country`);

    if (unknownStores.length === 0) {
      console.log('✅ No stores to migrate. All stores already have valid countries.');
      await mongoose.disconnect();
      return;
    }

    // Update all "Unknown" countries to "United States"
    const result = await Store.updateMany(
      { country: 'Unknown' },
      { $set: { country: 'United States' } }
    );

    console.log(`✅ Successfully updated ${result.modifiedCount} stores from "Unknown" to "United States"`);
    console.log(`   - Matched: ${result.matchedCount} stores`);
    console.log(`   - Modified: ${result.modifiedCount} stores`);

    await mongoose.disconnect();
    console.log('✅ Migration completed successfully');
  } catch (error) {
    console.error('❌ Error during migration:', error);
    process.exit(1);
  }
};

// Run migration
migrateUnknownCountries();

