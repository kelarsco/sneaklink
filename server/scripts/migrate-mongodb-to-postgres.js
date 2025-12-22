/**
 * MongoDB to PostgreSQL Data Migration Script
 * 
 * This script migrates all data from MongoDB to PostgreSQL
 * 
 * Usage:
 *   node scripts/migrate-mongodb-to-postgres.js
 * 
 * IMPORTANT:
 * - Make sure both databases are connected
 * - This script will skip duplicates (based on unique fields)
 * - Run migrations first: npm run prisma:migrate
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { connectPostgres, getPrisma } from '../config/postgres.js';

// Import MongoDB models
import User from '../models/User.js';
import Store from '../models/Store.js';
import Session from '../models/Session.js';
import Subscription from '../models/Subscription.js';
import SupportTicket from '../models/SupportTicket.js';
import Staff from '../models/Staff.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Migration statistics
const stats = {
  users: { migrated: 0, skipped: 0, errors: 0 },
  stores: { migrated: 0, skipped: 0, errors: 0 },
  sessions: { migrated: 0, skipped: 0, errors: 0 },
  subscriptions: { migrated: 0, skipped: 0, errors: 0 },
  supportTickets: { migrated: 0, skipped: 0, errors: 0 },
  staff: { migrated: 0, skipped: 0, errors: 0 },
};

/**
 * Normalize URL for consistent storage
 */
const normalizeUrl = (url) => {
  if (!url) return null;
  return url.trim().toLowerCase().replace(/\/$/, '');
};

/**
 * Migrate Users
 */
async function migrateUsers() {
  console.log('\n📦 Migrating Users...');
  const prisma = getPrisma();
  
  try {
    const mongoUsers = await User.find({}).lean();
    console.log(`   Found ${mongoUsers.length} users in MongoDB`);
    
    for (const mongoUser of mongoUsers) {
      try {
        // Check if user already exists
        const existing = await prisma.user.findUnique({
          where: { email: mongoUser.email.toLowerCase() },
        });
        
        if (existing) {
          stats.users.skipped++;
          continue;
        }
        
        // Migrate user
        await prisma.user.create({
          data: {
            email: mongoUser.email.toLowerCase(),
            name: mongoUser.name || 'Unknown',
            picture: mongoUser.picture || null,
            googleId: mongoUser.googleId || null,
            provider: mongoUser.provider || 'google',
            paystackCustomerCode: mongoUser.paystackCustomerCode || null,
            isActive: mongoUser.isActive !== false,
            accountStatus: mongoUser.accountStatus || 'active',
            subscriptionPlan: mongoUser.subscription?.plan || 'free',
            subscriptionStatus: mongoUser.subscription?.status || 'active',
            subscriptionStartDate: mongoUser.subscription?.startDate || null,
            subscriptionEndDate: mongoUser.subscription?.endDate || null,
            subscriptionAutoRenew: mongoUser.subscription?.autoRenew || false,
            subscriptionBillingCycle: mongoUser.subscription?.billingCycle || null,
            filterQueriesThisMonth: mongoUser.usage?.filterQueriesThisMonth || 0,
            filterQueriesResetDate: mongoUser.usage?.filterQueriesResetDate || new Date(),
            csvExportsToday: mongoUser.usage?.csvExportsToday || 0,
            csvExportsResetDate: mongoUser.usage?.csvExportsResetDate || new Date(),
            copyOperationsToday: mongoUser.usage?.copyOperationsToday || 0,
            copyOperationsResetDate: mongoUser.usage?.copyOperationsResetDate || new Date(),
            maxDevices: mongoUser.maxDevices || 1,
            createdAt: mongoUser.createdAt || new Date(),
            lastLogin: mongoUser.lastLogin || new Date(),
          },
        });
        
        stats.users.migrated++;
      } catch (error) {
        console.error(`   Error migrating user ${mongoUser.email}:`, error.message);
        stats.users.errors++;
      }
    }
    
    console.log(`   ✅ Users: ${stats.users.migrated} migrated, ${stats.users.skipped} skipped, ${stats.users.errors} errors`);
  } catch (error) {
    console.error('   ❌ Error migrating users:', error);
  }
}

/**
 * Migrate Stores
 */
