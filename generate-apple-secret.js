#!/usr/bin/env node

/**
 * Generate Apple Client Secret JWT for Supabase
 * 
 * This script generates the JWT token required by Supabase for Apple Sign In.
 * The JWT expires after 180 days (6 months) and must be regenerated.
 * 
 * Usage:
 *   1. Update the configuration values below
 *   2. Run: node generate-apple-secret.js
 *   3. Copy the JWT and paste it into Supabase Dashboard
 * 
 * IMPORTANT: Never commit this file with actual credentials!
 */

const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

// ============================================
// CONFIGURATION - UPDATE THESE VALUES
// ============================================

// Your Apple Developer Team ID (found in Apple Developer Console → Membership)
const TEAM_ID = '5V7H8A99J4';

// Your Service ID (created in Apple Developer Console)
const CLIENT_ID = 'com.zhoueverwin.golfmatchapp.signin';

// Your Key ID (from the .p8 filename, e.g., AuthKey_49KB6PUFUW.p8 → Key ID is 49KB6PUFUW)
const KEY_ID = '49KB6PUFUW';

// Path to your .p8 key file (download from Apple Developer Console → Keys)
const KEY_FILE_PATH = '/Users/miho/Downloads/AuthKey_49KB6PUFUW.p8';

// ============================================
// SCRIPT - NO NEED TO MODIFY BELOW
// ============================================

console.log('🔐 Generating Apple Client Secret JWT...\n');

// Validate configuration
if (!TEAM_ID || TEAM_ID === 'YOUR_TEAM_ID_HERE') {
  console.error('❌ ERROR: Please update TEAM_ID in the script');
  console.error('   Find your Team ID in Apple Developer Console → Membership');
  process.exit(1);
}

if (!CLIENT_ID || CLIENT_ID === 'YOUR_SERVICE_ID_HERE') {
  console.error('❌ ERROR: Please update CLIENT_ID in the script');
  process.exit(1);
}

if (!KEY_ID || KEY_ID === 'YOUR_KEY_ID_HERE') {
  console.error('❌ ERROR: Please update KEY_ID in the script');
  console.error('   The Key ID is in your .p8 filename: AuthKey_[KEY_ID].p8');
  process.exit(1);
}

// Read the private key
let privateKey;
try {
  if (!fs.existsSync(KEY_FILE_PATH)) {
    console.error('❌ ERROR: .p8 key file not found at:', KEY_FILE_PATH);
    console.error('   Please update KEY_FILE_PATH to point to your .p8 file');
    console.error('   Or place your AuthKey_*.p8 file in the Downloads folder');
    process.exit(1);
  }
  privateKey = fs.readFileSync(KEY_FILE_PATH, 'utf8');
  console.log('✅ Successfully read .p8 key file');
} catch (error) {
  console.error('❌ ERROR: Could not read .p8 file:', error.message);
  console.error('   Make sure the file exists at:', KEY_FILE_PATH);
  process.exit(1);
}

// Generate JWT
const now = Math.floor(Date.now() / 1000);
const expirationTime = now + (86400 * 180); // 180 days (6 months)

const payload = {
  iss: TEAM_ID,
  iat: now,
  exp: expirationTime,
  aud: 'https://appleid.apple.com',
  sub: CLIENT_ID,
};

const header = {
  alg: 'ES256',
  kid: KEY_ID,
};

try {
  const clientSecret = jwt.sign(payload, privateKey, {
    algorithm: 'ES256',
    header: header,
  });

  console.log('\n✅ Successfully generated JWT!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('📋 Copy this JWT and paste it into Supabase "Secret Key" field:\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(clientSecret);
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('\n⚠️  IMPORTANT NOTES:');
  console.log('   • This JWT expires in 180 days (6 months)');
  console.log('   • Expires on:', new Date(expirationTime * 1000).toLocaleDateString());
  console.log('   • You MUST regenerate and update it before expiration');
  console.log('   • Keep this JWT secret - do not commit it to version control');
  console.log('\n📝 Configuration details:');
  console.log('   Team ID:', TEAM_ID);
  console.log('   Client ID (Service ID):', CLIENT_ID);
  console.log('   Key ID:', KEY_ID);
  console.log('   Issued at:', new Date(now * 1000).toISOString());
  console.log('   Expires at:', new Date(expirationTime * 1000).toISOString());
  console.log('\n✅ Next steps:');
  console.log('   1. Copy the JWT above');
  console.log('   2. Go to Supabase Dashboard → Authentication → Providers → Apple');
  console.log('   3. Paste it into the "Secret Key (for OAuth)" field');
  console.log('   4. Click Save\n');
  
  // Write to file as backup (but this file is in .gitignore)
  const outputFile = path.join(__dirname, 'apple-client-secret.txt');
  fs.writeFileSync(outputFile, clientSecret);
  console.log('💾 JWT also saved to:', outputFile);
  console.log('   (This file is in .gitignore and will not be committed)\n');
  
} catch (error) {
  console.error('❌ ERROR generating JWT:', error.message);
  console.error('\nPlease check:');
  console.error('   • Your .p8 file is valid');
  console.error('   • The jsonwebtoken package is installed (npm install jsonwebtoken)');
  console.error('   • Your configuration values are correct');
  process.exit(1);
}

