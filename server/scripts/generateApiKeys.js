#!/usr/bin/env node

/**
 * Generate secure API keys for authentication
 * Run: node scripts/generateApiKeys.js
 */

import crypto from 'crypto';

console.log('\n🔐 Generating Secure API Keys for SneakLink\n');
console.log('='.repeat(60));

// Generate API key
const apiKey = crypto.randomBytes(32).toString('hex');
const adminApiKey = crypto.randomBytes(32).toString('hex');

console.log('\n📝 Add these to your .env file:\n');
console.log(`API_KEY=${apiKey}`);
console.log(`ADMIN_API_KEY=${adminApiKey}`);

console.log('\n⚠️  IMPORTANT SECURITY NOTES:');
console.log('   1. Never commit these keys to version control');
console.log('   2. Use different keys for development and production');
console.log('   3. Rotate keys regularly (every 90 days recommended)');
console.log('   4. Store keys securely (use secret management in production)');
console.log('   5. Never share keys publicly or in logs\n');

console.log('✅ Keys generated successfully!\n');

