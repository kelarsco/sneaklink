import axios from 'axios';
import { looksLikeShopifyStore } from './shopifyUrlValidator.js';

/**
 * Scrape Google SERP API (SerpAPI / Serper.dev) for Shopify store links
 * Free Versions: Can search for "site:myshopify.com", scrape keywords, scrape branded queries
 */
export const scrapeSerpApi = async () => {
  const stores = [];
  const seenUrls = new Set();

  // Try SerpAPI first
  const serpApiKey = process.env.SERPAPI_KEY;
  // Then try Serper.dev
  const serperApiKey = process.env.SERPER_API_KEY;

  if (!serpApiKey && !serperApiKey) {
    console.log('⚠️  SERP API keys not configured (SerpAPI or Serper.dev), skipping SERP scraping');
    return stores;
  }

  try {
    console.log('🔍 Using Google SERP API to discover Shopify stores...');

    const searchQueries = [
      'site:myshopify.com',
      'site:myshopify.com store',
      'site:myshopify.com shop',
      'shopify store',
      'myshopify.com',
    ];

    for (const query of searchQueries) {
      try {
        let searchResults = [];

        // Try SerpAPI first
        if (serpApiKey) {
          const serpUrl = 'https://serpapi.com/search.json';
          const response = await axios.get(serpUrl, {
            params: {
              api_key: serpApiKey,
              q: query,
              engine: 'google',
              num: 100,
            },
            timeout: 15000,
          });

          if (response.data && response.data.organic_results) {
            searchResults = response.data.organic_results;
          }
        }
        // Fallback to Serper.dev
        else if (serperApiKey) {
          const serperUrl = 'https://google.serper.dev/search';
          const response = await axios.post(serperUrl, {
            q: query,
            num: 100,
          }, {
            headers: {
              'X-API-KEY': serperApiKey,
            },
            timeout: 15000,
          });

          if (response.data && response.data.organic) {
            searchResults = response.data.organic;
          }
        }

        // Extract URLs from search results
        for (const result of searchResults) {
          const url = result.link || result.url;
          if (url && looksLikeShopifyStore(url)) {
            const normalizedUrl = url.toLowerCase().replace(/\/$/, '');
            if (!seenUrls.has(normalizedUrl)) {
              seenUrls.add(normalizedUrl);
              stores.push({
                url: url,
                source: serpApiKey ? 'SerpAPI' : 'Serper.dev',
              });
            }
          }
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Error searching SERP for "${query}":`, error.message);
      }
    }

    console.log(`   Found ${stores.length} unique Shopify store URLs from SERP API`);
  } catch (error) {
    console.error('Error in SERP API scraper:', error.message);
  }

  return stores;
};

