import speakeasy from 'speakeasy';
import dotenv from 'dotenv';

/**
 * Comprehensive TOTP debugging tool
 * Shows all possible codes and helps identify issues
 * 
 * Usage: node scripts/debugTotp.js [code]
 */

dotenv.config();

const secret = process.env.ADMIN_TOTP_SECRET;

if (!secret) {
  console.error('❌ ADMIN_TOTP_SECRET not found in .env');
  process.exit(1);
}

const trimmedSecret = secret.trim();
const currentTime = Math.floor(Date.now() / 1000);
const timeStep = Math.floor(currentTime / 30);

console.log('\n🔍 TOTP Comprehensive Debug\n');
console.log('='.repeat(70));
console.log('Configuration:');
console.log('='.repeat(70));
console.log('Secret (first 20 chars):', trimmedSecret.substring(0, 20) + '...');
console.log('Secret length:', trimmedSecret.length);
console.log('Current server time:', new Date().toISOString());
console.log('Unix timestamp:', currentTime);
console.log('Time step:', timeStep);
console.log('='.repeat(70));

// Generate codes for multiple time windows
console.log('\n📱 Generated Codes (for comparison):');
console.log('='.repeat(70));

const timeWindows = [
  { label: 'Previous (-90s)', time: currentTime - 90 },
  { label: 'Previous (-60s)', time: currentTime - 60 },
  { label: 'Previous (-30s)', time: currentTime - 30 },
  { label: 'CURRENT', time: currentTime },
  { label: 'Next (+30s)', time: currentTime + 30 },
  { label: 'Next (+60s)', time: currentTime + 60 },
  { label: 'Next (+90s)', time: currentTime + 90 },
];

timeWindows.forEach(({ label, time }) => {
  const code = speakeasy.totp({
    secret: trimmedSecret,
    encoding: 'base32',
    time: time,
  });
  const step = Math.floor(time / 30);
  const timeStr = new Date(time * 1000).toISOString();
  console.log(`${label.padEnd(20)} | Step: ${step.toString().padStart(6)} | Code: ${code} | Time: ${timeStr}`);
});

console.log('='.repeat(70));

// Test with provided code
const testCode = process.argv[2];

if (testCode) {
  console.log('\n🧪 Testing Your Code:', testCode);
  console.log('='.repeat(70));
  
  // Try base32
  const verifiedBase32 = speakeasy.totp.verify({
    secret: trimmedSecret,
    encoding: 'base32',
    token: testCode,
    window: 10,
    time: currentTime,
  });
  
  console.log('Base32 encoding:', verifiedBase32 ? '✅ VALID' : '❌ INVALID');
  
  // Try ascii
  const verifiedAscii = speakeasy.totp.verify({
    secret: trimmedSecret,
    encoding: 'ascii',
    token: testCode,
    window: 10,
    time: currentTime,
  });
  
  console.log('ASCII encoding:', verifiedAscii ? '✅ VALID' : '❌ INVALID');
  
  // Try hex
  const verifiedHex = speakeasy.totp.verify({
    secret: trimmedSecret,
    encoding: 'hex',
    token: testCode,
    window: 10,
    time: currentTime,
  });
  
  console.log('HEX encoding:', verifiedHex ? '✅ VALID' : '❌ INVALID');
  
  // Check if code matches any expected
  const allExpectedCodes = timeWindows.map(w => 
    speakeasy.totp({ secret: trimmedSecret, encoding: 'base32', time: w.time })
  );
  const matchesExpected = allExpectedCodes.includes(testCode);
  
  console.log('Matches expected codes:', matchesExpected ? '✅ YES' : '❌ NO');
  
  if (!verifiedBase32 && !verifiedAscii && !verifiedHex && !matchesExpected) {
    console.log('\n❌ Code does not match any expected codes');
    console.log('\n💡 Possible issues:');
    console.log('   1. Secret in .env doesn\'t match what you scanned');
    console.log('   2. Time sync issue (phone/server time difference)');
    console.log('   3. Code expired (wait for next 30-second window)');
    console.log('   4. Wrong code entered');
  } else if (matchesExpected && !verifiedBase32) {
    console.log('\n⚠️  Code matches expected but verify() failed');
    console.log('   This might be a time sync issue');
  } else {
    console.log('\n✅ Code is valid!');
  }
} else {
  console.log('\n💡 To test a code from Google Authenticator:');
  console.log('   node scripts/debugTotp.js 123456');
  console.log('\n📋 Instructions:');
  console.log('   1. Look at the "CURRENT" code above');
  console.log('   2. Compare with your Google Authenticator app');
  console.log('   3. If they match → Setup is correct');
  console.log('   4. If they don\'t match → Secret mismatch or time sync issue');
}

console.log('\n');
