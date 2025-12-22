import axios from 'axios';
import { looksLikeShopifyStore } from './shopifyUrlValidator.js';

/**
 * Google Custom Search API Scraper
 * Uses Google Custom Search Engine (CSE) to find Shopify stores
 * 
 * Setup:
 * 1. Go to https://programmablesearchengine.google.com/
 * 2. Create a Custom Search Engine
 * 3. Get your API Key from https://console.cloud.google.com/apis/credentials
 * 4. Get your Search Engine ID (CX) from the CSE settings
 * 5. Add to .env:
 *    GOOGLE_CSE_API_KEY=your_api_key
 *    GOOGLE_CSE_ID=your_search_engine_id
 */

const GOOGLE_CSE_API_BASE = 'https://www.googleapis.com/customsearch/v1';
const MAX_RESULTS_PER_QUERY = 100; // Google CSE max is 100 per request
const MAX_QUERIES_PER_DAY = 100; // Free tier limit (paid: 10,000/day)
const RATE_LIMIT_DELAY = 1000; // 1 second between requests

/**
 * Make a request to Google Custom Search API
 */
const makeGoogleCSERequest = async (query, startIndex = 1, numResults = 10) => {
  const apiKey = process.env.GOOGLE_CSE_API_KEY;
  const searchEngineId = process.env.GOOGLE_CSE_ID;
  
  if (!apiKey || !searchEngineId) {
    throw new Error('Google Custom Search API credentials not configured (GOOGLE_CSE_API_KEY and GOOGLE_CSE_ID required)');
  }

  try {
    const response = await axios.get(GOOGLE_CSE_API_BASE, {
      params: {
        key: apiKey,
        cx: searchEngineId,
        q: query,
        start: startIndex,
        num: Math.min(numResults, 10), // Google CSE allows max 10 per request
        safe: 'off', // Disable safe search for better results
      },
      timeout: 30000,
    });

    return response.data;
  } catch (error) {
    if (error.response) {
      const errorData = error.response.data?.error || {};
      if (errorData.code === 429) {
        throw new Error('Google CSE API: Rate limit exceeded. Please wait before making more requests.');
      } else if (errorData.code === 403) {
        throw new Error('Google CSE API: Access denied. Check your API key and quota.');
      } else if (errorData.code === 400) {
        throw new Error(`Google CSE API: Invalid request - ${errorData.message || 'Bad request'}`);
      }
      throw new Error(`Google CSE API error: ${error.response.status} - ${errorData.message || error.message}`);
    } else if (error.request) {
      throw new Error('Google CSE API: No response received');
    } else {
      throw new Error(`Google CSE API request error: ${error.message}`);
    }
  }
};

/**
 * Search Google Custom Search Engine for Shopify stores
 */
const searchGoogleCSE = async (query, maxResults = 100) => {
  const stores = [];
  const seenUrls = new Set();
  let startIndex = 1;
  const resultsPerPage = 10;
  let totalFetched = 0;

  try {
    while (totalFetched < maxResults && startIndex <= 91) { // Google CSE max start index is 91
      const data = await makeGoogleCSERequest(query, startIndex, resultsPerPage);
      
      if (!data.items || data.items.length === 0) {
        // No more results
        break;
      }

      for (const item of data.items) {
        const url = item.link;
        if (url && looksLikeShopifyStore(url)) {
          const normalized = url.toLowerCase().replace(/\/$/, '');
          if (!seenUrls.has(normalized)) {
            seenUrls.add(normalized);
            stores.push({
              url: url.trim(),
              source: 'Google Custom Search',
              title: item.title || '',
              snippet: item.snippet || '',
              query: query,
            });
          }
        }
        totalFetched++;
      }

      // Check if there are more results
      const totalResults = parseInt(data.searchInformation?.totalResults || '0');
      if (startIndex + resultsPerPage >= totalResults || data.items.length < resultsPerPage) {
        // No more pages
        break;
      }

      startIndex += resultsPerPage;
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
    }
  } catch (error) {
    console.error(`   Error searching Google CSE for "${query}":`, error.message);
  }

  return stores;
};

/**
 * Main Google Custom Search scraper
 * Searches for Shopify stores using various queries
 */
