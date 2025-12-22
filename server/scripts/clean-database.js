/**
 * Database Clean Script
 * Cleans all collections in the database
 * WARNING: This will delete ALL data from the database!
 * 
 * Usage: node scripts/clean-database.js
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

// Import all models
import Store from '../models/Store.js';
import User from '../models/User.js';
import Session from '../models/Session.js';
import SupportTicket from '../models/SupportTicket.js';
import Staff from '../models/Staff.js';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ Error: MONGODB_URI is not set in .env file');
  process.exit(1);
}

async function cleanDatabase() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 30000,
      connectTimeoutMS: 10000,
    });
    
    console.log('✅ Connected to MongoDB\n');

    // Get collection counts before deletion
    const collections = {
      stores: await Store.countDocuments({}),
      users: await User.countDocuments({}),
      sessions: await Session.countDocuments({}),
      supportTickets: await SupportTicket.countDocuments({}),
      staff: await Staff.countDocuments({}),
    };

    console.log('📊 Current Database State:');
    console.log(`   Stores: ${collections.stores}`);
    console.log(`   Users: ${collections.users}`);
    console.log(`   Sessions: ${collections.sessions}`);
    console.log(`   Support Tickets: ${collections.supportTickets}`);
    console.log(`   Staff: ${collections.staff}`);
    console.log(`   Total Documents: ${Object.values(collections).reduce((a, b) => a + b, 0)}\n`);

    if (Object.values(collections).every(count => count === 0)) {
      console.log('✅ Database is already empty. Nothing to clean.');
      await mongoose.disconnect();
      process.exit(0);
    }

    // Confirm deletion
    console.log('⚠️  WARNING: This will delete ALL data from the database!');
    console.log('   Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
    
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('🗑️  Starting database cleanup...\n');

    // Delete all documents from each collection
    const results = {
      stores: await Store.deleteMany({}),
      users: await User.deleteMany({}),
      sessions: await Session.deleteMany({}),
      supportTickets: await SupportTicket.deleteMany({}),
      staff: await Staff.deleteMany({}),
    };

    console.log('✅ Database cleanup completed!\n');
    console.log('📊 Deletion Results:');
    console.log(`   Stores: ${results.stores.deletedCount} deleted`);
    console.log(`   Users: ${results.users.deletedCount} deleted`);
    console.log(`   Sessions: ${results.sessions.deletedCount} deleted`);
    console.log(`   Support Tickets: ${results.supportTickets.deletedCount} deleted`);
    console.log(`   Staff: ${results.staff.deletedCount} deleted`);
    
    const totalDeleted = Object.values(results).reduce((sum, r) => sum + r.deletedCount, 0);
    console.log(`\n   Total Documents Deleted: ${totalDeleted}`);

    // Verify all collections are empty
    const verifyCounts = {
      stores: await Store.countDocuments({}),
      users: await User.countDocuments({}),
      sessions: await Session.countDocuments({}),
      supportTickets: await SupportTicket.countDocuments({}),
      staff: await Staff.countDocuments({}),
    };

    const allEmpty = Object.values(verifyCounts).every(count => count === 0);
    
    if (allEmpty) {
      console.log('\n✅ Verification: All collections are now empty.');
    } else {
      console.log('\n⚠️  Warning: Some collections still have documents:');
      Object.entries(verifyCounts).forEach(([name, count]) => {
        if (count > 0) {
          console.log(`   ${name}: ${count} documents remaining`);
        }
      });
    }

    await mongoose.disconnect();
    console.log('\n✅ Database cleanup completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error cleaning database:', error);
    console.error(`   Message: ${error.message}`);
    console.error(`   Name: ${error.name}`);
    
    if (error.message.includes('authentication failed')) {
      console.error('\n💡 Authentication failed. Check your MONGODB_URI credentials.');
    } else if (error.message.includes('ENOTFOUND')) {
      console.error('\n💡 Network error. Check your internet connection and MongoDB Atlas cluster.');
    } else if (error.message.includes('timeout')) {
      console.error('\n💡 Connection timeout. Check if your MongoDB Atlas cluster is running.');
    }
    
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
}

cleanDatabase();