async function migrateStores() {
  console.log('\n📦 Migrating Stores...');
  const prisma = getPrisma();
  
  try {
    const mongoStores = await Store.find({}).lean();
    console.log(`   Found ${mongoStores.length} stores in MongoDB`);
    
    for (const mongoStore of mongoStores) {
      try {
        const normalizedUrl = normalizeUrl(mongoStore.url);
        if (!normalizedUrl) {
          stats.stores.skipped++;
          continue;
        }
        
        // Check if store already exists
        const existing = await prisma.store.findUnique({
          where: { url: normalizedUrl },
        });
        
        if (existing) {
          stats.stores.skipped++;
          continue;
        }
        
        // Migrate store
        await prisma.store.create({
          data: {
            name: mongoStore.name || 'Unknown Store',
            url: normalizedUrl,
            country: mongoStore.country || 'Unknown',
            productCount: mongoStore.productCount || 1,
            isActive: mongoStore.isActive !== false,
            isShopify: mongoStore.isShopify !== false,
            hasFacebookAds: mongoStore.hasFacebookAds || false,
            tags: Array.isArray(mongoStore.tags) ? mongoStore.tags : [],
            businessModel: mongoStore.businessModel || 'Unknown',
            source: mongoStore.source || 'api',
            dateAdded: mongoStore.dateAdded || new Date(),
            lastScraped: mongoStore.lastScraped || new Date(),
          },
        });
        
        stats.stores.migrated++;
      } catch (error) {
        console.error(`   Error migrating store ${mongoStore.url}:`, error.message);
        stats.stores.errors++;
      }
    }
    
    console.log(`   ✅ Stores: ${stats.stores.migrated} migrated, ${stats.stores.skipped} skipped, ${stats.stores.errors} errors`);
  } catch (error) {
    console.error('   ❌ Error migrating stores:', error);
  }
}

/**
 * Migrate Sessions
 */
async function migrateSessions() {
  console.log('\n📦 Migrating Sessions...');
  const prisma = getPrisma();
  
  try {
    const mongoSessions = await Session.find({}).lean();
    console.log(`   Found ${mongoSessions.length} sessions in MongoDB`);
    
    // Get user email to ID mapping
    const users = await prisma.user.findMany({ select: { id: true, email: true } });
    const userEmailToId = {};
    users.forEach(u => {
      userEmailToId[u.email.toLowerCase()] = u.id;
    });
    
    // Get MongoDB users for userId mapping
    const mongoUsers = await User.find({}).lean();
    const mongoUserIdToEmail = {};
    mongoUsers.forEach(u => {
      mongoUserIdToEmail[u._id.toString()] = u.email.toLowerCase();
    });
    
    for (const mongoSession of mongoSessions) {
      try {
        // Find PostgreSQL user ID
        const userEmail = mongoUserIdToEmail[mongoSession.userId?.toString()];
        if (!userEmail) {
          stats.sessions.skipped++;
          continue;
        }
        
        const postgresUserId = userEmailToId[userEmail];
        if (!postgresUserId) {
          stats.sessions.skipped++;
          continue;
        }
        
        // Check if session already exists
        const existing = await prisma.session.findUnique({
          where: { sessionId: mongoSession.sessionId },
        });
        
        if (existing) {
          stats.sessions.skipped++;
          continue;
        }
        
        // Migrate session
        await prisma.session.create({
          data: {
            userId: postgresUserId,
            sessionId: mongoSession.sessionId,
            token: mongoSession.token,
            ip: mongoSession.ip || null,
            isActive: mongoSession.isActive !== false,
            lastActivity: mongoSession.lastActivity || mongoSession.createdAt || new Date(),
            createdAt: mongoSession.createdAt || new Date(),
          },
        });
        
        stats.sessions.migrated++;
      } catch (error) {
        console.error(`   Error migrating session ${mongoSession.sessionId}:`, error.message);
        stats.sessions.errors++;
      }
    }
    
    console.log(`   ✅ Sessions: ${stats.sessions.migrated} migrated, ${stats.sessions.skipped} skipped, ${stats.sessions.errors} errors`);
  } catch (error) {
    console.error('   ❌ Error migrating sessions:', error);
  }
}

/**
 * Migrate Subscriptions
 */
