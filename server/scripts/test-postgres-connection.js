/**
 * Test PostgreSQL Connection
 * 
 * Usage:
 *   npm run postgres:test
 * 
 * This script tests the PostgreSQL connection using Prisma Client
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectPostgres, disconnectPostgres, getPrisma } from '../config/postgres.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function testConnection() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 Testing PostgreSQL Connection');
  console.log('='.repeat(80) + '\n');

  try {
    // Connect to database
    await connectPostgres();
    const prisma = getPrisma();

    // Test queries
    console.log('\n📊 Running test queries...\n');

    // Test 1: Simple query
    console.log('1. Testing simple query...');
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log(`   ✅ Result: ${JSON.stringify(result[0])}`);

    // Test 2: Database info
    console.log('\n2. Getting database info...');
    const dbInfo = await prisma.$queryRaw`
      SELECT 
        current_database() as database,
        current_user as user,
        version() as version
    `;
    console.log(`   ✅ Database: ${dbInfo[0]?.database}`);
    console.log(`   ✅ User: ${dbInfo[0]?.user}`);
    console.log(`   ✅ Version: ${dbInfo[0]?.version?.split(' ')[0]} ${dbInfo[0]?.version?.split(' ')[1]}`);

    // Test 3: Check if tables exist
    console.log('\n3. Checking tables...');
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    console.log(`   ✅ Found ${tables.length} tables:`);
    tables.forEach((table, index) => {
      console.log(`      ${index + 1}. ${table.table_name}`);
    });

    // Test 4: Check Prisma migrations
    console.log('\n4. Checking Prisma migrations...');
    try {
      const migrations = await prisma.$queryRaw`
        SELECT migration_name, applied_steps_count, finished_at
        FROM _prisma_migrations
        ORDER BY finished_at DESC
        LIMIT 5
      `;
      if (migrations.length > 0) {
        console.log(`   ✅ Found ${migrations.length} recent migrations:`);
        migrations.forEach((migration, index) => {
          console.log(`      ${index + 1}. ${migration.migration_name} (${migration.applied_steps_count} steps)`);
        });
      } else {
        console.log('   ⚠️  No migrations found. Run: npm run prisma:migrate');
      }
    } catch (error) {
      console.log('   ⚠️  Migration table not found. Run: npm run prisma:migrate');
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ All tests passed! PostgreSQL connection is working.');
    console.log('='.repeat(80) + '\n');

    // Disconnect
    await disconnectPostgres();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Connection test failed!');
    console.error(`   Error: ${error.message}`);
    console.error('\n💡 Troubleshooting:');
    console.error('   1. Ensure PostgreSQL is running');
    console.error('   2. Check DATABASE_URL in .env file');
    console.error('   3. Run migrations: npm run prisma:migrate');
    console.error('   4. Verify database exists');
    process.exit(1);
  }
}

// Run test
testConnection();
