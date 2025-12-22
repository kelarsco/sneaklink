import axios from 'axios';
import * as cheerio from 'cheerio';
import { normalizeUrlToRoot } from './urlNormalizer.js';

/**
 * Scrape a URL using ScrapingAPI.com
 */
export const scrapeWithAPI = async (url) => {
  const apiKey = process.env.SCRAPING_API_KEY;
  
  if (!apiKey) {
    console.log('ScrapingAPI key not configured, skipping API scraping');
    return null;
  }

  try {
    const response = await axios.get('https://api.scrapingapi.com/v2/scrape', {
      params: {
        api_key: apiKey,
        url: url,
        render: 'false', // Don't render JavaScript (faster)
      },
      timeout: 30000, // 30 second timeout
    });

    return response.data;
  } catch (error) {
    console.error(`Error using ScrapingAPI for ${url}:`, error.message);
    return null;
  }
};

/**
 * Get HTML content using ScrapingAPI
 */
export const getHTMLWithAPI = async (url) => {
  const html = await scrapeWithAPI(url);
  if (html && typeof html === 'string') {
    return html;
  }
  return null;
};

/**
 * Search for Shopify stores using ScrapingAPI
 * This can be used to scrape search engines or directories
 */
export const searchShopifyStoresWithAPI = async (query) => {
  const apiKey = process.env.SCRAPING_API_KEY;
  
  if (!apiKey) {
    return [];
  }

  const stores = [];
  
  try {
    // Example: Search Google for Shopify stores
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    
    const html = await getHTMLWithAPI(searchUrl);
    if (!html) {
      return stores;
    }

    const $ = cheerio.load(html);
    
    // Extract URLs from search results
    $('a[href]').each((i, elem) => {
      const href = $(elem).attr('href');
      if (href) {
        // Extract actual URL from Google's redirect
        const urlMatch = href.match(/\/url\?q=([^&]+)/);
        if (urlMatch) {
          const url = decodeURIComponent(urlMatch[1]);
          if (url.includes('.myshopify.com') || url.includes('shopify.com/store/')) {
            // Normalize URL to root homepage only
            const normalizedUrl = normalizeUrlToRoot(url);
            if (normalizedUrl) {
              stores.push({
                url: normalizedUrl,
                source: 'Search Engine (ScrapingAPI)',
              });
            }
          }
        } else if (href.startsWith('http') && (href.includes('.myshopify.com') || href.includes('shopify.com/store/'))) {
          // Normalize URL to root homepage only
          const normalizedUrl = normalizeUrlToRoot(href);
          if (normalizedUrl) {
            stores.push({
              url: normalizedUrl,
              source: 'Search Engine (ScrapingAPI)',
            });
          }
        }
      }
    });
  } catch (error) {
    console.error('Error searching with ScrapingAPI:', error.message);
  }

  return stores;
};