async function migrateSubscriptions() {
  console.log('\n📦 Migrating Subscriptions...');
  const prisma = getPrisma();
  
  try {
    const mongoSubscriptions = await Subscription.find({}).lean();
    console.log(`   Found ${mongoSubscriptions.length} subscriptions in MongoDB`);
    
    // Get user email to ID mapping
    const users = await prisma.user.findMany({ select: { id: true, email: true } });
    const userEmailToId = {};
    users.forEach(u => {
      userEmailToId[u.email.toLowerCase()] = u.id;
    });
    
    // Get MongoDB users for userId mapping
    const mongoUsers = await User.find({}).lean();
    const mongoUserIdToEmail = {};
    mongoUsers.forEach(u => {
      mongoUserIdToEmail[u._id.toString()] = u.email.toLowerCase();
    });
    
    for (const mongoSub of mongoSubscriptions) {
      try {
        // Find PostgreSQL user ID
        const userEmail = mongoUserIdToEmail[mongoSub.userId?.toString()];
        if (!userEmail) {
          stats.subscriptions.skipped++;
          continue;
        }
        
        const postgresUserId = userEmailToId[userEmail];
        if (!postgresUserId) {
          stats.subscriptions.skipped++;
          continue;
        }
        
        // Check if subscription already exists
        const existing = await prisma.subscription.findUnique({
          where: { paystackSubscriptionCode: mongoSub.paystackSubscriptionCode },
        });
        
        if (existing) {
          stats.subscriptions.skipped++;
          continue;
        }
        
        // Migrate subscription
        await prisma.subscription.create({
          data: {
            userId: postgresUserId,
            plan: mongoSub.plan,
            billingCycle: mongoSub.billingCycle || 'monthly',
            paystackCustomerCode: mongoSub.paystackCustomerCode,
            paystackSubscriptionCode: mongoSub.paystackSubscriptionCode,
            paystackAuthorizationCode: mongoSub.paystackAuthorizationCode,
            status: mongoSub.status || 'pending',
            amount: mongoSub.amount,
            currency: mongoSub.currency || 'NGN',
            startDate: mongoSub.startDate || new Date(),
            nextPaymentDate: mongoSub.nextPaymentDate || new Date(),
            cancelledAt: mongoSub.cancelledAt || null,
            cancelledBy: mongoSub.cancelledBy || null,
          },
        });
        
        stats.subscriptions.migrated++;
      } catch (error) {
        console.error(`   Error migrating subscription ${mongoSub.paystackSubscriptionCode}:`, error.message);
        stats.subscriptions.errors++;
      }
    }
    
    console.log(`   ✅ Subscriptions: ${stats.subscriptions.migrated} migrated, ${stats.subscriptions.skipped} skipped, ${stats.subscriptions.errors} errors`);
  } catch (error) {
    console.error('   ❌ Error migrating subscriptions:', error);
  }
}

/**
 * Migrate Support Tickets
 */
async function migrateSupportTickets() {
  console.log('\n📦 Migrating Support Tickets...');
  const prisma = getPrisma();
  
  try {
    const mongoTickets = await SupportTicket.find({}).lean();
    console.log(`   Found ${mongoTickets.length} support tickets in MongoDB`);
    
    // Get user email to ID mapping
    const users = await prisma.user.findMany({ select: { id: true, email: true } });
    const userEmailToId = {};
    users.forEach(u => {
      userEmailToId[u.email.toLowerCase()] = u.id;
    });
    
    for (const mongoTicket of mongoTickets) {
      try {
        const userEmail = mongoTicket.userEmail?.toLowerCase();
        const postgresUserId = userEmail ? userEmailToId[userEmail] : null;
        
        // Check if ticket already exists
        const existing = await prisma.supportTicket.findUnique({
          where: { ticketId: mongoTicket.ticketId },
        });
        
        if (existing) {
          stats.supportTickets.skipped++;
          continue;
        }
        
        // Migrate ticket
        await prisma.supportTicket.create({
          data: {
            ticketId: mongoTicket.ticketId,
            userId: postgresUserId,
            userEmail: mongoTicket.userEmail || 'unknown@example.com',
            userName: mongoTicket.userName || 'Unknown',
            userPlan: mongoTicket.userPlan || 'free',
            subject: mongoTicket.subject || 'No Subject',
            message: mongoTicket.message || '',
            status: mongoTicket.status || 'open',
            priority: mongoTicket.priority || 'medium',
            replies: mongoTicket.replies ? JSON.parse(JSON.stringify(mongoTicket.replies)) : null,
            lastRepliedBy: mongoTicket.lastRepliedBy || null,
            lastRepliedAt: mongoTicket.lastRepliedAt || null,
            assignedTo: mongoTicket.assignedTo || null,
            createdAt: mongoTicket.createdAt || new Date(),
          },
        });
        
        stats.supportTickets.migrated++;
      } catch (error) {
        console.error(`   Error migrating ticket ${mongoTicket.ticketId}:`, error.message);
        stats.supportTickets.errors++;
      }
    }
    
    console.log(`   ✅ Support Tickets: ${stats.supportTickets.migrated} migrated, ${stats.supportTickets.skipped} skipped, ${stats.supportTickets.errors} errors`);
  } catch (error) {
    console.error('   ❌ Error migrating support tickets:', error);
  }
}

/**
 * Migrate Staff
 */
