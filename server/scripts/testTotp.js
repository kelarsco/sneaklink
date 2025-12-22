import speakeasy from 'speakeasy';
import dotenv from 'dotenv';

/**
 * Test TOTP code generation and verification
 * Useful for debugging time sync issues
 * 
 * Usage: node scripts/testTotp.js [code]
 * Example: node scripts/testTotp.js 123456
 */

dotenv.config();

const secret = process.env.ADMIN_TOTP_SECRET;

if (!secret) {
  console.error('❌ ADMIN_TOTP_SECRET not found in .env');
  process.exit(1);
}

const trimmedSecret = secret.trim();

console.log('\n🔐 TOTP Test Tool\n');
console.log('='.repeat(60));
console.log('Secret length:', trimmedSecret.length);
console.log('Current server time:', new Date().toISOString());
console.log('Unix timestamp:', Math.floor(Date.now() / 1000));
console.log('='.repeat(60));

// Generate current code
const currentCode = speakeasy.totp({
  secret: trimmedSecret,
  encoding: 'base32',
});

console.log('\n📱 Current expected code:', currentCode);

// If a code was provided as argument, test it
const testCode = process.argv[2];

if (testCode) {
  console.log('\n🧪 Testing code:', testCode);
  
  const verified = speakeasy.totp.verify({
    secret: trimmedSecret,
    encoding: 'base32',
    token: testCode,
    window: 5,
    time: Math.floor(Date.now() / 1000),
  });

  if (verified) {
    console.log('✅ Code is VALID!');
  } else {
    console.log('❌ Code is INVALID');
    
    // Try with ascii encoding
    const verifiedAscii = speakeasy.totp.verify({
      secret: trimmedSecret,
      encoding: 'ascii',
      token: testCode,
      window: 5,
      time: Math.floor(Date.now() / 1000),
    });
    
    if (verifiedAscii) {
      console.log('✅ Code is VALID with ASCII encoding!');
      console.log('⚠️  Your secret might need to be stored differently');
    } else {
      console.log('❌ Code is also invalid with ASCII encoding');
      console.log('\n💡 Troubleshooting:');
      console.log('1. Make sure your phone\'s time is synchronized');
      console.log('2. Wait for a new code (codes change every 30 seconds)');
      console.log('3. Verify ADMIN_TOTP_SECRET in .env matches the QR code you scanned');
    }
  }
} else {
  console.log('\n💡 To test a code, run:');
  console.log('   node scripts/testTotp.js 123456');
  console.log('\n📋 Next codes (for testing):');
  
  // Show next few codes
  for (let i = 0; i < 3; i++) {
    const futureTime = Math.floor(Date.now() / 1000) + (i * 30);
    const futureCode = speakeasy.totp({
      secret: trimmedSecret,
      encoding: 'base32',
      time: futureTime,
    });
    console.log(`   Code in ${i * 30}s: ${futureCode}`);
  }
}

console.log('\n');
