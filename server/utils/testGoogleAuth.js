/**
 * Test Google OAuth Configuration
 * Run: node utils/testGoogleAuth.js
 */

import dotenv from 'dotenv';
import { OAuth2Client } from 'google-auth-library';

dotenv.config();

console.log('🔍 Testing Google OAuth Configuration...\n');

// Check environment variables
const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.FRONTEND_URL || 'http://localhost:8080'}/auth/google/callback`;
const jwtSecret = process.env.JWT_SECRET;

console.log('📋 Configuration Status:');
console.log(`   • GOOGLE_CLIENT_ID: ${clientId ? '✅ Set' : '❌ Missing'}`);
if (clientId) {
  console.log(`     Value: ${clientId.slice(0, 30)}...${clientId.slice(-10)}`);
}
console.log(`   • GOOGLE_CLIENT_SECRET: ${clientSecret ? '✅ Set' : '❌ Missing'}`);
if (clientSecret) {
  console.log(`     Value: ${clientSecret.slice(0, 10)}...${clientSecret.slice(-4)}`);
}
console.log(`   • GOOGLE_REDIRECT_URI: ${redirectUri}`);
console.log(`   • JWT_SECRET: ${jwtSecret ? '✅ Set' : '⚠️  Using default (NOT SECURE)'}`);
if (jwtSecret) {
  console.log(`     Length: ${jwtSecret.length} characters`);
}

console.log('\n🧪 Testing OAuth Client Initialization...');

try {
  if (!clientId || !clientSecret) {
    console.log('   ⚠️  Cannot test OAuth client - credentials missing');
    console.log('\n❌ Configuration incomplete!');
    console.log('\n📝 Next Steps:');
    console.log('   1. Get Google Client ID and Secret from:');
    console.log('      https://console.cloud.google.com/apis/credentials');
    console.log('   2. Add them to server/.env file:');
    console.log('      GOOGLE_CLIENT_ID=your_client_id');
    console.log('      GOOGLE_CLIENT_SECRET=your_client_secret');
    console.log('      JWT_SECRET=your_jwt_secret');
    console.log('   3. Generate JWT secret:');
    console.log('      node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
    process.exit(1);
  }

  const client = new OAuth2Client(clientId, clientSecret, redirectUri);
  console.log('   ✅ OAuth client initialized successfully');

  // Test generating auth URL
  const scopes = [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
  ];

  const authUrl = client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
  });

  console.log('   ✅ Auth URL generation works');
  console.log(`   • Sample auth URL: ${authUrl.slice(0, 80)}...`);

  console.log('\n✅✅✅ All tests passed! ✅✅✅');
  console.log('\n📝 Frontend Configuration:');
  console.log('   Make sure you have VITE_GOOGLE_CLIENT_ID in your root .env file:');
  console.log(`   VITE_GOOGLE_CLIENT_ID=${clientId}`);
  console.log('\n🚀 You\'re ready to test the login!');
  console.log('   1. Start backend: cd server && npm run dev');
  console.log('   2. Start frontend: npm run dev');
  console.log('   3. Visit: http://localhost:8080/login');
  console.log('   4. Click "Continue with Google"');

} catch (error) {
  console.error('   ❌ Error:', error.message);
  console.error('\n❌ Configuration test failed!');
  process.exit(1);
}




























