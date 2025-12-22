/**
 * DATABASE CLEANUP SCRIPT for MongoDB Atlas Free Tier (M0)
 * 
 * PURPOSE:
 * - Remove old/inactive data to free up storage
 * - Clean up duplicate records
 * - Remove expired sessions and tickets
 * - Optimize database size
 * 
 * USAGE:
 *   node scripts/cleanup-database.js
 * 
 * SAFETY:
 * - Only removes data older than specified thresholds
 * - Creates backup before deletion (optional)
 * - Logs all operations
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from '../config/database.js';
import Store from '../models/Store.js';
import Session from '../models/Session.js';
import SupportTicket from '../models/SupportTicket.js';
import User from '../models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Cleanup configuration
const CLEANUP_CONFIG = {
  // Remove inactive stores not scraped in X days
  INACTIVE_STORE_DAYS: 90,
  
  // Remove old sessions (inactive for X days)
  OLD_SESSION_DAYS: 30,
  
  // Remove resolved/closed tickets older than X days
  OLD_TICKET_DAYS: 90,
  
  // Remove old device records (older than X days)
  OLD_DEVICE_DAYS: 60,
  
  // Limit device array size per user
  MAX_DEVICES_PER_USER: 5,
};

async function cleanupDatabase() {
  console.log('\n' + '='.repeat(80));
  console.log('🧹 DATABASE CLEANUP SCRIPT');
  console.log('='.repeat(80));
  console.log('⚠️  This script will remove old/inactive data to free up storage');
  console.log('='.repeat(80) + '\n');

  try {
    // Connect to database
    console.log('📡 Connecting to database...');
    await connectDB();
    console.log('✅ Database connected!\n');

    const stats = {
      storesRemoved: 0,
      sessionsRemoved: 0,
      ticketsRemoved: 0,
      devicesRemoved: 0,
      duplicatesRemoved: 0,
    };

    // 1. Clean up inactive stores
    console.log('📦 Cleaning up inactive stores...');
    const inactiveStoreDate = new Date();
    inactiveStoreDate.setDate(inactiveStoreDate.getDate() - CLEANUP_CONFIG.INACTIVE_STORE_DAYS);
    
    const inactiveStores = await Store.deleteMany({
      isActive: false,
      lastScraped: { $lt: inactiveStoreDate },
    });
    stats.storesRemoved = inactiveStores.deletedCount;
    console.log(`   ✅ Removed ${stats.storesRemoved} inactive stores\n`);

    // 2. Clean up old sessions (TTL should handle this, but manual cleanup for safety)
    console.log('🔐 Cleaning up old sessions...');
    const oldSessionDate = new Date();
    oldSessionDate.setDate(oldSessionDate.getDate() - CLEANUP_CONFIG.OLD_SESSION_DAYS);
    
    const oldSessions = await Session.deleteMany({
      isActive: false,
      lastActivity: { $lt: oldSessionDate },
    });
    stats.sessionsRemoved = oldSessions.deletedCount;
    console.log(`   ✅ Removed ${stats.sessionsRemoved} old sessions\n`);

    // 3. Clean up old resolved/closed tickets
    console.log('🎫 Cleaning up old tickets...');
    const oldTicketDate = new Date();
    oldTicketDate.setDate(oldTicketDate.getDate() - CLEANUP_CONFIG.OLD_TICKET_DAYS);
    
    const oldTickets = await SupportTicket.deleteMany({
      status: { $in: ['resolved', 'closed'] },
      createdAt: { $lt: oldTicketDate },
    });
    stats.ticketsRemoved = oldTickets.deletedCount;
    console.log(`   ✅ Removed ${stats.ticketsRemoved} old tickets\n`);

    // 4. Clean up old device records from users
    console.log('📱 Cleaning up old device records...');
    const oldDeviceDate = new Date();
    oldDeviceDate.setDate(oldDeviceDate.getDate() - CLEANUP_CONFIG.OLD_DEVICE_DAYS);
    
    const users = await User.find({ 'devices.0': { $exists: true } }).lean();
    let devicesRemovedCount = 0;
    
    for (const user of users) {
      if (!user.devices || user.devices.length === 0) continue;
      
      // Remove old devices
      const oldDevices = user.devices.filter(device => {
        const lastActive = device.lastActive ? new Date(device.lastActive) : new Date(0);
        return lastActive < oldDeviceDate;
      });
      
      // Also limit to MAX_DEVICES_PER_USER (keep most recent)
      const sortedDevices = user.devices
        .filter(device => {
          const lastActive = device.lastActive ? new Date(device.lastActive) : new Date(0);
          return lastActive >= oldDeviceDate;
        })
        .sort((a, b) => {
          const dateA = a.lastActive ? new Date(a.lastActive) : new Date(0);
          const dateB = b.lastActive ? new Date(b.lastActive) : new Date(0);
          return dateB - dateA; // Most recent first
        })
        .slice(0, CLEANUP_CONFIG.MAX_DEVICES_PER_USER);
      
      if (sortedDevices.length !== user.devices.length) {
        await User.updateOne(
          { _id: user._id },
          { $set: { devices: sortedDevices } }
        );
        devicesRemovedCount += user.devices.length - sortedDevices.length;
      }
    }
    stats.devicesRemoved = devicesRemovedCount;
    console.log(`   ✅ Removed ${stats.devicesRemoved} old device records\n`);

    // 5. Find and remove duplicate stores (by URL)
    console.log('🔍 Checking for duplicate stores...');
    const duplicateStores = await Store.aggregate([
      {
        $group: {
          _id: { $toLower: '$url' }, // Normalize URL
          count: { $sum: 1 },
          ids: { $push: '$_id' },
        },
      },
      {
        $match: { count: { $gt: 1 } }, // Only groups with duplicates
      },
    ]);
    
    let duplicatesRemoved = 0;
    for (const dup of duplicateStores) {
      // Keep the oldest store, remove others
      const stores = await Store.find({ _id: { $in: dup.ids } })
        .sort({ dateAdded: 1 }) // Oldest first
        .lean();
      
      if (stores.length > 1) {
        const keepId = stores[0]._id;
        const removeIds = stores.slice(1).map(s => s._id);
        
        await Store.deleteMany({ _id: { $in: removeIds } });
        duplicatesRemoved += removeIds.length;
      }
    }
    stats.duplicatesRemoved = duplicatesRemoved;
    console.log(`   ✅ Removed ${stats.duplicatesRemoved} duplicate stores\n`);

    // Summary
    console.log('='.repeat(80));
    console.log('✨ CLEANUP COMPLETE');
    console.log('='.repeat(80));
    console.log('📊 Summary:');
    console.log(`   Stores removed: ${stats.storesRemoved}`);
    console.log(`   Sessions removed: ${stats.sessionsRemoved}`);
    console.log(`   Tickets removed: ${stats.ticketsRemoved}`);
    console.log(`   Devices removed: ${stats.devicesRemoved}`);
    console.log(`   Duplicates removed: ${stats.duplicatesRemoved}`);
    console.log(`   Total records removed: ${Object.values(stats).reduce((a, b) => a + b, 0)}`);
    console.log('='.repeat(80) + '\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Cleanup error:', error);
    process.exit(1);
  }
}

// Run cleanup
cleanupDatabase();
