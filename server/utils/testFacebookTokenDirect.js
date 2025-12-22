/**
 * Direct Test of Facebook Ads Library API Token
 * Tests a specific token to verify it can access Ads Library
 * Run: node utils/testFacebookTokenDirect.js
 */

import axios from 'axios';

// Test token provided by user
const TEST_TOKEN = process.argv[2] || 'EAAQHqBCjLT4BQIuvLZA31Y7sSIY1KQEEsdfRyFOC1OYr6jYeI6wdpyt9dyyZC35Ic28EW4e0wqRvSZBYoaZCvvZCC2xrVNVoRefI5f58ZAexUodHRgs0d58WwrhMjD2fTlqWub5bbWbz2N66chzOLSQ2ZBLglNOjicZCfg4yZAZCDIBOPFkZBhZBUKhIZCNFDHZBYNZBTZBxyXNxW0EjRZCJZCDU4qzbR95cyoJEpqAmZC1fGwdk4UAgXTyYvTpfeB0';

async function testToken() {
  console.log('🔍 Testing Facebook Ads Library API Token...\n');
  console.log(`📋 Token: ${TEST_TOKEN.slice(0, 30)}...${TEST_TOKEN.slice(-20)}\n`);

  // Test 1: Verify token and get user info
  console.log('🧪 Test 1: Verifying token and getting user info...');
  try {
    const meResponse = await axios.get('https://graph.facebook.com/v24.0/me', {
      params: {
        fields: 'id,name,email',
        access_token: TEST_TOKEN,
      },
    });

    console.log('   ✅ Token is valid!');
    console.log(`   • User ID: ${meResponse.data.id}`);
    console.log(`   • Name: ${meResponse.data.name || 'N/A'}`);
    console.log(`   • Email: ${meResponse.data.email || 'N/A'}\n`);
  } catch (error) {
    console.error('   ❌ Token verification failed!');
    if (error.response) {
      const errorData = error.response.data?.error || {};
      console.error(`   • Error: ${errorData.message || JSON.stringify(error.response.data)}`);
      console.error(`   • Code: ${errorData.code}`);
      console.error(`   • Type: ${errorData.type}`);
      
      if (errorData.code === 190) {
        console.error('\n   💡 Token is invalid or expired. Generate a new one.');
      }
    } else {
      console.error(`   • Error: ${error.message}`);
    }
    process.exit(1);
  }

  // Test 2: Check token permissions
  console.log('🧪 Test 2: Checking token permissions...');
  try {
    const debugResponse = await axios.get('https://graph.facebook.com/v24.0/debug_token', {
      params: {
        input_token: TEST_TOKEN,
        access_token: TEST_TOKEN,
      },
    });

    const tokenData = debugResponse.data?.data || {};
    console.log('   ✅ Token debug info retrieved');
    console.log(`   • App ID: ${tokenData.app_id || 'N/A'}`);
    console.log(`   • User ID: ${tokenData.user_id || 'N/A'}`);
    console.log(`   • Valid: ${tokenData.is_valid ? 'Yes' : 'No'}`);
    console.log(`   • Expires at: ${tokenData.expires_at ? new Date(tokenData.expires_at * 1000).toLocaleString() : 'Never'}`);
    
    const scopes = tokenData.scopes || [];
    console.log(`   • Permissions (${scopes.length}):`, scopes.join(', ') || 'None');
    
    const hasAdsRead = scopes.includes('ads_read');
    console.log(`   • ads_read permission: ${hasAdsRead ? '✅ YES' : '❌ NO'}`);
    
    if (!hasAdsRead) {
      console.log('\n   ⚠️  WARNING: Token does NOT have "ads_read" permission!');
      console.log('   You need to add this permission in Graph API Explorer:');
      console.log('   https://developers.facebook.com/tools/explorer/');
    }
    console.log('');
  } catch (error) {
    console.error('   ⚠️  Could not check permissions:', error.response?.data?.error?.message || error.message);
    console.log('');
  }

  // Test 3: Test Ads Library API with Shopify search
  console.log('🧪 Test 3: Testing Ads Library API with "shopify" search...');
  try {
    const adsResponse = await axios.get('https://graph.facebook.com/v24.0/ads_archive', {
      params: {
        access_token: TEST_TOKEN,
        search_terms: 'shopify',
        ad_active_status: 'ACTIVE',
        ad_reached_countries: 'US',
        fields: 'ad_snapshot_url,website_url,page_name',
        limit: 5, // Test with 5 ads
      },
    });

    const ads = adsResponse.data?.data || [];
    console.log(`   ✅ Ads Library API is WORKING!`);
    console.log(`   • Found ${ads.length} ads`);
    console.log(`   • API Response: Success\n`);
    
    if (ads.length > 0) {
      console.log('   📊 Sample ad data:');
      ads.slice(0, 3).forEach((ad, index) => {
        console.log(`   ${index + 1}. Page: ${ad.page_name || 'N/A'}`);
        console.log(`      Website: ${ad.website_url || 'N/A'}`);
        console.log(`      Snapshot: ${ad.ad_snapshot_url ? 'Yes ✅' : 'No'}`);
      });
    }

    // Check pagination
    if (adsResponse.data?.paging?.next) {
      console.log('\n   ✅ Pagination available (can fetch more ads)');
    }

    console.log('\n✅✅✅ SUCCESS! ✅✅✅');
    console.log('Your token is working and can access Facebook Ads Library!');
    console.log('Once your app is verified, you can use this token for scraping.\n');
    
    console.log('📝 Next Steps:');
    console.log('   1. Add this token to your .env file:');
    console.log(`      FACEBOOK_ACCESS_TOKEN=${TEST_TOKEN}`);
    console.log('   2. Update server/.env with your App ID and Secret');
    console.log('   3. Start your server: npm run dev');
    console.log('   4. The scraper will automatically use this token\n');
    
  } catch (error) {
    console.error('   ❌ Ads Library API test FAILED!');
    if (error.response) {
      const errorData = error.response.data?.error || {};
      console.error(`   • Error: ${errorData.message || JSON.stringify(error.response.data)}`);
      console.error(`   • Code: ${errorData.code}`);
      console.error(`   • Type: ${errorData.type}`);
      
      if (errorData.code === 190) {
        console.error('\n   💡 Token expired or invalid. Generate a new token.');
        console.error('   Visit: https://developers.facebook.com/tools/explorer/');
      } else if (errorData.code === 10) {
        console.error('\n   💡 Missing permissions. Add "ads_read" permission:');
        console.error('   1. Go to: https://developers.facebook.com/tools/explorer/');
        console.error('   2. Select your app');
        console.error('   3. Add permission: ads_read');
        console.error('   4. Generate new token');
      } else if (errorData.code === 200) {
        console.error('\n   💡 App needs to be verified for Ads Library access.');
        console.error('   This token may work once your app is verified.');
        console.error('   For testing, you can use a token from Graph API Explorer.');
      } else if (errorData.code === 4) {
        console.error('\n   💡 Application request limit reached.');
        console.error('   Wait a few minutes and try again.');
      }
    } else {
      console.error(`   • Error: ${error.message}`);
    }
    console.log('\n⚠️  Token may work once app is verified, but currently cannot access Ads Library.\n');
  }
}

testToken().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});

