import axios from 'axios';
import * as cheerio from 'cheerio';
import { looksLikeShopifyStore } from './shopifyUrlValidator.js';
import { getHTMLWithAPI } from './scrapingApi.js';

/**
 * Scrape Product Hunt for Shopify stores
 * Product Hunt often features Shopify stores and ecommerce products
 */
export const scrapeProductHunt = async () => {
  const stores = [];
  const seenUrls = new Set();
  
  try {
    console.log('🚀 Scraping Product Hunt for Shopify stores...');
    
    // Product Hunt search and browse pages
    const productHuntUrls = [
      'https://www.producthunt.com/topics/shopify',
      'https://www.producthunt.com/topics/ecommerce',
      'https://www.producthunt.com/topics/dropshipping',
      'https://www.producthunt.com/search?q=shopify',
    ];
    
    for (const url of productHuntUrls) {
      try {
        let html = null;
        
        // Use ScrapingAPI if available
        if (process.env.SCRAPING_API_KEY) {
          html = await getHTMLWithAPI(url);
        }
        
        if (!html) {
          // Direct request
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
          
          // Extract URLs from product listings
          // Product Hunt products often link to Shopify stores
          const urlRegex = /(https?:\/\/[^\s"<>]+)/g;
          const pageText = $('body').text();
          const urls = pageText.match(urlRegex) || [];
          
          // Check for product links
          $('a[href^="http"]').each((i, elem) => {
            const href = $(elem).attr('href');
            if (href && !href.includes('producthunt.com')) {
              urls.push(href);
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
                  source: 'Product Hunt',
                });
              }
            }
          }
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`   Error scraping Product Hunt: ${url}`, error.message);
      }
    }
    
    console.log(`   Found ${stores.length} unique Shopify store URLs from Product Hunt`);
  } catch (error) {
    console.error('Error in Product Hunt scraper:', error.message);
  }

  return stores;
};
