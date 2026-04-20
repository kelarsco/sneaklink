/**
 * Script to delete all stores from the database
 * WARNING: This will permanently delete ALL store records
 * 
 * Usage: node server/scripts/delete-all-stores.js
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPrisma } from '../config/postgres.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

async function deleteAllStores() {
  try {
    console.log('🔄 Connecting to database...');
    const prisma = getPrisma();
    
    // First, count how many stores exist
    const count = await prisma.store.count();
    console.log(`📊 Found ${count.toLocaleString()} stores in database`);
    
    if (count === 0) {
      console.log('✅ No stores to delete. Database is already empty.');
      process.exit(0);
    }
    
    // Confirm deletion
    console.log('\n⚠️  WARNING: This will delete ALL stores from the database!');
    console.log(`   Total stores to delete: ${count.toLocaleString()}`);
    console.log('\n   This action cannot be undone.');
    console.log('   Press Ctrl+C to cancel, or wait 5 seconds to proceed...\n');
    
    // Wait 5 seconds for user to cancel
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('🗑️  Starting deletion...');
    
    // Delete all stores
    const result = await prisma.store.deleteMany({});
    
    console.log(`\n✅ Successfully deleted ${result.count.toLocaleString()} stores!`);
    console.log('   Database is now empty.');
    
    // Verify deletion
    const remainingCount = await prisma.store.count();
    if (remainingCount === 0) {
      console.log('✅ Verification: All stores have been deleted.');
    } else {
      console.log(`⚠️  Warning: ${remainingCount} stores still remain in database.`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error deleting stores:', error);
    process.exit(1);
  }
}

// Run the script
deleteAllStores();

