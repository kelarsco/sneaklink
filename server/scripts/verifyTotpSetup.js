import speakeasy from 'speakeasy';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

/**
 * Verify TOTP setup - check if secret in .env matches QR code
 * This helps identify if secret mismatch is the issue
 * 
 * Usage: node scripts/verifyTotpSetup.js
 */

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '.env');

console.log('\n🔍 TOTP Setup Verification\n');
console.log('='.repeat(60));

// Check if .env exists
let envContent = '';
try {
  envContent = readFileSync(envPath, 'utf-8');
} catch (error) {
  console.error('❌ Could not read .env file');
  console.error('   Make sure server/.env exists');
  process.exit(1);
}

// Extract ADMIN_TOTP_SECRET from .env
const secretMatch = envContent.match(/ADMIN_TOTP_SECRET=(.+)/);
if (!secretMatch) {
  console.error('❌ ADMIN_TOTP_SECRET not found in .env');
  console.error('   Add: ADMIN_TOTP_SECRET=your_secret_here');
  process.exit(1);
}

const secretFromEnv = secretMatch[1].trim();
const secretFromProcess = process.env.ADMIN_TOTP_SECRET?.trim();

console.log('Secret from .env file:', secretFromEnv.substring(0, 10) + '...');
console.log('Secret length:', secretFromEnv.length);
console.log('');

// Generate current code with this secret
const currentCode = speakeasy.totp({
  secret: secretFromEnv,
  encoding: 'base32',
});

console.log('📱 Code that server expects:', currentCode);
console.log('');

// Check if QR code file exists
const qrCodePath = join(__dirname, '..', 'totp-qr-code.png');
try {
  const fs = await import('fs');
  if (fs.existsSync(qrCodePath)) {
    console.log('✅ QR code file exists:', qrCodePath);
    console.log('');
    console.log('⚠️  IMPORTANT: The QR code was generated with a specific secret.');
    console.log('   If you scanned the QR code, the secret in .env MUST match');
    console.log('   the secret that was used to generate that QR code.');
    console.log('');
    console.log('💡 To fix:');
    console.log('   1. Check what secret was used to generate the QR code');
    console.log('   2. Make sure ADMIN_TOTP_SECRET in .env matches that secret');
    console.log('   3. OR regenerate: npm run generate-totp and rescan QR code');
  } else {
    console.log('⚠️  QR code file not found');
    console.log('   Run: npm run generate-totp to create one');
  }
} catch (error) {
  console.log('⚠️  Could not check QR code file');
}

console.log('');
console.log('🧪 Test your Google Authenticator code:');
console.log('   node scripts/testTotp.js YOUR_CODE');
console.log('');
console.log('📋 If codes don\'t match:');
console.log('   1. The secret in .env doesn\'t match what you scanned');
console.log('   2. Regenerate: npm run generate-totp');
console.log('   3. Update .env with the new secret');
console.log('   4. Rescan the new QR code in Google Authenticator');
console.log('');
