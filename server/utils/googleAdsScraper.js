import axios from 'axios';
import { looksLikeShopifyStore } from './shopifyUrlValidator.js';

/**
 * Google Ads Library Scraper
 * Extracts Shopify store URLs from Google ads using RapidAPI
 */

// Extract RapidAPI credentials from environment
const getRapidApiConfig = () => {
  const apiKey = process.env.RAPIDAPI_KEY || process.env.GOOGLE_ADS_RAPIDAPI_KEY;
  
  if (!apiKey) {
    return null;
  }
  
  return { 
    apiKey,
    host: process.env.GOOGLE_ADS_RAPIDAPI_HOST || 'google-ads-library.p.rapidapi.com'
  };
};

/**
 * Generic function to make a request to Google Ads Library API
 */
const makeRequest = async (endpoint, params = {}, config = null) => {
  const apiConfig = config || getRapidApiConfig();
  
  if (!apiConfig) {
    return null;
  }

  try {
    const response = await axios.request({
      method: 'GET',
      url: `https://${apiConfig.host}/${endpoint}`,
      params,
      headers: {
        'x-rapidapi-key': apiConfig.apiKey,
        'x-rapidapi-host': apiConfig.host,
      },
      timeout: 30000, // 30 second timeout
    });
    return response.data;
  } catch (error) {
    if (error.response?.status === 429) {
      console.warn(`   Rate limit hit for ${endpoint}, waiting...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
      return null;
    }
    console.error(`   Error fetching ${endpoint}:`, error.response?.status || error.message);
    return null;
  }
};

/**
 * Extract URLs from ad data
 */
const extractUrlsFromAd = (ad) => {
  const urls = [];
  
  if (!ad) {
    return urls;
  }
  
  // Extract from ad creative URLs
  if (ad.ad_creative_bodies) {
    for (const body of ad.ad_creative_bodies) {
      urls.push(...extractUrlsFromText(body));
    }
  }
  
  // Extract from ad creative titles
  if (ad.ad_creative_titles) {
    for (const title of ad.ad_creative_titles) {
      urls.push(...extractUrlsFromText(title));
    }
  }
  
  // Extract from landing page URL
  if (ad.ad_snapshot_url) {
    urls.push(ad.ad_snapshot_url);
  }
  
  // Extract from page URL
  if (ad.page_url) {
    urls.push(ad.page_url);
  }
  
  // Extract from page name (sometimes contains URLs)
  if (ad.page_name) {
    urls.push(...extractUrlsFromText(ad.page_name));
  }
  
  // Extract from advertiser information
  if (ad.advertiser_name) {
    urls.push(...extractUrlsFromText(ad.advertiser_name));
  }
  
  // Extract from ad creative link descriptions
  if (ad.ad_creative_link_descriptions) {
    for (const desc of ad.ad_creative_link_descriptions) {
      urls.push(...extractUrlsFromText(desc));
    }
  }
  
  // Extract from ad creative link titles
  if (ad.ad_creative_link_titles) {
    for (const title of ad.ad_creative_link_titles) {
      urls.push(...extractUrlsFromText(title));
    }
  }
  
  // Extract from any additional fields that might contain URLs
  if (ad.ad_delivery_start_time) {
    // Check if delivery info contains URLs (unlikely but check)
  }
  
  return urls;
};

/**
 * Extract URLs from text content
 */
const extractUrlsFromText = (text) => {
  if (!text || typeof text !== 'string') {
    return [];
  }
  
  // Match URLs (http/https)
  const urlRegex = /(https?:\/\/[^\s\)]+)/gi;
  const urls = text.match(urlRegex) || [];
  
  // Clean and normalize URLs
  return urls.map(url => {
    // Remove trailing punctuation
    return url.replace(/[.,;:!?\)]+$/, '').trim();
  }).filter(url => url.length > 0);
};

/**
 * Get ads for a specific advertiser
 */
const getAdvertiserAds = async (advertiserId, countryCode = 'US', format = 'ALL', config = null) => {
  return await makeRequest('advertiser_ads', {
    advertiser_id: advertiserId,
    country_code: countryCode,
    format: format,
  }, config);
};

/**
 * Search ads by keyword
 */
const searchAds = async (query, countryCode = 'US', limit = 100, config = null) => {
  // Note: This endpoint may vary based on API documentation
  // Adjust based on actual Google Ads Library API capabilities
  return await makeRequest('search_ads', {
    query,
    country_code: countryCode,
    limit: Math.min(limit, 100),
  }, config);
};

/**
 * Get ads by advertiser name
 */
const getAdsByAdvertiserName = async (advertiserName, countryCode = 'US', config = null) => {
  // Note: This endpoint may vary based on API documentation
  return await makeRequest('advertiser_ads', {
    advertiser_name: advertiserName,
    country_code: countryCode,
  }, config);
};

/**
 * Main Google Ads Library scraper
 * Searches for Shopify stores in Google ads
 */
export const scrapeGoogleAds = async () => {
  const stores = [];
  const seenUrls = new Set();
  const apiConfig = getRapidApiConfig();
  
  if (!apiConfig) {
    console.log('⚠️  Google Ads Library RapidAPI key not configured (RAPIDAPI_KEY or GOOGLE_ADS_RAPIDAPI_KEY)');
    return stores;
  }

  try {
    console.log('📢 Scraping Google Ads Library for Shopify stores...');
    
    // Strategy 1: Search for Shopify-related keywords in ads
    const keywords = [
      'shopify',
      'shopify store',
      'online store',
      'ecommerce',
      'my store',
      'shop now',
      'new store',
      'dropshipping',
    ];
    
    // Countries to search (prioritize major markets)
    const countries = ['US', 'GB', 'CA', 'AU', 'DE', 'FR', 'IT', 'ES', 'NL', 'SE'];
    
    let totalAdsChecked = 0;
    let totalAdvertisersChecked = 0;
    
    // Strategy 1: Search ads by keywords
    console.log('   Searching ads by keywords...');
    for (const keyword of keywords.slice(0, 6)) { // Limit to 6 keywords
      try {
        for (const country of countries.slice(0, 5)) { // Limit to 5 countries
          // Note: Actual endpoint may be different - adjust based on API docs
          const adsData = await searchAds(keyword, country, 50, apiConfig);
          
          if (adsData && Array.isArray(adsData)) {
            for (const ad of adsData) {
              totalAdsChecked++;
              const urls = extractUrlsFromAd(ad);
              
              for (const url of urls) {
                const normalized = url.toLowerCase().trim();
                if (!seenUrls.has(normalized) && looksLikeShopifyStore(url)) {
                  seenUrls.add(normalized);
                  stores.push({
                    url: url.trim(),
                    source: 'Google Ads Library',
                    keyword,
                    country,
                  });
                }
              }
            }
          } else if (adsData && adsData.ads && Array.isArray(adsData.ads)) {
            // Handle different response formats
            for (const ad of adsData.ads) {
              totalAdsChecked++;
              const urls = extractUrlsFromAd(ad);
              
              for (const url of urls) {
                const normalized = url.toLowerCase().trim();
                if (!seenUrls.has(normalized) && looksLikeShopifyStore(url)) {
                  seenUrls.add(normalized);
                  stores.push({
                    url: url.trim(),
                    source: 'Google Ads Library',
                    keyword,
                    country,
                  });
                }
              }
            }
          }
          
          // Rate limiting between countries
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        // Rate limiting between keywords
        await new Promise(resolve => setTimeout(resolve, 3000));
      } catch (error) {
        console.error(`   Error searching ads for "${keyword}":`, error.message);
      }
    }
    
    console.log(`   ✅ Checked ${totalAdsChecked} ads, found ${stores.length} stores`);
    
    // Strategy 2: Search for known Shopify-related advertisers
    console.log('   Searching known Shopify advertisers...');
    const shopifyAdvertisers = [
      // Add known Shopify store advertiser IDs here
      // These would be discovered through initial searches
    ];
    
    for (const advertiserId of shopifyAdvertisers.slice(0, 10)) {
      try {
        for (const country of countries.slice(0, 3)) {
          const adsData = await getAdvertiserAds(advertiserId, country, 'ALL', apiConfig);
          
          if (adsData && Array.isArray(adsData)) {
            for (const ad of adsData) {
              totalAdsChecked++;
              const urls = extractUrlsFromAd(ad);
              
              for (const url of urls) {
                const normalized = url.toLowerCase().trim();
                if (!seenUrls.has(normalized) && looksLikeShopifyStore(url)) {
                  seenUrls.add(normalized);
                  stores.push({
                    url: url.trim(),
                    source: 'Google Ads Library (Advertiser)',
                    advertiserId,
                    country,
                  });
                }
              }
            }
          } else if (adsData && adsData.ads && Array.isArray(adsData.ads)) {
            for (const ad of adsData.ads) {
              totalAdsChecked++;
              const urls = extractUrlsFromAd(ad);
              
              for (const url of urls) {
                const normalized = url.toLowerCase().trim();
                if (!seenUrls.has(normalized) && looksLikeShopifyStore(url)) {
                  seenUrls.add(normalized);
                  stores.push({
                    url: url.trim(),
                    source: 'Google Ads Library (Advertiser)',
                    advertiserId,
                    country,
                  });
                }
              }
            }
          }
          
          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        totalAdvertisersChecked++;
      } catch (error) {
        console.error(`   Error getting ads for advertiser ${advertiserId}:`, error.message);
      }
    }
    
    // Strategy 3: Search by advertiser names (if API supports)
    console.log('   Searching by advertiser names...');
    const advertiserNames = [
      'shopify',
      'shopify store',
      'online store',
    ];
    
    for (const name of advertiserNames.slice(0, 3)) {
      try {
        for (const country of countries.slice(0, 2)) {
          const adsData = await getAdsByAdvertiserName(name, country, apiConfig);
          
          if (adsData && Array.isArray(adsData)) {
            for (const ad of adsData) {
              totalAdsChecked++;
              const urls = extractUrlsFromAd(ad);
              
              for (const url of urls) {
                const normalized = url.toLowerCase().trim();
                if (!seenUrls.has(normalized) && looksLikeShopifyStore(url)) {
                  seenUrls.add(normalized);
                  stores.push({
                    url: url.trim(),
                    source: 'Google Ads Library (Advertiser Name)',
                    advertiserName: name,
                    country,
                  });
                }
              }
            }
          }
          
          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (error) {
        console.error(`   Error searching by advertiser name "${name}":`, error.message);
      }
    }
    
    // Remove duplicates
    const uniqueStores = [];
    const uniqueUrls = new Set();
    
    for (const store of stores) {
      const normalized = store.url.toLowerCase().replace(/\/$/, '');
      if (!uniqueUrls.has(normalized)) {
        uniqueUrls.add(normalized);
        uniqueStores.push(store);
      }
    }
    
    console.log(`   ✅ Found ${uniqueStores.length} unique Shopify stores from Google Ads Library`);
    console.log(`   📊 Stats: ${totalAdsChecked} ads, ${totalAdvertisersChecked} advertisers`);
    
    return uniqueStores;
  } catch (error) {
    console.error('Error in Google Ads Library scraper:', error.message);
    return stores;
  }
};

/**
 * Get ads for a specific advertiser ID
 */
export const scrapeGoogleAdsByAdvertiser = async (advertiserId, countries = ['US']) => {
  const stores = [];
  const seenUrls = new Set();
  const apiConfig = getRapidApiConfig();
  
  if (!apiConfig) {
    return stores;
  }
  
  try {
    for (const country of countries) {
      const adsData = await getAdvertiserAds(advertiserId, country, 'ALL', apiConfig);
      
      if (adsData && Array.isArray(adsData)) {
        for (const ad of adsData) {
          const urls = extractUrlsFromAd(ad);
          for (const url of urls) {
            const normalized = url.toLowerCase().trim();
            if (!seenUrls.has(normalized) && looksLikeShopifyStore(url)) {
              seenUrls.add(normalized);
              stores.push({
                url: url.trim(),
                source: `Google Ads Library (Advertiser: ${advertiserId})`,
                country,
              });
            }
          }
        }
      } else if (adsData && adsData.ads && Array.isArray(adsData.ads)) {
        for (const ad of adsData.ads) {
          const urls = extractUrlsFromAd(ad);
          for (const url of urls) {
            const normalized = url.toLowerCase().trim();
            if (!seenUrls.has(normalized) && looksLikeShopifyStore(url)) {
              seenUrls.add(normalized);
              stores.push({
                url: url.trim(),
                source: `Google Ads Library (Advertiser: ${advertiserId})`,
                country,
              });
            }
          }
        }
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  } catch (error) {
    console.error(`Error scraping Google Ads for advertiser ${advertiserId}:`, error.message);
  }
  
  return stores;
};

// Export helper functions for testing
export { getAdvertiserAds, searchAds, getAdsByAdvertiserName };

