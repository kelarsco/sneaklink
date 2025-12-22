import axios from 'axios';
import { looksLikeShopifyStore } from './shopifyUrlValidator.js';

/**
 * Pinterest API Scraper
 * Scrapes Shopify store links from all Pinterest sources:
 * - Search pins by keywords
 * - User pins
 * - Board pins
 * - Search boards
 * - User boards
 */

const PINTEREST_API_BASE = 'https://api.pinterest.com/v5';
const MAX_RESULTS_PER_QUERY = 250; // Pinterest API limit
const RATE_LIMIT_DELAY = 1000; // 1 second between requests

/**
 * Make authenticated Pinterest API request
 */
const makePinterestRequest = async (endpoint, params = {}) => {
  const accessToken = process.env.PINTEREST_ACCESS_TOKEN;
  
  if (!accessToken) {
    throw new Error('Pinterest access token not configured');
  }

  try {
    const response = await axios.get(`${PINTEREST_API_BASE}${endpoint}`, {
      params: {
        ...params,
      },
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    return response.data;
  } catch (error) {
    if (error.response) {
      // API error response
      throw new Error(`Pinterest API error: ${error.response.status} - ${error.response.data?.message || error.message}`);
    } else if (error.request) {
      // Request made but no response
      throw new Error('Pinterest API: No response received');
    } else {
      // Request setup error
      throw new Error(`Pinterest API request error: ${error.message}`);
    }
  }
};

/**
 * Extract URLs from Pinterest pin data
 */
const extractUrlsFromPin = (pin) => {
  const urls = [];
  
  // Pin link (destination URL)
  if (pin.link) {
    urls.push(pin.link);
  }
  
  // Pin description (may contain URLs)
  if (pin.description) {
    const urlRegex = /(https?:\/\/[^\s\)]+)/g;
    const foundUrls = pin.description.match(urlRegex) || [];
    urls.push(...foundUrls);
  }
  
  // Pin title (may contain URLs)
  if (pin.title) {
    const urlRegex = /(https?:\/\/[^\s\)]+)/g;
    const foundUrls = pin.title.match(urlRegex) || [];
    urls.push(...foundUrls);
  }
  
  // Pin media (check alt text, etc.)
  if (pin.media) {
    if (pin.media.alt_text) {
      const urlRegex = /(https?:\/\/[^\s\)]+)/g;
      const foundUrls = pin.media.alt_text.match(urlRegex) || [];
      urls.push(...foundUrls);
    }
  }
  
  return urls;
};

/**
 * Search Pinterest pins by keyword
 */
const searchPins = async (query, limit = 25) => {
  try {
    const pins = [];
    let bookmark = null;
    let pageCount = 0;
    const maxPages = Math.ceil(limit / 25); // Pinterest returns 25 per page
    
    do {
      const params = {
        query,
        limit: Math.min(25, limit - pins.length),
      };
      
      if (bookmark) {
        params.bookmark = bookmark;
      }
      
      const response = await makePinterestRequest('/pins/search', params);
      
      if (response.items && Array.isArray(response.items)) {
        pins.push(...response.items);
      }
      
      bookmark = response.bookmark || null;
      pageCount++;
      
      // Rate limiting
      if (bookmark && pageCount < maxPages) {
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
      }
    } while (bookmark && pins.length < limit && pageCount < maxPages);
    
    return pins;
  } catch (error) {
    console.error(`Error searching Pinterest pins for "${query}":`, error.message);
    return [];
  }
};

/**
 * Get pins from a specific board
 */
const getBoardPins = async (boardId, limit = 25) => {
  try {
    const pins = [];
    let bookmark = null;
    let pageCount = 0;
    const maxPages = Math.ceil(limit / 25);
    
    do {
      const params = {
        limit: Math.min(25, limit - pins.length),
      };
      
      if (bookmark) {
        params.bookmark = bookmark;
      }
      
      const response = await makePinterestRequest(`/boards/${boardId}/pins`, params);
      
      if (response.items && Array.isArray(response.items)) {
        pins.push(...response.items);
      }
      
      bookmark = response.bookmark || null;
      pageCount++;
      
      // Rate limiting
      if (bookmark && pageCount < maxPages) {
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
      }
    } while (bookmark && pins.length < limit && pageCount < maxPages);
    
    return pins;
  } catch (error) {
    console.error(`Error getting pins from board ${boardId}:`, error.message);
    return [];
  }
};

/**
 * Get pins from a specific user
 */
