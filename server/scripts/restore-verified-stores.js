/**
 * Restore Verified Stores Script
 * Attempts to restore previously deleted verified stores from the database
 * 
 * Verified stores are defined as:
 * - isShopify: true
 * - isActive: true
 * - isPasswordProtected: false
 * - productCount >= 1
 * 
 * Usage: node scripts/restore-verified-stores.js
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

import Store from '../models/Store.js';
import connectDB from '../config/database.js';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ Error: MONGODB_URI is not set in .env file');
  process.exit(1);
}

/**
 * Check MongoDB oplog for deleted stores (if replica set is enabled)
 */
async function checkOplog() {
  try {
    const db = mongoose.connection.db;
    const adminDb = db.admin();
    
    // Check if this is a replica set
    const status = await adminDb.command({ replSetGetStatus: 1 }).catch(() => null);
    
    if (!status) {
      console.log('ℹ️  MongoDB is not configured as a replica set.');
      console.log('   Oplog recovery is not available.\n');
      return null;
    }
    
    console.log('✅ Replica set detected. Checking oplog...\n');
    
    // Access oplog collection
    const oplog = db.collection('oplog.rs');
    
    // Find delete operations for stores collection in the last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const deleteOps = await oplog.find({
      ns: `${db.databaseName}.stores`,
      op: 'd',
      ts: { $gte: mongoose.mongo.Timestamp.fromNumber(Math.floor(thirtyDaysAgo.getTime() / 1000)) }
    }).sort({ ts: -1 }).limit(5000).toArray();
    
    if (deleteOps.length === 0) {
      console.log('ℹ️  No delete operations found in oplog for the last 30 days.\n');
      console.log('   The deletion may have occurred more than 30 days ago,');
      console.log('   or the oplog may have been rotated.\n');
      return null;
    }
    
    console.log(`📊 Found ${deleteOps.length} delete operations in oplog\n`);
    
    // Extract store data from oplog entries
    const deletedStores = deleteOps
      .map(op => op.o) // o contains the deleted document
      .filter(doc => doc && doc.isShopify && doc.isActive && !doc.isPasswordProtected && doc.productCount >= 1);
    
    console.log(`✅ Found ${deletedStores.length} verified stores in oplog\n`);
    
    return deletedStores;
  } catch (error) {
    console.log('ℹ️  Could not access oplog:', error.message);
    console.log('   This is normal if MongoDB is not configured as a replica set.\n');
    return null;
  }
}

/**
 * Restore stores from oplog data
 */
async function restoreFromOplog(deletedStores) {
  if (!deletedStores || deletedStores.length === 0) {
    return 0;
  }
  
  console.log(`🔄 Attempting to restore ${deletedStores.length} verified stores from oplog...\n`);
  
  let restored = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const store of deletedStores) {
    try {
      // Remove _id to allow MongoDB to create a new one
      const { _id, ...storeData } = store;
      
      // Check if store already exists (by URL)
      const existing = await Store.findOne({ url: store.url });
      if (existing) {
        skipped++;
        continue;
      }
      
      // Create new store document
      const newStore = new Store(storeData);
      await newStore.save();
      restored++;
      
      if (restored % 100 === 0) {
        console.log(`   Progress: ${restored} restored, ${skipped} skipped, ${errors} errors`);
      }
    } catch (error) {
      if (error.code === 11000) {
        // Duplicate key error (URL already exists)
        skipped++;
      } else {
        console.error(`   Error restoring store ${store.url}:`, error.message);
        errors++;
      }
    }
  }
  
  console.log(`\n✅ Restoration complete:`);
  console.log(`   Restored: ${restored}`);
  console.log(`   Skipped (already exist): ${skipped}`);
  console.log(`   Errors: ${errors}\n`);
  
  return restored;
}

/**
 * Check for MongoDB backups
 */
async function checkBackups() {
  console.log('📦 Checking for MongoDB backups...\n');
  
  // Check common backup locations
  const possibleBackupPaths = [
    join(__dirname, '../backups'),
    join(__dirname, '../../backups'),
    join(__dirname, '../../../backups'),
  ];
  
  const fs = await import('fs');
  let foundBackups = false;
  
  for (const backupPath of possibleBackupPaths) {
    try {
      if (fs.existsSync(backupPath)) {
        const files = fs.readdirSync(backupPath);
        const jsonFiles = files.filter(f => f.endsWith('.json') && f.includes('store'));
        
        if (jsonFiles.length > 0) {
          console.log(`✅ Found backup directory: ${backupPath}`);
          console.log(`   Found ${jsonFiles.length} potential backup files:\n`);
          jsonFiles.forEach(file => {
            console.log(`   - ${file}`);
          });
          console.log();
          foundBackups = true;
        }
      }
    } catch (error) {
      // Directory doesn't exist, continue
    }
  }
  
  if (!foundBackups) {
    console.log('ℹ️  No backup files found in common locations.\n');
  }
  
  return foundBackups;
}

/**
 * Restore from JSON backup file
 */
