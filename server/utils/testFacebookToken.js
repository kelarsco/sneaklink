/**
 * Test Facebook Ads Library API Token
 * Run: node utils/testFacebookToken.js
 */

import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
const appId = process.env.FACEBOOK_APP_ID;
const appSecret = process.env.FACEBOOK_APP_SECRET;

async function testFacebookToken() {
  console.log('🔍 Testing Facebook Ads Library API Token...\n');

  if (!accessToken) {
    console.error('❌ FACEBOOK_ACCESS_TOKEN not found in .env file');
    console.log('   Please add FACEBOOK_ACCESS_TOKEN to your .env file');
    process.exit(1);
  }

  console.log('📋 Configuration:');
  console.log(`   • App ID: ${appId || 'Not set'}`);
  console.log(`   • App Secret: ${appSecret ? '***' + appSecret.slice(-4) : 'Not set'}`);
  console.log(`   • Access Token: ${accessToken.slice(0, 20)}...${accessToken.slice(-10)}\n`);

  // Test 1: Check token validity and get user info
  console.log('🧪 Test 1: Verifying token and getting user info...');
  try {
    const meResponse = await axios.get('https://graph.facebook.com/v24.0/me', {
      params: {
        fields: 'id,name',
        access_token: accessToken,
      },
    });

    console.log('   ✅ Token is valid!');
    console.log(`   • User ID: ${meResponse.data.id}`);
    console.log(`   • Name: ${meResponse.data.name}\n`);
  } catch (error) {
    console.error('   ❌ Token verification failed!');
    if (error.response) {
      console.error(`   • Error: ${error.response.data.error?.message || JSON.stringify(error.response.data)}`);
      console.error(`   • Code: ${error.response.data.error?.code}`);
      console.error(`   • Type: ${error.response.data.error?.type}`);
    } else {
      console.error(`   • Error: ${error.message}`);
    }
    process.exit(1);
  }

  // Test 2: Test Ads Library API with Shopify search
  console.log('🧪 Test 2: Testing Ads Library API with "shopify" search...');
  try {
    const adsResponse = await axios.get('https://graph.facebook.com/v24.0/ads_archive', {
      params: {
        access_token: accessToken,
        search_terms: 'shopify',
        ad_active_status: 'ACTIVE',
        ad_reached_countries: 'US',
        fields: 'ad_snapshot_url,website_url,page_name',
        limit: 5, // Just test with 5 ads
      },
    });

    const ads = adsResponse.data?.data || [];
    console.log(`   ✅ Ads Library API is working!`);
    console.log(`   • Found ${ads.length} ads`);
    
    if (ads.length > 0) {
      console.log('\n   📊 Sample ad data:');
      ads.slice(0, 3).forEach((ad, index) => {
        console.log(`   ${index + 1}. Page: ${ad.page_name || 'N/A'}`);
        console.log(`      Website: ${ad.website_url || 'N/A'}`);
        console.log(`      Snapshot: ${ad.ad_snapshot_url ? 'Yes' : 'No'}`);
      });
    }

    // Check pagination
    if (adsResponse.data?.paging?.next) {
      console.log('\n   ✅ Pagination available (can fetch more ads)');
    }

    console.log('\n✅ All tests passed! Facebook Ads Library integration is ready to use.');
    console.log('\n📝 Next steps:');
    console.log('   1. The scraper will automatically use this token');
    console.log('   2. Run your scraping job to start collecting Shopify stores');
    console.log('   3. Check your MongoDB database for new stores from Facebook Ads Library');
  } catch (error) {
    console.error('   ❌ Ads Library API test failed!');
    if (error.response) {
      console.error(`   • Error: ${error.response.data.error?.message || JSON.stringify(error.response.data)}`);
      console.error(`   • Code: ${error.response.data.error?.code}`);
      console.error(`   • Type: ${error.response.data.error?.type}`);
      
      if (error.response.data.error?.code === 190) {
        console.error('\n   💡 Token may be expired. Generate a new token at:');
        console.error('      https://developers.facebook.com/tools/explorer/');
      } else if (error.response.data.error?.code === 10) {
        console.error('\n   💡 Missing permissions. Make sure your app has "ads_read" permission.');
      }
    } else {
      console.error(`   • Error: ${error.message}`);
    }
    process.exit(1);
  }
}

testFacebookToken().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});