const getUserPins = async (username, limit = 25) => {
  try {
    const pins = [];
    let bookmark = null;
    let pageCount = 0;
    const maxPages = Math.ceil(limit / 25);
    
    do {
      const params = {
        limit: Math.min(25, limit - pins.length),
      };
      
      if (bookmark) {
        params.bookmark = bookmark;
      }
      
      const response = await makePinterestRequest(`/users/${username}/pins`, params);
      
      if (response.items && Array.isArray(response.items)) {
        pins.push(...response.items);
      }
      
      bookmark = response.bookmark || null;
      pageCount++;
      
      // Rate limiting
      if (bookmark && pageCount < maxPages) {
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
      }
    } while (bookmark && pins.length < limit && pageCount < maxPages);
    
    return pins;
  } catch (error) {
    console.error(`Error getting pins from user ${username}:`, error.message);
    return [];
  }
};

/**
 * Search Pinterest boards by keyword
 */
const searchBoards = async (query, limit = 25) => {
  try {
    const boards = [];
    let bookmark = null;
    let pageCount = 0;
    const maxPages = Math.ceil(limit / 25);
    
    do {
      const params = {
        query,
        limit: Math.min(25, limit - boards.length),
      };
      
      if (bookmark) {
        params.bookmark = bookmark;
      }
      
      const response = await makePinterestRequest('/boards/search', params);
      
      if (response.items && Array.isArray(response.items)) {
        boards.push(...response.items);
      }
      
      bookmark = response.bookmark || null;
      pageCount++;
      
      // Rate limiting
      if (bookmark && pageCount < maxPages) {
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
      }
    } while (bookmark && boards.length < limit && pageCount < maxPages);
    
    return boards;
  } catch (error) {
    console.error(`Error searching Pinterest boards for "${query}":`, error.message);
    return [];
  }
};

/**
 * Get boards from a specific user
 */
const getUserBoards = async (username, limit = 25) => {
  try {
    const boards = [];
    let bookmark = null;
    let pageCount = 0;
    const maxPages = Math.ceil(limit / 25);
    
    do {
      const params = {
        limit: Math.min(25, limit - boards.length),
      };
      
      if (bookmark) {
        params.bookmark = bookmark;
      }
      
      const response = await makePinterestRequest(`/users/${username}/boards`, params);
      
      if (response.items && Array.isArray(response.items)) {
        boards.push(...response.items);
      }
      
      bookmark = response.bookmark || null;
      pageCount++;
      
      // Rate limiting
      if (bookmark && pageCount < maxPages) {
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
      }
    } while (bookmark && boards.length < limit && pageCount < maxPages);
    
    return boards;
  } catch (error) {
    console.error(`Error getting boards from user ${username}:`, error.message);
    return [];
  }
};

/**
 * Search for Pinterest ads/promoted pins
 * Pinterest doesn't have a public ads library, but we can search for promoted pins
 * by looking for pins with ad characteristics (links, CTAs, etc.)
 */