async function restoreFromBackup(backupPath) {
  const fs = await import('fs');
  
  try {
    console.log(`📂 Reading backup file: ${backupPath}\n`);
    const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    
    // Handle both array and object formats
    const stores = Array.isArray(backupData) ? backupData : (backupData.stores || []);
    
    // Filter for verified stores
    const verifiedStores = stores.filter(store => 
      store.isShopify === true &&
      store.isActive === true &&
      store.isPasswordProtected === false &&
      store.productCount >= 1
    );
    
    console.log(`📊 Found ${stores.length} total stores in backup`);
    console.log(`✅ Found ${verifiedStores.length} verified stores\n`);
    
    if (verifiedStores.length === 0) {
      console.log('⚠️  No verified stores found in backup file.\n');
      return 0;
    }
    
    console.log(`🔄 Restoring ${verifiedStores.length} verified stores...\n`);
    
    let restored = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const store of verifiedStores) {
      try {
        // Remove _id to allow MongoDB to create a new one
        const { _id, __v, createdAt, updatedAt, ...storeData } = store;
        
        // Check if store already exists (by URL)
        const existing = await Store.findOne({ url: store.url });
        if (existing) {
          skipped++;
          continue;
        }
        
        // Create new store document
        const newStore = new Store(storeData);
        await newStore.save();
        restored++;
        
        if (restored % 100 === 0) {
          console.log(`   Progress: ${restored} restored, ${skipped} skipped, ${errors} errors`);
        }
      } catch (error) {
        if (error.code === 11000) {
          // Duplicate key error (URL already exists)
          skipped++;
        } else {
          console.error(`   Error restoring store ${store.url}:`, error.message);
          errors++;
        }
      }
    }
    
    console.log(`\n✅ Restoration complete:`);
    console.log(`   Restored: ${restored}`);
    console.log(`   Skipped (already exist): ${skipped}`);
    console.log(`   Errors: ${errors}\n`);
    
    return restored;
  } catch (error) {
    console.error(`❌ Error reading backup file:`, error.message);
    return 0;
  }
}

/**
 * Main restoration function
 */
async function restoreVerifiedStores() {
  try {
    console.log('🔄 Starting Verified Stores Restoration Process\n');
    console.log('=' .repeat(60));
    console.log();
    
    // Connect to database
    console.log('📡 Connecting to MongoDB...');
    await connectDB();
    console.log('✅ Connected to MongoDB\n');
    
    // Check current store count
    const currentCount = await Store.countDocuments({});
    const verifiedCount = await Store.countDocuments({
      isShopify: true,
      isActive: true,
      isPasswordProtected: false,
      productCount: { $gte: 1 }
    });
    
    console.log(`📊 Current database status:`);
    console.log(`   Total stores: ${currentCount}`);
    console.log(`   Verified stores: ${verifiedCount}\n`);
    
    // Method 1: Try oplog recovery
    console.log('Method 1: Checking MongoDB Oplog...');
    console.log('-'.repeat(60));
    const oplogStores = await checkOplog();
    
    if (oplogStores && oplogStores.length > 0) {
      const restored = await restoreFromOplog(oplogStores);
      if (restored > 0) {
        console.log('✅ Successfully restored stores from oplog!\n');
        await mongoose.disconnect();
        return;
      }
    }
    
    // Method 2: Check for backup files
    console.log('Method 2: Checking for Backup Files...');
    console.log('-'.repeat(60));
    const hasBackups = await checkBackups();
    
    if (hasBackups) {
      console.log('💡 If you have a backup file, you can restore it by:');
      console.log('   1. Place the backup JSON file in server/backups/');
      console.log('   2. Run: node scripts/restore-verified-stores.js --backup <filename>\n');
    }
    
    // Method 3: Re-scraping (will discover new stores, not restore exact ones)
    console.log('Method 3: Re-scraping Stores...');
    console.log('-'.repeat(60));
    console.log('⚠️  Note: Re-scraping will discover NEW stores, not restore the exact deleted ones.');
    console.log('   However, if the stores still exist online, they may be re-discovered.\n');
    
    console.log('💡 Recommendations:');
    console.log('   1. Check MongoDB Atlas backups (if using Atlas)');
    console.log('   2. Check if you have any local MongoDB dumps');
    console.log('   3. Check if you exported stores to JSON/CSV before deletion');
    console.log('   4. Run the continuous scraping job to re-discover stores:\n');
    console.log('      node scripts/restore-stores.js\n');
    
    // Final count
    const finalCount = await Store.countDocuments({});
    const finalVerifiedCount = await Store.countDocuments({
      isShopify: true,
      isActive: true,
      isPasswordProtected: false,
      productCount: { $gte: 1 }
    });
    
    console.log('📊 Final database status:');
    console.log(`   Total stores: ${finalCount}`);
    console.log(`   Verified stores: ${finalVerifiedCount}`);
    console.log(`   Change: +${finalCount - currentCount} total, +${finalVerifiedCount - verifiedCount} verified\n`);
    
    await mongoose.disconnect();
    console.log('✅ Restoration process completed\n');
    
  } catch (error) {
    console.error('\n❌ Error during restoration:', error);
    console.error(`   Message: ${error.message}`);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
}

// Handle command line arguments
const args = process.argv.slice(2);
if (args.includes('--backup') || args.includes('-b')) {
  const backupIndex = args.indexOf('--backup') !== -1 ? args.indexOf('--backup') : args.indexOf('-b');
  const backupFile = args[backupIndex + 1];
  
  if (!backupFile) {
    console.error('❌ Error: Please provide a backup file path');
    console.error('   Usage: node scripts/restore-verified-stores.js --backup <filepath>');
    process.exit(1);
  }
  
  // Restore from backup file
  (async () => {
    await connectDB();
    await restoreFromBackup(backupFile);
    await mongoose.disconnect();
  })();
} else {
  // Run main restoration process
  restoreVerifiedStores();
}
