/**
 * Check DATABASE_URL Format
 * 
 * Usage:
 *   node scripts/check-database-url.js
 * 
 * This script checks if DATABASE_URL is properly configured
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

console.log('\n' + '='.repeat(80));
console.log('🔍 Checking DATABASE_URL Configuration');
console.log('='.repeat(80) + '\n');

// Check if DATABASE_URL exists
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is NOT set in .env file!\n');
  console.log('📝 To fix this, add to your server/.env file:');
  console.log('');
  console.log('DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/sneaklink?schema=public"');
  console.log('');
  console.log('Replace YOUR_PASSWORD with your actual PostgreSQL password.');
  console.log('');
  console.log('⚠️  Important:');
  console.log('   - Use double quotes around the URL');
  console.log('   - Replace YOUR_PASSWORD with your actual password');
  console.log('   - If password has special characters, URL-encode them:');
  console.log('     @ → %40');
  console.log('     # → %23');
  console.log('     $ → %24');
  console.log('     % → %25');
  console.log('     & → %26');
  console.log('     + → %2B');
  console.log('     / → %2F');
  console.log('     = → %3D');
  console.log('     ? → %3F');
  process.exit(1);
}

// Get DATABASE_URL
const dbUrl = process.env.DATABASE_URL.trim();

console.log('✅ DATABASE_URL is set');
console.log(`   Length: ${dbUrl.length} characters`);

// Check format
console.log('\n🔍 Checking format...');

if (!dbUrl.startsWith('postgresql://') && !dbUrl.startsWith('postgres://')) {
  console.error('❌ Invalid format!');
  console.error(`   Current: ${dbUrl.substring(0, 20)}...`);
  console.error('   Must start with: postgresql:// or postgres://');
  console.log('\n📝 Correct format:');
  console.log('   postgresql://username:password@host:port/database?schema=public');
  process.exit(1);
}

console.log('✅ Format is valid (starts with postgresql:// or postgres://)');

// Parse URL (basic check)
try {
  const url = new URL(dbUrl);
  console.log('\n📊 Parsed URL components:');
  console.log(`   Protocol: ${url.protocol}`);
  console.log(`   Username: ${url.username || '(not set)'}`);
  console.log(`   Password: ${url.password ? '***' + url.password.slice(-2) : '(not set)'}`);
  console.log(`   Host: ${url.hostname}`);
  console.log(`   Port: ${url.port || '5432 (default)'}`);
  console.log(`   Database: ${url.pathname.substring(1) || '(not set)'}`);
  console.log(`   Query: ${url.search || '(none)'}`);
  
  // Check for common issues
  console.log('\n🔍 Checking for common issues...');
  
  if (!url.username) {
    console.error('   ⚠️  Username is missing!');
  } else {
    console.log('   ✅ Username is set');
  }
  
  if (!url.password) {
    console.error('   ⚠️  Password is missing!');
  } else {
    console.log('   ✅ Password is set');
  }
  
  if (!url.pathname || url.pathname === '/') {
    console.error('   ⚠️  Database name is missing!');
  } else {
    console.log(`   ✅ Database name: ${url.pathname.substring(1)}`);
  }
  
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
    console.log('   ✅ Using localhost (local PostgreSQL)');
  }
  
} catch (error) {
  console.error('❌ Failed to parse URL!');
  console.error(`   Error: ${error.message}`);
  console.log('\n📝 Make sure your DATABASE_URL follows this format:');
  console.log('   postgresql://username:password@host:port/database?schema=public');
  process.exit(1);
}

// Check for quotes
if (dbUrl.startsWith('"') || dbUrl.startsWith("'")) {
  console.log('\n⚠️  Warning: DATABASE_URL starts with a quote');
  console.log('   This might cause issues. Remove quotes from .env file.');
  console.log('   In .env, use: DATABASE_URL=postgresql://...');
  console.log('   NOT: DATABASE_URL="postgresql://..."');
}

console.log('\n' + '='.repeat(80));
console.log('✅ DATABASE_URL format check complete!');
console.log('='.repeat(80) + '\n');

console.log('💡 Next steps:');
console.log('   1. If all checks passed, run: npm run postgres:test');
console.log('   2. If password has special characters, URL-encode them');
console.log('   3. Make sure PostgreSQL is running');
console.log('   4. Make sure database exists: npm run db:create:cmd\n');

