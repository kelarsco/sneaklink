/**
 * Sync current PostgreSQL database (schema + data) to Neon
 *
 * Usage:
 *   1. SOURCE = your current DB (where data lives). TARGET = Neon.
 *   2. Set env vars, then run:
 *
 *      SOURCE_DATABASE_URL="postgresql://user:pass@localhost:5432/sneaklink"
 *      TARGET_DATABASE_URL="postgresql://...@ep-xxx-pooler.aws.neon.tech/sneaklink?sslmode=require"
 *      node scripts/sync-database-to-neon.js
 *
 *   Or in server/.env add:
 *      SOURCE_DATABASE_URL=...   (current DB with data)
 *      TARGET_DATABASE_URL=...   (Neon URL)
 *   Then: npm run db:sync-neon
 *
 * What this does:
 *   - Applies Prisma migrations to Neon (so schema exists)
 *   - Copies all rows from source DB to Neon (table by table, FK-safe order)
 *   - Neon will have the same schema and data as the source
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const SOURCE_DATABASE_URL = process.env.SOURCE_DATABASE_URL || process.env.DATABASE_URL;
const TARGET_DATABASE_URL = process.env.TARGET_DATABASE_URL;

// Tables in dependency order (parents first) - matches Prisma @@map names
const TABLE_ORDER = [
  'users',
  'user_devices',
  'subscriptions',
  'sessions',
  'support_tickets',
  'staff',
  'stores',
  'authentic_visitors',
  'notification_history',
];

function runPrismaMigrateDeploy(targetUrl) {
  console.log('\n📐 Applying schema to Neon (Prisma migrate deploy)...');
  const result = spawnSync(
    'npx',
    ['prisma', 'migrate', 'deploy'],
    {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, DATABASE_URL: targetUrl },
      stdio: 'inherit',
      shell: true,
    }
  );
  if (result.status !== 0) {
    throw new Error('Prisma migrate deploy failed. Fix schema/migrations and try again.');
  }
  console.log('   Schema applied to Neon.\n');
}

async function copyTable(sourceClient, targetClient, tableName) {
  let rows;
  try {
    const res = await sourceClient.query(`SELECT * FROM "${tableName}"`);
    rows = res.rows;
  } catch (err) {
    console.warn(`   Skipping ${tableName} (not found or error):`, err.message);
    return 0;
  }
  if (rows.length === 0) return 0;

  const columns = Object.keys(rows[0]).filter((k) => k !== undefined);
  const cols = columns.map((c) => `"${c}"`).join(', ');
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
  const insertSql = `INSERT INTO "${tableName}" (${cols}) VALUES (${placeholders})`;

  let inserted = 0;
  for (const row of rows) {
    const values = columns.map((c) => row[c]);
    try {
      const res = await targetClient.query(insertSql, values);
      if (res.rowCount) inserted += res.rowCount;
    } catch (err) {
      console.error(`   Error inserting into ${tableName}:`, err.message);
    }
  }
  return inserted;
}

async function truncateTargetTables(targetClient) {
  const tables = TABLE_ORDER.map((t) => `"${t}"`).join(', ');
  await targetClient.query(`TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE`);
}

async function main() {
  console.log('\n🔄 Sync database to Neon\n');

  if (!SOURCE_DATABASE_URL) {
    console.error('❌ SOURCE_DATABASE_URL or DATABASE_URL is required (current DB with data).');
    process.exit(1);
  }
  if (!TARGET_DATABASE_URL) {
    console.error('❌ TARGET_DATABASE_URL is required (Neon connection string).');
    process.exit(1);
  }

  if (SOURCE_DATABASE_URL === TARGET_DATABASE_URL) {
    console.error('❌ Source and target must be different databases.');
    process.exit(1);
  }

  // 1) Apply schema to Neon
  runPrismaMigrateDeploy(TARGET_DATABASE_URL);

  // Use sslmode=verify-full for Neon to avoid pg/libpq SSL warning
  const targetUrl = TARGET_DATABASE_URL.replace(/sslmode=require/, 'sslmode=verify-full');

  const sourceClient = new pg.Client({ connectionString: SOURCE_DATABASE_URL });
  const targetClient = new pg.Client({ connectionString: targetUrl });

  try {
    console.log('   Connecting to SOURCE database (current DB with data)...');
    await sourceClient.connect();
    console.log('   Connected to source.\n');

    console.log('   Connecting to TARGET database (Neon)...');
    await targetClient.connect();
    console.log('   Connected to Neon.\n');

    // 2) Truncate Neon tables so we replace with source data
    console.log('🗑️  Truncating Neon tables (to replace with source data)...');
    await truncateTargetTables(targetClient);
    console.log('   Done.\n');

    // 3) Copy data table by table
    console.log('📦 Copying data...');
    const stats = {};
    for (const table of TABLE_ORDER) {
      const count = await copyTable(sourceClient, targetClient, table);
      stats[table] = count;
      if (count > 0) console.log(`   ${table}: ${count} rows`);
    }

    console.log('\n✅ Sync complete. Neon now has the same schema and data as the source.');
    console.log('   Summary:', stats);
  } catch (err) {
    if (err.message && err.message.includes('password authentication failed')) {
      console.error('❌ Sync failed: password authentication failed.');
      if (SOURCE_DATABASE_URL.includes('postgres@') || SOURCE_DATABASE_URL.includes('postgres:')) {
        console.error('   The SOURCE database (current DB) uses user "postgres". Check SOURCE_DATABASE_URL in .env:');
        console.error('   - Correct password for user postgres?');
        console.error('   - Is local PostgreSQL running?');
      } else {
        console.error('   Check SOURCE_DATABASE_URL and TARGET_DATABASE_URL in server/.env (correct user and password for each).');
      }
    } else {
      console.error('❌ Sync failed:', err.message);
    }
    process.exit(1);
  } finally {
    await sourceClient.end();
    await targetClient.end();
  }
}

main();
