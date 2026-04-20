/**
 * Check SOURCE_DATABASE_URL and TARGET_DATABASE_URL for db:sync-neon
 *
 * Usage: node scripts/check-sync-urls.js
 * (run from server folder, or: npm run db:check-sync-urls)
 *
 * Shows parsed URLs (no passwords) and tests each connection.
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const SOURCE = process.env.SOURCE_DATABASE_URL || process.env.DATABASE_URL;
const TARGET = process.env.TARGET_DATABASE_URL;

function parseUrl(label, url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    return {
      label,
      url,
      user: u.username,
      host: u.hostname,
      port: u.port || '5432',
      database: (u.pathname || '').replace(/^\//, '') || '(none)',
      passwordSet: !!u.password,
    };
  } catch (e) {
    return { label, url, error: e.message };
  }
}

async function testConnection(label, connectionString) {
  if (!connectionString) return { ok: false, error: 'URL not set' };
  const client = new pg.Client({
    connectionString: connectionString.replace(/sslmode=require/, 'sslmode=verify-full'),
  });
  try {
    await client.connect();
    const r = await client.query('SELECT current_user as "user", current_database() as db');
    await client.end();
    return { ok: true, user: r.rows[0].user, db: r.rows[0].db };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('  Check SOURCE and TARGET URLs for db:sync-neon');
  console.log('='.repeat(60) + '\n');

  const sourceInfo = parseUrl('SOURCE (current DB with data)', SOURCE);
  const targetInfo = parseUrl('TARGET (Neon)', TARGET);

  if (sourceInfo) {
    if (sourceInfo.error) {
      console.log('SOURCE_DATABASE_URL (or DATABASE_URL):');
      console.log('   Parse error:', sourceInfo.error);
    } else {
      console.log('SOURCE (where your data lives):');
      console.log('   User:     ', sourceInfo.user);
      console.log('   Host:     ', sourceInfo.host);
      console.log('   Port:     ', sourceInfo.port);
      console.log('   Database: ', sourceInfo.database);
      console.log('   Password: ', sourceInfo.passwordSet ? '*** set ***' : 'MISSING');
    }
  } else {
    console.log('SOURCE: not set (set SOURCE_DATABASE_URL or DATABASE_URL in .env)');
  }

  console.log('');

  if (targetInfo) {
    if (targetInfo.error) {
      console.log('TARGET_DATABASE_URL:');
      console.log('   Parse error:', targetInfo.error);
    } else {
      console.log('TARGET (Neon):');
      console.log('   User:     ', targetInfo.user);
      console.log('   Host:     ', targetInfo.host);
      console.log('   Port:     ', targetInfo.port);
      console.log('   Database: ', targetInfo.database);
      console.log('   Password: ', targetInfo.passwordSet ? '*** set ***' : 'MISSING');
    }
  } else {
    console.log('TARGET: not set (set TARGET_DATABASE_URL in .env to your Neon URL)');
  }

  console.log('\n' + '-'.repeat(60));
  console.log('  Testing connections...');
  console.log('-'.repeat(60) + '\n');

  const sourceTest = await testConnection('SOURCE', SOURCE);
  const targetTest = await testConnection('TARGET', TARGET);

  if (sourceTest.ok) {
    console.log('SOURCE: OK (connected as', sourceTest.user, 'to', sourceTest.db + ')');
  } else {
    console.log('SOURCE: FAILED');
    console.log('   ', sourceTest.error);
    if (sourceTest.error && sourceTest.error.includes('password')) {
      console.log('\n   Fix: Update SOURCE_DATABASE_URL in server/.env with the correct password for user "' + (sourceInfo?.user || 'postgres') + '"');
      console.log('   - Local Postgres: use the password you set for the postgres user');
      console.log('   - Special chars in password: use URL encoding (@ → %40, # → %23, etc.)');
    }
  }

  if (targetTest.ok) {
    console.log('TARGET: OK (connected as', targetTest.user, 'to', targetTest.db + ')');
  } else {
    console.log('TARGET: FAILED');
    console.log('   ', targetTest.error);
    if (targetTest.error && targetTest.error.includes('password')) {
      console.log('\n   Fix: Copy the connection string from Neon dashboard (Connection string → Pooled).');
      console.log('   Neon user is usually neondb_owner, not postgres.');
    }
  }

  console.log('');
  if (sourceTest.ok && targetTest.ok) {
    console.log('Both connections OK. You can run: npm run db:sync-neon');
  } else {
    console.log('Fix the failing connection(s) in server/.env, then run this script again.');
  }
  console.log('='.repeat(60) + '\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