export const scrapeGoogleCustomSearch = async () => {
  const stores = [];
  const seenUrls = new Set();
  
  const apiKey = process.env.GOOGLE_CSE_API_KEY;
  const searchEngineId = process.env.GOOGLE_CSE_ID;
  
  if (!apiKey || !searchEngineId) {
    console.log('⚠️  Google Custom Search API not configured (GOOGLE_CSE_API_KEY and GOOGLE_CSE_ID required)');
    return stores;
  }

  try {
    console.log('🔍 Scraping Google Custom Search Engine for Shopify stores...');
    
    // EXPANDED search queries for maximum coverage - hundreds of variations
    const searchQueries = [
      // Direct Shopify site searches
      'site:myshopify.com',
      'site:myshopify.com store',
      'site:myshopify.com shop',
      'site:myshopify.com products',
      'site:myshopify.com collection',
      'site:myshopify.com cart',
      'site:myshopify.com checkout',
      'site:myshopify.com sale',
      'site:myshopify.com discount',
      
      // Shopify-specific keywords
      '"Powered by Shopify"',
      '"powered by shopify"',
      '"shopify-section"',
      'myshopify.com',
      '.myshopify.com',
      
      // Ecommerce + Shopify
      'shopify store',
      'shopify online store',
      'shopify ecommerce',
      'new shopify store',
      'shopify dropshipping store',
      'shopify print on demand',
      'shopify store products',
      'shopify store catalog',
      'shopify store collection',
      'shopify store sale',
      'shopify store discount',
      
      // Business models
      'dropshipping shopify',
      'print on demand shopify',
      'wholesale shopify',
      'retail shopify',
      
      // Product categories
      'fashion shopify store',
      'clothing shopify store',
      'jewelry shopify store',
      'electronics shopify store',
      'home decor shopify store',
      'beauty shopify store',
      'health shopify store',
      'fitness shopify store',
      'sports shopify store',
      'toys shopify store',
      'books shopify store',
      'art shopify store',
      'crafts shopify store',
      
      // Country-specific searches (global coverage)
      'shopify store United States',
      'shopify store USA',
      'shopify store Canada',
      'shopify store UK',
      'shopify store United Kingdom',
      'shopify store Australia',
      'shopify store New Zealand',
      'shopify store Germany',
      'shopify store France',
      'shopify store Italy',
      'shopify store Spain',
      'shopify store Netherlands',
      'shopify store Sweden',
      'shopify store Norway',
      'shopify store Denmark',
      'shopify store Japan',
      'shopify store South Korea',
      'shopify store Singapore',
      'shopify store India',
      'shopify store Brazil',
      'shopify store Mexico',
      'shopify store Argentina',
      'shopify store South Africa',
      'shopify store UAE',
      'shopify store Saudi Arabia',
    ];

    // Process all queries (if paid tier) or limit to 50 for free tier
    const maxQueries = process.env.GOOGLE_CSE_PAID_TIER === 'true' ? searchQueries.length : 50;
    const queriesToProcess = searchQueries.slice(0, Math.min(searchQueries.length, maxQueries));
    
    console.log(`   Processing ${queriesToProcess.length} search queries...`);
    
    for (let i = 0; i < queriesToProcess.length; i++) {
      const query = queriesToProcess[i];
      try {
        console.log(`   [${i + 1}/${queriesToProcess.length}] Searching: "${query}"...`);
        
        // Search with pagination (up to 100 results per query)
        const foundStores = await searchGoogleCSE(query, 100);
        
        for (const store of foundStores) {
          const normalized = store.url.toLowerCase().replace(/\/$/, '');
          if (!seenUrls.has(normalized)) {
            seenUrls.add(normalized);
            stores.push(store);
          }
        }
        
        console.log(`      ✅ Found ${foundStores.length} stores (${stores.length} total unique)`);
        
        // Rate limiting between queries
        if (i < queriesToProcess.length - 1) {
          await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
        }
      } catch (error) {
        console.error(`   ❌ Error processing query "${query}":`, error.message);
        
        // If rate limited, wait longer before continuing
        if (error.message.includes('Rate limit') || error.message.includes('429')) {
          console.log('   ⏳ Rate limit hit, waiting 10 seconds...');
          await new Promise(resolve => setTimeout(resolve, 10000));
        }
      }
    }
    
    console.log(`   ✅ Found ${stores.length} unique Shopify stores from Google Custom Search`);
    
    return stores;
  } catch (error) {
    console.error('Error in Google Custom Search scraper:', error.message);
    return stores;
  }
};

/**
 * Search Google CSE with a specific query
 */
export const searchGoogleCSEByQuery = async (query, maxResults = 100) => {
  const stores = [];
  
  try {
    const foundStores = await searchGoogleCSE(query, maxResults);
    stores.push(...foundStores);
  } catch (error) {
    console.error(`Error searching Google CSE for "${query}":`, error.message);
  }
  
  return stores;
};

/**
 * Get search statistics from Google CSE
 */
export const getGoogleCSEStats = async (query = 'site:myshopify.com') => {
  try {
    const data = await makeGoogleCSERequest(query, 1, 1);
    return {
      totalResults: parseInt(data.searchInformation?.totalResults || '0'),
      searchTime: parseFloat(data.searchInformation?.searchTime || '0'),
      formattedTotalResults: data.searchInformation?.formattedTotalResults || '0',
    };
  } catch (error) {
    console.error('Error getting Google CSE stats:', error.message);
    return null;
  }
};
