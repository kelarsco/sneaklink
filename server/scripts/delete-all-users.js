/**
 * Script to delete all users from the PostgreSQL database
 * This will also delete related data (sessions, subscriptions, devices, etc.) due to cascade deletes
 * 
 * Run this with: cd server && node scripts/delete-all-users.js
 * 
 * WARNING: This is a destructive operation. All users and their related data will be permanently deleted.
 */

import { getPrisma } from '../config/postgres.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') });

async function deleteAllUsers() {
  const prisma = getPrisma();
  
  try {
    console.log('🔍 Connecting to database...');
    
    // Count users before deletion
    const totalUsers = await prisma.user.count();
    console.log(`\n📊 Total users in database: ${totalUsers}`);

    if (totalUsers === 0) {
      console.log('✅ No users to delete. Database is already empty.');
      await prisma.$disconnect();
      return;
    }

    // Show users that will be deleted
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        accountStatus: true,
        subscriptionPlan: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log('\n👥 Users to be deleted:');
    users.forEach((user, index) => {
      console.log(
        `${index + 1}. ${user.name} (${user.email}) - ` +
        `Active: ${user.isActive}, Status: ${user.accountStatus || 'NOT SET'}, ` +
        `Plan: ${user.subscriptionPlan || 'free'}, Created: ${user.createdAt.toLocaleDateString()}`
      );
    });

    // Count related data that will be deleted (due to cascade)
    const [sessionsCount, subscriptionsCount, devicesCount, ticketsCount] = await Promise.all([
      prisma.session.count(),
      prisma.subscription.count(),
      prisma.userDevice.count(),
      prisma.supportTicket.count(),
    ]);

    console.log('\n📦 Related data that will be deleted:');
    console.log(`   - Sessions: ${sessionsCount}`);
    console.log(`   - Subscriptions: ${subscriptionsCount}`);
    console.log(`   - User Devices: ${devicesCount}`);
    console.log(`   - Support Tickets: ${ticketsCount}`);

    // Ask for confirmation (in a real scenario, you might want to add a prompt)
    console.log('\n⚠️  WARNING: This will permanently delete all users and their related data!');
    console.log('   Press Ctrl+C within 5 seconds to cancel...\n');
    
    // Wait 5 seconds before proceeding
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Delete all users (cascade will handle related data)
    console.log('🗑️  Deleting all users...');
    const deleteResult = await prisma.user.deleteMany({});

    console.log(`\n✅ Successfully deleted ${deleteResult.count} user(s)`);

    // Verify deletion
    const remainingUsers = await prisma.user.count();
    const remainingSessions = await prisma.session.count();
    const remainingSubscriptions = await prisma.subscription.count();
    const remainingDevices = await prisma.userDevice.count();
    const remainingTickets = await prisma.supportTicket.count();

    console.log('\n📊 Verification:');
    console.log(`   - Remaining users: ${remainingUsers}`);
    console.log(`   - Remaining sessions: ${remainingSessions}`);
    console.log(`   - Remaining subscriptions: ${remainingSubscriptions}`);
    console.log(`   - Remaining devices: ${remainingDevices}`);
    console.log(`   - Remaining tickets: ${remainingTickets}`);

    if (remainingUsers === 0) {
      console.log('\n✅ All users and related data have been deleted successfully!');
    } else {
      console.log(`\n⚠️  Warning: ${remainingUsers} user(s) still remain in the database`);
    }

    await prisma.$disconnect();
    console.log('\n✅ Disconnected from database');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error deleting users:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

// Run the script
deleteAllUsers();
