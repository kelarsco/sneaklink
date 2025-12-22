import axios from 'axios';
import { checkShopifyFingerprints } from './shopifyFingerprintScraper.js';
import { looksLikeShopifyStore } from './shopifyUrlValidator.js';
import { scrapeGoogleAds } from './googleAdsScraper.js';
import { scrapePinterestOptimized } from './pinterestScraper.js';

/**
 * Social Media Scraper for TikTok, Instagram, Pinterest
 * Finds new Shopify stores from social media posts and ads
 */

/**
 * Scrape TikTok for Shopify store links
 * Uses optimized RapidAPI Scraptik integration
 */
export const scrapeTikTok = async () => {
  const stores = [];
  
  try {
    console.log('📱 Scraping TikTok for Shopify stores...');
    
    // Method 1: Use optimized RapidAPI Scraptik scraper (if API key available)
    if (process.env.RAPIDAPI_KEY || process.env.TIKTOK_RAPIDAPI_KEY) {
      try {
        const { scrapeTikTokOptimized } = await import('./tiktokScraper.js');
        const rapidApiStores = await scrapeTikTokOptimized();
        stores.push(...rapidApiStores);
        console.log(`   ✅ RapidAPI Scraptik: Found ${rapidApiStores.length} stores`);
      } catch (error) {
        console.error('   Error with RapidAPI Scraptik:', error.message);
      }
    }
    
    // Method 2: TikTok Ads Library (requires Facebook API)
    if (process.env.FACEBOOK_ACCESS_TOKEN) {
      try {
        // TikTok ads are accessible via Facebook Ads Library
        // This requires Facebook Marketing API access
        console.log('   Checking TikTok Ads Library...');
        
        // Placeholder for TikTok Ads Library scraping
        // Actual implementation would use Facebook Graph API
      } catch (error) {
        console.error('   Error with TikTok Ads Library:', error.message);
      }
    }
    
    // Method 3: Legacy TikTok API (if available)
    if (process.env.TIKTOK_API_KEY && !process.env.RAPIDAPI_KEY) {
      try {
        console.log('   Using legacy TikTok API...');
        // Legacy implementation if needed
      } catch (error) {
        console.error('   Error with legacy TikTok API:', error.message);
      }
    }
    
    console.log(`   Found ${stores.length} total stores from TikTok`);
  } catch (error) {
    console.error('Error scraping TikTok:', error.message);
  }
  
  return stores;
};

/**
 * Scrape Instagram for Shopify store links
 */
export const scrapeInstagram = async () => {
  const stores = [];
  const seenUrls = new Set();
  
  try {
    console.log('📷 Scraping Instagram for Shopify stores...');
    
    if (process.env.INSTAGRAM_ACCESS_TOKEN) {
      try {
        // Use Instagram Basic Display API or Graph API
        const keywords = [
          'shop now',
          'link in bio',
          'new store',
          'just launched',
        ];
        
        for (const keyword of keywords) {
          try {
            // Search Instagram posts
            // Extract links from captions and bio links
            // This requires Instagram API access
            
            console.log(`   Searching Instagram for: "${keyword}"...`);
            
            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 2000));
          } catch (error) {
            console.error(`   Error searching Instagram for "${keyword}":`, error.message);
          }
        }
      } catch (error) {
        console.error('   Error with Instagram API:', error.message);
      }
    } else {
      console.log('   ⚠️  Instagram access token not configured');
    }
    
    console.log(`   Found ${stores.length} stores from Instagram`);
  } catch (error) {
    console.error('Error scraping Instagram:', error.message);
  }
  
  return stores;
};

/**
 * Scrape Pinterest for Shopify store links
 * Uses optimized Pinterest API scraper
 */
export const scrapePinterest = async () => {
  try {
    if (process.env.PINTEREST_ACCESS_TOKEN) {
      return await scrapePinterestOptimized();
    } else {
      console.log('   ⚠️  Pinterest access token not configured');
      return [];
    }
  } catch (error) {
    console.error('Error scraping Pinterest:', error.message);
    return [];
  }
};

/**
 * Scrape Facebook Ads Library for Shopify stores
 * This includes TikTok ads since TikTok uses Facebook's ad platform
 */