const searchPinterestAds = async (keywords = [], limit = 25) => {
  const stores = [];
  const seenUrls = new Set();
  
  try {
    for (const keyword of keywords) {
      try {
        // Search for pins with ad-like characteristics
        const pins = await searchPins(keyword, limit);
        
        for (const pin of pins) {
          // Promoted pins typically have:
          // 1. A destination link
          // 2. Call-to-action text
          // 3. Ad-like descriptions
          const hasLink = pin.link && pin.link.length > 0;
          const description = (pin.description || '').toLowerCase();
          const hasCTA = description.includes('shop') || 
                        description.includes('buy') || 
                        description.includes('sale') ||
                        description.includes('discount') ||
                        description.includes('promo') ||
                        description.includes('limited');
          
          // If pin looks like an ad (has link and CTA), extract URLs
          if (hasLink && hasCTA) {
            const urls = extractUrlsFromPin(pin);
            for (const url of urls) {
              const normalizedUrl = url.trim().toLowerCase();
              if (!seenUrls.has(normalizedUrl) && looksLikeShopifyStore(url)) {
                seenUrls.add(normalizedUrl);
                stores.push({
                  url: url.trim(),
                  source: 'Social Media Post', // Could be 'Social Media Ads' if confirmed promoted
                });
              }
            }
          }
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
      } catch (error) {
        console.error(`   Error searching Pinterest ads for "${keyword}":`, error.message);
      }
    }
  } catch (error) {
    console.error('Error in Pinterest ads search:', error.message);
  }
  
  return stores;
};

/**
 * Main Pinterest scraper function
 * Scrapes from all available Pinterest sources
 */
export const scrapePinterestOptimized = async () => {
  const stores = [];
  const seenUrls = new Set();
  
  try {
    console.log('📌 Scraping Pinterest for Shopify stores...');
    
    const accessToken = process.env.PINTEREST_ACCESS_TOKEN;
    
    if (!accessToken) {
      console.log('   ⚠️  Pinterest access token not configured');
      return stores;
    }
    
    // Strategy 1: Search pins by ecommerce/shopify keywords
    console.log('   🔍 Strategy 1: Searching pins by keywords...');
    const searchKeywords = [
      'shop now',
      'shopify store',
      'online store',
      'ecommerce',
      'new store',
      'just launched',
      'shop my store',
      'buy now',
      'shop link',
      'store link',
      'myshopify.com',
      'shopify shop',
      'online shop',
      'dropshipping store',
      'print on demand',
    ];
    
    for (const keyword of searchKeywords) {
      try {
        console.log(`      Searching pins for: "${keyword}"...`);
        const pins = await searchPins(keyword, 50);
        console.log(`         Found ${pins.length} pins`);
        
        for (const pin of pins) {
          const urls = extractUrlsFromPin(pin);
          for (const url of urls) {
            const normalizedUrl = url.trim().toLowerCase();
            if (!seenUrls.has(normalizedUrl) && looksLikeShopifyStore(url)) {
              seenUrls.add(normalizedUrl);
              stores.push({
                url: url.trim(),
                source: 'Social Media Post',
              });
            }
          }
        }
        
        // Rate limiting between keyword searches
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
      } catch (error) {
        console.error(`      Error searching for "${keyword}":`, error.message);
      }
    }
    
    const storesBeforeBoards = stores.length;
    console.log(`   ✅ Strategy 1: Found ${stores.length} stores from pin searches`);
    
    // Strategy 2: Search boards by ecommerce keywords
    console.log('   🔍 Strategy 2: Searching boards by keywords...');
    const boardKeywords = [
      'shopify stores',
      'ecommerce',
      'online stores',
      'shopping',
      'dropshipping',
    ];
    
    let boardCount = 0;
    for (const keyword of boardKeywords) {
      try {
        console.log(`      Searching boards for: "${keyword}"...`);
        const boards = await searchBoards(keyword, 20);
        console.log(`         Found ${boards.length} boards`);
        
        // Get pins from each board
        for (const board of boards) {
          if (boardCount >= 50) break; // Limit total boards to avoid rate limits
          
          try {
            const boardId = board.id;
            const boardPins = await getBoardPins(boardId, 25);
            console.log(`         Board "${board.name}": Found ${boardPins.length} pins`);
            
            for (const pin of boardPins) {
              const urls = extractUrlsFromPin(pin);
              for (const url of urls) {
                const normalizedUrl = url.trim().toLowerCase();
                if (!seenUrls.has(normalizedUrl) && looksLikeShopifyStore(url)) {
                  seenUrls.add(normalizedUrl);
                  stores.push({
                    url: url.trim(),
                    source: 'Social Media Post',
                  });
                }
              }
            }
            
            boardCount++;
            // Rate limiting between boards
            await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
          } catch (error) {
            console.error(`         Error getting pins from board:`, error.message);
          }
        }
        
        // Rate limiting between keyword searches
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
      } catch (error) {
        console.error(`      Error searching boards for "${keyword}":`, error.message);
      }
    }
    
    console.log(`   ✅ Strategy 2: Found ${stores.length - storesBeforeBoards} additional stores from boards`);
    
    // Strategy 3: Search for promoted pins (ads) by keywords
    const storesBeforeAds = stores.length;
    console.log('   🔍 Strategy 3: Searching promoted pins (ads) by keywords...');
    
    // Pinterest promoted pins are essentially ads
    // We search for pins with ad characteristics (links + CTAs)
    const adKeywords = [
      'shop now',
      'buy now',
      'limited time',
      'sale',
      'discount',
      'promo code',
      'free shipping',
      'new collection',
      'shop the look',
      'limited offer',
      'special offer',
      'flash sale',
    ];
    
    const adStores = await searchPinterestAds(adKeywords, 50);
    console.log(`         Found ${adStores.length} stores from promoted pins/ads`);
    
    // Add ad stores to main stores array (deduplication already handled in searchPinterestAds)
    for (const store of adStores) {
      const normalizedUrl = store.url.trim().toLowerCase();
      if (!seenUrls.has(normalizedUrl)) {
        seenUrls.add(normalizedUrl);
        stores.push(store);
      }
    }
    
    console.log(`   ✅ Strategy 3: Found ${stores.length - storesBeforeAds} additional stores from promoted pins/ads`);
    
    // Strategy 4: Search for pins with high engagement (likely ads)
    // Pinterest ads typically have higher engagement rates
    // Note: This would require additional API calls to get engagement data
    
    console.log(`   📊 Total unique stores found: ${stores.length}`);
    
  } catch (error) {
    console.error('Error in Pinterest scraper:', error.message);
  }
  
  return stores;
};

/**
 * Legacy function name for backward compatibility
 */
export const scrapePinterest = scrapePinterestOptimized;

