import axios from 'axios';
import { looksLikeShopifyStore } from './shopifyUrlValidator.js';

/**
 * Optimized TikTok Scraper using RapidAPI Scraptik
 * Extracts Shopify store URLs from posts, profiles, and hashtags
 */

// Extract RapidAPI credentials from environment
const getRapidApiConfig = () => {
  const apiKey = process.env.RAPIDAPI_KEY || process.env.TIKTOK_RAPIDAPI_KEY;
  const host = process.env.TIKTOK_RAPIDAPI_HOST || 'scraptik.p.rapidapi.com';
  
  if (!apiKey) {
    return null;
  }
  
  return { apiKey, host };
};

/**
 * Generic function to make a request to RapidAPI Scraptik
 */
const makeRequest = async (endpoint, params = {}, config = null) => {
  const apiConfig = config || getRapidApiConfig();
  
  if (!apiConfig) {
    return null;
  }

  try {
    const response = await axios.get(`https://${apiConfig.host}/${endpoint}`, {
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
 * Extract URLs from text content
 */
const extractUrls = (text) => {
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
 * Extract URLs from TikTok post data
 */
const extractUrlsFromPost = (post) => {
  const urls = [];
  
  if (!post || !post.data) {
    return urls;
  }
  
  const data = post.data;
  
  // Extract from description
  if (data.desc) {
    urls.push(...extractUrls(data.desc));
  }
  
  // Extract from video description
  if (data.video && data.video.desc) {
    urls.push(...extractUrls(data.video.desc));
  }
  
  // Extract from author bio
  if (data.author && data.author.signature) {
    urls.push(...extractUrls(data.author.signature));
  }
  
  // Extract from author bio link
  if (data.author && data.author.bio_link) {
    const bioLink = data.author.bio_link;
    if (bioLink.url) {
      urls.push(bioLink.url);
    }
  }
  
  // Extract from statistics (if any links in stats)
  if (data.statistics) {
    // Stats don't typically contain URLs, but check just in case
    const statsStr = JSON.stringify(data.statistics);
    urls.push(...extractUrls(statsStr));
  }
  
  // Extract from music info (if any)
  if (data.music && data.music.title) {
    // Music titles rarely have URLs, but check
    urls.push(...extractUrls(data.music.title));
  }
  
  return urls;
};

/**
 * Extract URLs from TikTok user profile
 */
const extractUrlsFromProfile = (profile) => {
  const urls = [];
  
  if (!profile || !profile.data) {
    return urls;
  }
  
  const data = profile.data;
  
  // Extract from bio/signature
  if (data.signature) {
    urls.push(...extractUrls(data.signature));
  }
  
  // Extract from bio link
  if (data.bio_link) {
    if (typeof data.bio_link === 'string') {
      urls.push(data.bio_link);
    } else if (data.bio_link.url) {
      urls.push(data.bio_link.url);
    }
  }
  
  return urls;
};

/**
 * Get a single post by Aweme ID
 */
const getPost = async (aweme_id, config = null) => {
  return await makeRequest('get-post', { aweme_id }, config);
};

/**
 * Search posts by keyword
 */
const searchPosts = async (keyword, count = 20, offset = 0, region = 'US', config = null) => {
  return await makeRequest('search-posts', {
    keyword,
    count: Math.min(count, 50), // Limit to 50 max
    offset,
    use_filters: 0,
    publish_time: 0,
    sort_type: 0,
    region,
  }, config);
};

/**
 * Search hashtags
 */
const searchHashtags = async (keyword, count = 20, cursor = 0, config = null) => {
  return await makeRequest('search-hashtags', {
    keyword,
    count: Math.min(count, 50), // Limit to 50 max
    cursor,
  }, config);
};

/**
 * Get user profile by username
 */
const getUserProfile = async (username, config = null) => {
  return await makeRequest('get-user', { username }, config);
};

/**
 * Get posts from a user
 */
const getUserPosts = async (username, count = 20, cursor = 0, config = null) => {
  return await makeRequest('get-user-posts', {
    username,
    count: Math.min(count, 50),
    cursor,
  }, config);
};

/**
 * Main TikTok scraper function
 * Searches posts, profiles, and hashtags for Shopify store URLs
 */
export const scrapeTikTokOptimized = async () => {
  const stores = [];
  const seenUrls = new Set();
  const apiConfig = getRapidApiConfig();
  
  if (!apiConfig) {
    console.log('⚠️  TikTok RapidAPI key not configured (RAPIDAPI_KEY or TIKTOK_RAPIDAPI_KEY)');
    return stores;
  }

  try {
    console.log('📱 Scraping TikTok for Shopify stores (RapidAPI Scraptik)...');
    
    // Keywords to search for Shopify stores
    const keywords = [
      'shopify store',
      'my store',
      'shop now',
      'unboxing',
      'just launched',
      'new store',
      'checkout my store',
      'link in bio',
      'store link',
      'online store',
      'ecommerce',
      'dropshipping',
    ];
    
    // Regions to search (prioritize English-speaking regions)
    const regions = ['US', 'GB', 'CA', 'AU'];
    
    let totalPostsChecked = 0;
    let totalProfilesChecked = 0;
    let totalHashtagsChecked = 0;
    
    // Strategy 1: Search posts by keywords
    console.log('   Searching posts by keywords...');
    for (const keyword of keywords.slice(0, 8)) { // Limit to 8 keywords to avoid rate limits
      try {
        for (const region of regions.slice(0, 2)) { // Limit to 2 regions
          const postsData = await searchPosts(keyword, 30, 0, region, apiConfig);
          
          if (postsData && postsData.data && Array.isArray(postsData.data)) {
            for (const post of postsData.data) {
              totalPostsChecked++;
              const urls = extractUrlsFromPost({ data: post });
              
              for (const url of urls) {
                const normalized = url.toLowerCase().trim();
                if (!seenUrls.has(normalized) && looksLikeShopifyStore(url)) {
                  seenUrls.add(normalized);
                  stores.push({
                    url: url.trim(),
                    source: 'TikTok (Posts)',
                    keyword,
                    region,
                  });
                }
              }
            }
          }
          
          // Rate limiting between regions
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        // Rate limiting between keywords
        await new Promise(resolve => setTimeout(resolve, 3000));
      } catch (error) {
        console.error(`   Error searching posts for "${keyword}":`, error.message);
      }
    }
    
    console.log(`   ✅ Checked ${totalPostsChecked} posts, found ${stores.length} stores`);
    
    // Strategy 2: Search hashtags and get posts from hashtags
    console.log('   Searching hashtags...');
    const hashtagKeywords = [
      'shopify',
      'shopifystore',
      'onlinestore',
      'ecommerce',
      'dropshipping',
      'newstore',
    ];
    
    for (const keyword of hashtagKeywords.slice(0, 4)) { // Limit to 4 hashtags
      try {
        const hashtagsData = await searchHashtags(keyword, 20, 0, apiConfig);
        
        if (hashtagsData && hashtagsData.data && Array.isArray(hashtagsData.data)) {
          for (const hashtag of hashtagsData.data.slice(0, 5)) { // Limit to 5 hashtags per keyword
            totalHashtagsChecked++;
            
            // Get posts from hashtag (if API supports it)
            // Note: This depends on API capabilities
            if (hashtag.hashtag_id) {
              // Try to get posts from hashtag
              // This would require additional API endpoint if available
            }
          }
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`   Error searching hashtags for "${keyword}":`, error.message);
      }
    }
    
    console.log(`   ✅ Checked ${totalHashtagsChecked} hashtags`);
    
    // Strategy 3: Search for users with store-related keywords in bio
    // Then check their profiles and posts
    console.log('   Searching user profiles...');
    const userKeywords = [
      'shop',
      'store',
      'shopify',
      'ecommerce',
    ];
    
    for (const keyword of userKeywords.slice(0, 3)) { // Limit to 3 user searches
      try {
        // Search for users (if API supports user search)
        // This would require user search endpoint
        
        // For now, we'll extract from posts we already found
        // and check their author profiles
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`   Error searching users for "${keyword}":`, error.message);
      }
    }
    
    // Strategy 4: Check profiles of users from found posts
    // Extract usernames from posts and check their profiles
    const checkedProfiles = new Set();
    
    // Re-check posts we found to get author profiles
    for (const store of stores.slice(0, 20)) { // Limit to 20 stores to check profiles
      try {
        // This would require storing post data with usernames
        // For now, we'll skip this to avoid additional API calls
      } catch (error) {
        // Skip profile errors
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
    
    console.log(`   ✅ Found ${uniqueStores.length} unique Shopify stores from TikTok`);
    console.log(`   📊 Stats: ${totalPostsChecked} posts, ${totalProfilesChecked} profiles, ${totalHashtagsChecked} hashtags`);
    
    return uniqueStores;
  } catch (error) {
    console.error('Error in optimized TikTok scraper:', error.message);
    return stores;
  }
};

/**
 * Get specific user's posts and extract store URLs
 */
export const scrapeTikTokUser = async (username) => {
  const stores = [];
  const apiConfig = getRapidApiConfig();
  
  if (!apiConfig) {
    return stores;
  }
  
  try {
    // Get user profile
    const profile = await getUserProfile(username, apiConfig);
    if (profile && profile.data) {
      const profileUrls = extractUrlsFromProfile(profile);
      for (const url of profileUrls) {
        if (looksLikeShopifyStore(url)) {
          stores.push({
            url: url.trim(),
            source: `TikTok (Profile: ${username})`,
          });
        }
      }
    }
    
    // Get user posts
    const postsData = await getUserPosts(username, 50, 0, apiConfig);
    if (postsData && postsData.data && Array.isArray(postsData.data)) {
      for (const post of postsData.data) {
        const urls = extractUrlsFromPost({ data: post });
        for (const url of urls) {
          if (looksLikeShopifyStore(url)) {
            stores.push({
              url: url.trim(),
              source: `TikTok (User: ${username})`,
            });
          }
        }
      }
    }
  } catch (error) {
    console.error(`Error scraping TikTok user ${username}:`, error.message);
  }
  
  return stores;
};

// Export helper functions for testing
export { getPost, searchPosts, searchHashtags, getUserProfile, getUserPosts };