export const scrapeFacebookAdsLibrary = async () => {
  const stores = [];
  const seenUrls = new Set();
  
  try {
    console.log('📢 Scraping Facebook Ads Library for Shopify stores...');
    
    if (process.env.FACEBOOK_ACCESS_TOKEN) {
      try {
        const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
        const apiVersion = 'v24.0';
        const baseUrl = `https://graph.facebook.com/${apiVersion}/ads_archive`;

        // Facebook Ads Library API
        // Search for ads with Shopify-related keywords
        const searchTerms = [
          'shopify',
          'online store',
          'shop now',
          'new store',
        ];
        
        for (const term of searchTerms) {
          try {
            console.log(`   Searching Facebook Ads Library for: "${term}"...`);

            const params = {
              access_token: accessToken,
              search_terms: term,
              ad_active_status: 'ACTIVE',
              ad_reached_countries: 'US',
              fields: [
                'ad_snapshot_url',
                'website_url',
                'page_name',
              ].join(','),
              limit: 100,
            };

            const response = await axios.get(baseUrl, { params });
            const ads = response.data?.data || [];

            console.log(`      • Received ${ads.length} ads for term "${term}"`);
            
            // Log pagination info if available
            if (response.data?.paging?.next) {
              console.log(`      • More ads available (pagination supported)`);
            }

            for (const ad of ads) {
              const candidateUrls = new Set();

              if (ad.website_url) {
                candidateUrls.add(ad.website_url);
              }

              // In some cases the snapshot URL may directly point to the landing page,
              // but often it is a Facebook wrapper. We still keep it as a fallback.
              if (ad.ad_snapshot_url) {
                candidateUrls.add(ad.ad_snapshot_url);
              }

              for (const url of candidateUrls) {
                if (!url) continue;
                if (seenUrls.has(url)) continue;

                // Quick heuristic filter before expensive fingerprinting
                if (!looksLikeShopifyStore(url)) continue;

                seenUrls.add(url);
                stores.push({
                  url,
                  source: 'facebook_ads_library',
                  platform: 'facebook',
                  pageName: ad.page_name || null,
                  adSnapshotUrl: ad.ad_snapshot_url || null,
                  metadata: {
                    searchTerm: term,
                  },
                });
              }
            }

            // Simple rate limiting between queries
            await new Promise(resolve => setTimeout(resolve, 3000));
          } catch (error) {
            if (error.response) {
              const errorData = error.response.data?.error || {};
              console.error(`   ❌ Error searching Facebook Ads for "${term}":`, errorData.message || error.message);
              if (errorData.code === 190) {
                console.error(`      Token expired or invalid. Please update FACEBOOK_ACCESS_TOKEN in .env`);
              } else if (errorData.code === 10) {
                console.error(`      Missing permissions. App needs "ads_read" permission.`);
              }
            } else {
              console.error(`   ❌ Error searching Facebook Ads for "${term}":`, error.message);
            }
          }
        }
      } catch (error) {
        console.error('   Error with Facebook Ads Library:', error.message);
      }
    } else {
      console.log('   ⚠️  Facebook access token not configured');
    }
    
    console.log(`   Found ${stores.length} stores from Facebook Ads Library`);
  } catch (error) {
    console.error('Error scraping Facebook Ads Library:', error.message);
  }
  
  return stores;
};

/**
 * Scrape Google Ads Library for Shopify stores
 * Uses RapidAPI Google Ads Library integration
 */
export const scrapeGoogleAdsLibrary = async () => {
  const stores = [];
  
  try {
    console.log('📢 Scraping Google Ads Library for Shopify stores...');
    
    // Use optimized Google Ads Library scraper
    if (process.env.RAPIDAPI_KEY || process.env.GOOGLE_ADS_RAPIDAPI_KEY) {
      try {
        const googleAdsStores = await scrapeGoogleAds();
        stores.push(...googleAdsStores);
        console.log(`   ✅ Google Ads Library: Found ${googleAdsStores.length} stores`);
      } catch (error) {
        console.error('   Error with Google Ads Library:', error.message);
      }
    } else {
      console.log('   ⚠️  Google Ads Library RapidAPI key not configured');
    }
    
    return stores;
  } catch (error) {
    console.error('Error scraping Google Ads Library:', error.message);
    return stores;
  }
};

/**
 * Main function to scrape all social media platforms
 */
export const scrapeSocialMediaForStores = async () => {
  const allStores = [];
  
  try {
    console.log('🌐 Scraping social media platforms for Shopify stores...');
    
    const [tiktokStores, instagramStores, pinterestStores, facebookAdsStores, googleAdsStores] = await Promise.allSettled([
      scrapeTikTok(),
      scrapeInstagram(),
      scrapePinterest(),
      scrapeFacebookAdsLibrary(),
      scrapeGoogleAdsLibrary(),
    ]).then(results => results.map(r => r.status === 'fulfilled' ? r.value : []));
    
    allStores.push(
      ...tiktokStores,
      ...instagramStores,
      ...pinterestStores,
      ...facebookAdsStores,
      ...googleAdsStores
    );
    
    // Verify stores with fingerprint detection
    console.log(`\n🔍 Verifying ${allStores.length} stores from social media...`);
    const verifiedStores = [];
    
    for (const store of allStores) {
      try {
        const fingerprint = await checkShopifyFingerprints(store.url);
        if (fingerprint.isShopify) {
          verifiedStores.push({
            ...store,
            confidence: fingerprint.confidence,
            verified: true,
          });
        }
      } catch (error) {
        // Skip verification errors
        continue;
      }
    }
    
    console.log(`   Verified ${verifiedStores.length} Shopify stores from social media`);
    
    return verifiedStores;
  } catch (error) {
    console.error('Error in social media scraping:', error.message);
    return allStores;
  }
};

