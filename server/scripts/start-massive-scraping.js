/**
 * Start Massive Scraping Job
 * 
 * This script immediately starts a continuous scraping job with all sources enabled
 * and optimized settings for maximum throughput (thousands to millions of stores).
 * 
 * Usage:
 *   node scripts/start-massive-scraping.js
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from '../config/database.js';
import { runContinuousScrapingJob, getContinuousScrapingStatus } from '../services/continuousScrapingService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function startMassiveScraping() {
  console.log('\n' + '='.repeat(80));
  console.log('🚀 STARTING MASSIVE SCRAPING JOB');
  console.log('='.repeat(80));
  console.log('📋 Configuration:');
  console.log('   - All scraping sources: ENABLED');
  console.log('   - Batch size: 200 stores');
  console.log('   - Concurrent processing: 50 stores');
  console.log('   - Delays: MINIMIZED for maximum speed');
  console.log('   - Coverage: GLOBAL (all countries)');
  console.log('='.repeat(80) + '\n');

  try {
    // Connect to database
    console.log('📡 Connecting to database...');
    await connectDB();
    console.log('✅ Database connected!\n');

    // Check current status
    const status = getContinuousScrapingStatus();
    if (status.isScraping) {
      console.log('⚠️  WARNING: A scraping job is already in progress!');
      console.log(`   Current Job ID: ${status.currentJobId}`);
      console.log('   Waiting for it to complete...\n');
      
      // Wait a bit and check again
      await new Promise(resolve => setTimeout(resolve, 5000));
      const newStatus = getContinuousScrapingStatus();
      if (newStatus.isScraping) {
        console.log('❌ Another job is still running. Please wait for it to complete.');
        process.exit(1);
      }
    }

    // Start the scraping job
    console.log('🎯 Starting scraping job...\n');
    const jobId = `massive-${Date.now()}`;
    const result = await runContinuousScrapingJob(jobId);

    if (result.success) {
      console.log('\n' + '='.repeat(80));
      console.log('✨ MASSIVE SCRAPING JOB COMPLETED SUCCESSFULLY!');
      console.log('='.repeat(80));
      console.log(`📋 Job ID: ${result.jobId}`);
      console.log(`⏱️  Duration: ${result.duration}s`);
      console.log(`📊 Results:`);
      console.log(`   ✅ Saved: ${result.stats.saved} stores`);
      console.log(`   ⏭️  Skipped: ${result.stats.skipped} stores`);
      console.log(`   ❌ Errors: ${result.stats.errors} stores`);
      console.log(`\n📈 Source Breakdown:`);
      for (const [source, count] of Object.entries(result.sourceResults || {})) {
        console.log(`   ${source}: ${count} stores`);
      }
      console.log('='.repeat(80) + '\n');
      
      process.exit(0);
    } else {
      console.error('\n❌ Scraping job failed!');
      console.error(`   Error: ${result.error || 'Unknown error'}`);
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
startMassiveScraping();
