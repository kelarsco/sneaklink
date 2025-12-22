import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { writeFileSync } from 'fs';

/**
 * Generate TOTP secret for admin authentication
 * Run this script once to generate a secret and QR code
 * 
 * Usage: node scripts/generateTotpSecret.js
 */

const secret = speakeasy.generateSecret({
  name: 'SneakLink Admin',
  issuer: 'SneakLink',
  length: 32,
});

console.log('\n🔐 TOTP Secret Generated!\n');
console.log('='.repeat(60));
console.log('⚠️  IMPORTANT: Copy this EXACT secret to your server/.env file');
console.log('='.repeat(60));
console.log(`ADMIN_TOTP_SECRET=${secret.base32}\n`);

console.log('Manual Entry Key (if QR code doesn\'t work):');
console.log(secret.base32);
console.log('\n');

// Save secret to a file for reference (but don't commit it!)
const secretFilePath = join(__dirname, '..', '.totp-secret.txt');
try {
  writeFileSync(secretFilePath, `TOTP Secret Generated: ${new Date().toISOString()}\nSecret: ${secret.base32}\n\n⚠️  DO NOT COMMIT THIS FILE TO GIT!\n⚠️  This file is for reference only.\n`, 'utf-8');
  console.log('💾 Secret saved to: .totp-secret.txt (for reference only)');
  console.log('   ⚠️  DO NOT commit this file to git!\n');
} catch (error) {
  console.log('⚠️  Could not save secret to file (not critical)');
}

// Generate QR code
QRCode.toDataURL(secret.otpauth_url)
  .then((qrCodeUrl) => {
    console.log('📱 QR Code (base64):');
    console.log('Copy this URL and open in browser to see QR code:');
    console.log(qrCodeUrl.substring(0, 100) + '...\n');
    
    // Also save QR code to file
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const qrCodePath = join(__dirname, '..', 'totp-qr-code.png');
    
    QRCode.toFile(qrCodePath, secret.otpauth_url, (err) => {
      if (err) {
        console.error('Error saving QR code:', err);
      } else {
        console.log(`✅ QR code saved to: ${qrCodePath}`);
        console.log('\n📱 Next Steps:');
        console.log('1. Open Google Authenticator app on your phone');
        console.log(`2. Scan the QR code from ${qrCodePath}`);
        console.log('3. Add ADMIN_TOTP_SECRET to server/.env');
        console.log('4. Restart your server');
        console.log('5. Use the 6-digit code from Google Authenticator to login\n');
      }
    });
  })
  .catch((err) => {
    console.error('Error generating QR code:', err);
  });
