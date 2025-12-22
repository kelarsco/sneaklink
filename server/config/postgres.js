/**
 * PostgreSQL Database Connection Setup
 * 
 * PURPOSE:
 * - Connect to PostgreSQL using Prisma Client
 * - Verify connection on app startup
 * - Support local PostgreSQL and Supabase Postgres via DATABASE_URL
 * 
 * USAGE:
 * - Local: DATABASE_URL="postgresql://user:password@localhost:5432/sneaklink"
 * - Supabase: DATABASE_URL="postgresql://postgres:[password]@[host]:5432/postgres?pgbouncer=true"
 * 
 * MIGRATION:
 * - Change ONLY DATABASE_URL to switch from local → Supabase
 * - No code changes required
 */

import { PrismaClient } from '@prisma/client';

// Initialize Prisma Client
// Use singleton pattern to prevent multiple instances
let prisma;

if (process.env.NODE_ENV === 'production') {
  // Production: single instance
  prisma = new PrismaClient({
    log: ['error', 'warn'],
    errorFormat: 'minimal',
  });
} else {
  // Development: only log errors and warnings (not queries to reduce noise)
  // Set PRISMA_LOG_QUERIES=true in .env if you need to debug queries
  prisma = new PrismaClient({
    log: process.env.PRISMA_LOG_QUERIES === 'true' 
      ? ['query', 'error', 'warn'] 
      : ['error', 'warn'],
    errorFormat: 'pretty',
  });
}

/**
 * Connect to PostgreSQL database
 * Verifies connection and logs status
 */
export const connectPostgres = async () => {
  try {
    // Check if DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
      console.error('❌ DATABASE_URL is not set in environment variables!');
      console.error('   Please set DATABASE_URL in your .env file:');
      console.error('   Local: postgresql://user:password@localhost:5432/sneaklink');
      console.error('   Supabase: postgresql://postgres:[password]@[host]:5432/postgres');
      throw new Error('DATABASE_URL not configured');
    }

    // Validate DATABASE_URL format
    const dbUrl = process.env.DATABASE_URL.trim();
    if (!dbUrl.startsWith('postgresql://') && !dbUrl.startsWith('postgres://')) {
      console.error('❌ Invalid DATABASE_URL format!');
      console.error('   Must start with postgresql:// or postgres://');
      throw new Error('Invalid DATABASE_URL format');
    }

    // Mask credentials in logs
    const maskedUrl = dbUrl.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
    console.log('🔄 Connecting to PostgreSQL...');
    console.log(`   URL: ${maskedUrl}`);

    // Test connection
    await prisma.$connect();
    
    // Verify connection with a simple query
    await prisma.$queryRaw`SELECT 1 as connected`;
    
    // Get database info
    const dbInfo = await prisma.$queryRaw`
      SELECT current_database() as database, version() as version
    `;
    
    console.log('✅ PostgreSQL Connected successfully!');
    console.log(`   Database: ${dbInfo[0]?.database || 'unknown'}`);
    console.log(`   Version: ${dbInfo[0]?.version?.split(' ')[0] || 'unknown'}`);
    console.log(`   Prisma Client: Ready`);
    
    return prisma;
  } catch (error) {
    console.error('\n❌ Error connecting to PostgreSQL:');
    console.error(`   Message: ${error.message}`);
    
    // Provide helpful error messages
    if (error.message.includes('P1001') || error.message.includes('ECONNREFUSED')) {
      console.error('\n💡 Connection refused. Check:');
      console.error('   - PostgreSQL server is running');
      console.error('   - DATABASE_URL host and port are correct');
      console.error('   - Firewall allows connections');
    } else if (error.message.includes('P1000') || error.message.includes('authentication')) {
      console.error('\n💡 Authentication failed. Check:');
      console.error('   - Username and password in DATABASE_URL');
      console.error('   - Database user exists and has permissions');
      console.error('   - Password is URL-encoded (e.g., @ becomes %40)');
    } else if (error.message.includes('P1003') || error.message.includes('does not exist')) {
      console.error('\n💡 Database does not exist. Check:');
      console.error('   - Database name in DATABASE_URL is correct');
      console.error('   - Run: createdb sneaklink (or create in pgAdmin)');
      console.error('   - Or run migrations: npx prisma migrate dev');
    } else {
      console.error('\n💡 Troubleshooting steps:');
      console.error('   1. Verify DATABASE_URL in .env file');
      console.error('   2. Ensure PostgreSQL is running');
      console.error('   3. Test connection: psql $DATABASE_URL');
      console.error('   4. Run migrations: npx prisma migrate dev');
    }
    
    throw error;
  }
};

/**
 * Disconnect from database
 * Call this on app shutdown
 */
export const disconnectPostgres = async () => {
  try {
    await prisma.$disconnect();
    console.log('✅ PostgreSQL disconnected');
  } catch (error) {
    console.error('Error disconnecting from PostgreSQL:', error);
  }
};

/**
 * Get Prisma Client instance
 * Use this throughout the app instead of creating new instances
 */
export const getPrisma = () => {
  if (!prisma) {
    throw new Error('Prisma Client not initialized. Call connectPostgres() first.');
  }
  return prisma;
};

// Export Prisma Client as default
export default prisma;
