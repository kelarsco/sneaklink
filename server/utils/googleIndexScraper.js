import axios from 'axios';
import { searchShopifyStoresWithAPI } from './scrapingApi.js';
import { looksLikeShopifyStore } from './shopifyUrlValidator.js';

/**
 * Google Index Gap Scraper
 * Uses Google search with time filters to find newly indexed Shopify stores
 */

/**
 * Search Google for newly indexed Shopify stores
 */
export const searchGoogleIndexGaps = async () => {
  const stores = [];
  const seenUrls = new Set();
  
  try {
    console.log('🔍 Searching Google index gaps for new Shopify stores...');
    
    // Google search queries with time filters
    const queries = [
      '"Powered by Shopify" site:com "hours ago"',
      '"Powered by Shopify" "past 24 hours"',
      '"shopify-section" "newly indexed"',
      'myshopify.com "past day"',
      '"shopify store" "just launched"',
      '"new shopify store" "today"',
      'site:myshopify.com "recent"',
    ];
    
    // Use ScrapingAPI or SerpAPI for Google searches
    if (process.env.SCRAPING_API_KEY || process.env.SERPAPI_KEY || process.env.SERPER_API_KEY) {
      for (const query of queries) {
        try {
          console.log(`   Searching: "${query}"...`);
          
          // Use available search API
          let foundStores = [];
          
          if (process.env.SCRAPING_API_KEY) {
            foundStores = await searchShopifyStoresWithAPI(query);
          } else if (process.env.SERPAPI_KEY) {
            // Use SerpAPI
            const { scrapeSerpApi } = await import('./serpApiScraper.js');
            foundStores = await scrapeSerpApi(query);
          } else if (process.env.SERPER_API_KEY) {
            // Use Serper.dev API
            try {
              const response = await axios.post(
                'https://google.serper.dev/search',
                {
                  q: query,
                  num: 100,
                },
                {
                  headers: {
                    'X-API-KEY': process.env.SERPER_API_KEY,
                    'Content-Type': 'application/json',
                  },
                  timeout: 30000,
                }
              );
              
              const results = response.data?.organic || [];
              for (const result of results) {
                const url = result.link || '';
                if (looksLikeShopifyStore(url) && !seenUrls.has(url.toLowerCase())) {
                  seenUrls.add(url.toLowerCase());
                  foundStores.push({
                    url,
                    source: 'Google Index Gap',
                    title: result.title,
                  });
                }
              }
            } catch (error) {
              console.error(`   Error with Serper API for "${query}":`, error.message);
            }
          }
          
          stores.push(...foundStores);
          
          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
          console.error(`   Error searching for "${query}":`, error.message);
        }
      }
    } else {
      console.log('   ⚠️  No search API key configured (SCRAPING_API_KEY, SERPAPI_KEY, or SERPER_API_KEY)');
    }
    
    console.log(`   Found ${stores.length} stores from Google index gaps`);
  } catch (error) {
    console.error('Error searching Google index gaps:', error.message);
  }
  
  return stores;
};

/**
 * Search Google with specific time filters
 */
export const searchGoogleWithTimeFilter = async (timeFilter = 'past 24 hours') => {
  const stores = [];
  
  try {
    const queries = [
      `"Powered by Shopify" ${timeFilter}`,
      `myshopify.com ${timeFilter}`,
      `"shopify store" ${timeFilter}`,
    ];
    
    for (const query of queries) {
      try {
        const foundStores = await searchGoogleIndexGaps();
        stores.push(...foundStores);
      } catch (error) {
        console.error(`Error with time filter "${timeFilter}":`, error.message);
      }
    }
  } catch (error) {
    console.error('Error in Google time filter search:', error.message);
  }
  
  return stores;
};

/**
 * Main function to find stores via Google index gaps
 */
export const findStoresViaGoogleIndex = async () => {
  const stores = [];
  
  try {
    console.log('🔍 Starting Google index gap detection...');
    
    const indexGapStores = await searchGoogleIndexGaps();
    stores.push(...indexGapStores);
    
    // Also search with different time filters
    const timeFilters = ['past 24 hours', 'past week', 'past month'];
    for (const filter of timeFilters) {
      try {
        const filteredStores = await searchGoogleWithTimeFilter(filter);
        stores.push(...filteredStores);
      } catch (error) {
        console.error(`Error with time filter "${filter}":`, error.message);
      }
    }
    
    // Remove duplicates
    const uniqueStores = [];
    const seenUrls = new Set();
    for (const store of stores) {
      const normalized = store.url.toLowerCase().replace(/\/$/, '');
      if (!seenUrls.has(normalized)) {
        seenUrls.add(normalized);
        uniqueStores.push(store);
      }
    }
    
    console.log(`   Total unique stores found via Google index: ${uniqueStores.length}`);
    return uniqueStores;
  } catch (error) {
    console.error('Error in Google index detection:', error.message);
    return stores;
  }
};

