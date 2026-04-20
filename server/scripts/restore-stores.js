/**
 * Restore Stores Script
 * Triggers scraping job to restore store links in the database
 * 
 * Usage: node scripts/restore-stores.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') });

// Scraping service removed - use new scrapingService.js instead
// import { runScraping } from '../services/scrapingService.js';
import Store from '../models/Store.js';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ Error: MONGODB_URI is not set in .env file');
  process.exit(1);
}

async function restoreStores() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 30000,
      connectTimeoutMS: 10000,
    });
    
    console.log('✅ Connected to MongoDB\n');

    // Check current store count
    const currentCount = await Store.countDocuments({});
    console.log(`📊 Current stores in database: ${currentCount}\n`);

    if (currentCount > 0) {
      console.log('⚠️  Database already has stores. This will add more stores, not replace them.');
      console.log('   If you want to start fresh, run clean-database.js first.\n');
    }

    console.log('🚀 Starting scraping job to restore stores...');
    console.log('   This may take several minutes to hours depending on the number of sources.\n');

    // Trigger the continuous scraping job
    const jobId = `restore-${Date.now()}`;
    console.log(`   Job ID: ${jobId}\n`);

    // Run scraping job (non-blocking)
    runContinuousScrapingJob(jobId)
      .then(() => {
        console.log('\n✅ Scraping job started successfully!');
        console.log('   Stores will be discovered and added to the database.');
        console.log('   Check the server logs for progress.\n');
        
        // Wait a bit then check progress
        setTimeout(async () => {
          const newCount = await Store.countDocuments({});
          console.log(`📊 Stores discovered so far: ${newCount}`);
          console.log(`   New stores added: ${newCount - currentCount}`);
          
          if (newCount > currentCount) {
            console.log('\n✅ Restoration in progress! Stores are being added.');
          } else {
            console.log('\n⏳ Scraping is running. Stores will appear as they are discovered.');
            console.log('   The scraping job runs continuously and will discover stores over time.');
          }
          
          await mongoose.disconnect();
          console.log('\n✅ Restoration process initiated successfully!');
          console.log('   The scraping job will continue running in the background.');
          console.log('   Monitor server logs to see progress.');
          process.exit(0);
        }, 10000); // Wait 10 seconds to see initial progress
      })
      .catch(async (error) => {
        console.error('\n❌ Error starting scraping job:', error);
        await mongoose.disconnect();
        process.exit(1);
      });

    // Keep the script running for a bit to see initial results
    await new Promise(resolve => setTimeout(resolve, 15000));

  } catch (error) {
    console.error('\n❌ Error restoring stores:', error);
    console.error(`   Message: ${error.message}`);
    console.error(`   Name: ${error.name}`);
    
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
}

restoreStores();