async function migrateStaff() {
  console.log('\n📦 Migrating Staff...');
  const prisma = getPrisma();
  
  try {
    const mongoStaff = await Staff.find({}).lean();
    console.log(`   Found ${mongoStaff.length} staff members in MongoDB`);
    
    for (const mongoStaffMember of mongoStaff) {
      try {
        // Check if staff already exists
        const existing = await prisma.staff.findUnique({
          where: { email: mongoStaffMember.email.toLowerCase() },
        });
        
        if (existing) {
          stats.staff.skipped++;
          continue;
        }
        
        // Migrate staff
        await prisma.staff.create({
          data: {
            name: mongoStaffMember.name || 'Unknown',
            email: mongoStaffMember.email.toLowerCase(),
            role: mongoStaffMember.role || 'support',
            permissions: Array.isArray(mongoStaffMember.permissions) ? mongoStaffMember.permissions : [],
            invitationToken: mongoStaffMember.invitationToken || null,
            invitationTokenExpires: mongoStaffMember.invitationTokenExpires || null,
            invitationAccepted: mongoStaffMember.invitationAccepted || false,
            invitationAcceptedAt: mongoStaffMember.invitationAcceptedAt || null,
            addedBy: mongoStaffMember.addedBy || null,
            status: mongoStaffMember.status || 'pending',
            createdAt: mongoStaffMember.createdAt || new Date(),
          },
        });
        
        stats.staff.migrated++;
      } catch (error) {
        console.error(`   Error migrating staff ${mongoStaffMember.email}:`, error.message);
        stats.staff.errors++;
      }
    }
    
    console.log(`   ✅ Staff: ${stats.staff.migrated} migrated, ${stats.staff.skipped} skipped, ${stats.staff.errors} errors`);
  } catch (error) {
    console.error('   ❌ Error migrating staff:', error);
  }
}

/**
 * Main migration function
 */
async function migrate() {
  console.log('\n' + '='.repeat(80));
  console.log('🔄 MongoDB to PostgreSQL Migration');
  console.log('='.repeat(80));
  
  try {
    // Connect to MongoDB (simple connection for migration)
    console.log('\n📡 Connecting to MongoDB...');
    let mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI not found in .env file');
    }
    
    // Remove unsupported options from connection string
    // Remove keepalive and keepAlive parameters if present
    mongoUri = mongoUri.replace(/[?&]keepalive=[^&]*/gi, '');
    mongoUri = mongoUri.replace(/[?&]keepAlive=[^&]*/gi, '');
    
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 60000,
      connectTimeoutMS: 30000,
      retryWrites: true,
      retryReads: true,
      // Explicitly avoid keepAlive options that cause issues
    });
    console.log('   ✅ MongoDB connected');
    
    // Connect to PostgreSQL
    console.log('\n📡 Connecting to PostgreSQL...');
    await connectPostgres();
    console.log('   ✅ PostgreSQL connected');
    
    // Run migrations in order (respecting foreign key constraints)
    await migrateUsers();
    await migrateStores();
    await migrateSessions();
    await migrateSubscriptions();
    await migrateSupportTickets();
    await migrateStaff();
    
    // Print summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 Migration Summary');
    console.log('='.repeat(80));
    console.log(`Users:           ${stats.users.migrated} migrated, ${stats.users.skipped} skipped, ${stats.users.errors} errors`);
    console.log(`Stores:          ${stats.stores.migrated} migrated, ${stats.stores.skipped} skipped, ${stats.stores.errors} errors`);
    console.log(`Sessions:        ${stats.sessions.migrated} migrated, ${stats.sessions.skipped} skipped, ${stats.sessions.errors} errors`);
    console.log(`Subscriptions:   ${stats.subscriptions.migrated} migrated, ${stats.subscriptions.skipped} skipped, ${stats.subscriptions.errors} errors`);
    console.log(`Support Tickets: ${stats.supportTickets.migrated} migrated, ${stats.supportTickets.skipped} skipped, ${stats.supportTickets.errors} errors`);
    console.log(`Staff:           ${stats.staff.migrated} migrated, ${stats.staff.skipped} skipped, ${stats.staff.errors} errors`);
    console.log('='.repeat(80));
    
    const totalMigrated = Object.values(stats).reduce((sum, s) => sum + s.migrated, 0);
    const totalErrors = Object.values(stats).reduce((sum, s) => sum + s.errors, 0);
    
    console.log(`\n✅ Total: ${totalMigrated} records migrated`);
    if (totalErrors > 0) {
      console.log(`⚠️  ${totalErrors} errors occurred - check logs above`);
    }
    console.log('\n🎉 Migration complete!');
    
    // Disconnect
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrate();
