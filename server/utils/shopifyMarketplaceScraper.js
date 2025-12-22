import axios from 'axios';
import * as cheerio from 'cheerio';
import { looksLikeShopifyStore } from './shopifyUrlValidator.js';
import { getHTMLWithAPI } from './scrapingApi.js';

/**
 * Scrape Shopify App Store for store links
 * Finds stores mentioned in app reviews, descriptions, and examples
 */
export const scrapeShopifyMarketplace = async () => {
  const stores = [];
  const seenUrls = new Set();
  
  try {
    console.log('🛍️  Scraping Shopify App Store for Shopify stores...');
    
    // Shopify App Store categories that might mention stores
    const appCategories = [
      'https://apps.shopify.com/browse',
      'https://apps.shopify.com/browse/sales',
      'https://apps.shopify.com/browse/marketing',
      'https://apps.shopify.com/browse/store-design',
      'https://apps.shopify.com/browse/customer-service',
    ];
    
    // Popular apps that might have store examples
    const popularApps = [
      'https://apps.shopify.com/oberlo',
      'https://apps.shopify.com/printful',
      'https://apps.shopify.com/klaviyo',
      'https://apps.shopify.com/shopify-inbox',
      'https://apps.shopify.com/facebook-channel',
    ];
    
    const urlsToScrape = [...appCategories, ...popularApps];
    
    for (const url of urlsToScrape) {
      try {
        let html = null;
        
        // Use ScrapingAPI if available
        if (process.env.SCRAPING_API_KEY) {
          html = await getHTMLWithAPI(url);
        }
        
        if (!html) {
          // Fallback to direct request
          const response = await axios.get(url, {
            timeout: 15000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.9',
            },
            maxRedirects: 5,
          });
          html = response.data;
        }
        
        if (html) {
          const $ = cheerio.load(html);
          
          // Extract all URLs from the page
          const urlRegex = /(https?:\/\/[^\s"<>]+)/g;
          const pageText = $('body').text();
          const urls = pageText.match(urlRegex) || [];
          
          // Also check anchor tags
          $('a[href]').each((i, elem) => {
            const href = $(elem).attr('href');
            if (href && href.startsWith('http')) {
              urls.push(href);
            } else if (href && href.startsWith('/')) {
              // Relative URL - make it absolute
              urls.push(`https://apps.shopify.com${href}`);
            }
          });
          
          for (const url of urls) {
            if (looksLikeShopifyStore(url)) {
              const cleanUrl = url.trim().replace(/[.,;!?]+$/, '');
              const normalizedUrl = cleanUrl.toLowerCase().replace(/\/$/, '');
              
              if (!seenUrls.has(normalizedUrl)) {
                seenUrls.add(normalizedUrl);
                stores.push({
                  url: cleanUrl.split('?')[0].split('#')[0],
                  source: 'Shopify Marketplace',
                });
              }
            }
          }
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        if (error.response?.status === 403 || error.response?.status === 401) {
          console.log(`   Shopify Marketplace requires authentication for: ${url}`);
        } else {
          console.error(`   Error scraping Shopify Marketplace: ${url}`, error.message);
        }
      }
    }
    
    console.log(`   Found ${stores.length} unique Shopify store URLs from Shopify Marketplace`);
  } catch (error) {
    console.error('Error in Shopify Marketplace scraper:', error.message);
  }

  return stores;
};
