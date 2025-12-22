/**
 * Google OAuth Test Script
 * Run this to test if your backend Google OAuth is configured correctly
 * 
 * Usage: node test-google-oauth.js
 */

import dotenv from 'dotenv';
import { OAuth2Client } from 'google-auth-library';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from server/.env
dotenv.config({ path: join(__dirname, 'server', '.env') });

console.log('🔍 Testing Google OAuth Configuration...\n');

// Check environment variables
const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:8080/auth/google/callback';
const jwtSecret = process.env.JWT_SECRET;

console.log('📋 Configuration Check:');
console.log('  Client ID:', clientId ? `${clientId.substring(0, 20)}...` : '❌ NOT SET');
console.log('  Client Secret:', clientSecret ? `${clientSecret.substring(0, 10)}...` : '❌ NOT SET');
console.log('  Redirect URI:', redirectUri);
console.log('  JWT Secret:', jwtSecret ? '✅ SET' : '❌ NOT SET');
console.log('');

// Validate configuration
if (!clientId) {
  console.error('❌ ERROR: GOOGLE_CLIENT_ID is not set in server/.env');
  process.exit(1);
}

if (!clientSecret) {
  console.error('❌ ERROR: GOOGLE_CLIENT_SECRET is not set in server/.env');
  process.exit(1);
}

if (!jwtSecret) {
  console.error('⚠️  WARNING: JWT_SECRET is not set. Generate one with:');
  console.error('   node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
}

// Test OAuth client creation
try {
  const client = new OAuth2Client(clientId, clientSecret, redirectUri);
  console.log('✅ OAuth2Client created successfully');
  
  // Generate auth URL to test
  const authUrl = client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ],
    prompt: 'consent',
  });
  
  console.log('✅ Auth URL generated successfully');
  console.log('\n📝 Next Steps:');
  console.log('1. Make sure these URLs are in Google Cloud Console:');
  console.log('   - Authorized JavaScript origins: http://localhost:8080');
  console.log('   - Authorized redirect URIs:', redirectUri);
  console.log('2. Test the auth URL:', authUrl.substring(0, 100) + '...');
  console.log('\n✅ Backend configuration looks good!');
  
} catch (error) {
  console.error('❌ ERROR creating OAuth client:', error.message);
  process.exit(1);
}
