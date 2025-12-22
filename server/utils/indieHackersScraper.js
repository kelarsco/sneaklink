import axios from 'axios';
import * as cheerio from 'cheerio';
import { looksLikeShopifyStore } from './shopifyUrlValidator.js';
import { getHTMLWithAPI } from './scrapingApi.js';

/**
 * Scrape Indie Hackers for Shopify stores
 * Indie Hackers often features Shopify store owners and their stores
 */
export const scrapeIndieHackers = async () => {
  const stores = [];
  const seenUrls = new Set();
  
  try {
    console.log('💼 Scraping Indie Hackers for Shopify stores...');
    
    // Indie Hackers pages that might mention Shopify stores
    const indieHackerUrls = [
      'https://www.indiehackers.com/products?topics=shopify',
      'https://www.indiehackers.com/products?topics=ecommerce',
      'https://www.indiehackers.com/search?q=shopify',
    ];
    
    for (const url of indieHackerUrls) {
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
          
          // Extract URLs from product listings and discussions
          const urlRegex = /(https?:\/\/[^\s"<>]+)/g;
          const pageText = $('body').text();
          const urls = pageText.match(urlRegex) || [];
          
          // Check for product website links
          $('a[href^="http"]').each((i, elem) => {
            const href = $(elem).attr('href');
            if (href && !href.includes('indiehackers.com')) {
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
                  source: 'Indie Hackers',
                });
              }
            }
          }
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`   Error scraping Indie Hackers: ${url}`, error.message);
      }
    }
    
    console.log(`   Found ${stores.length} unique Shopify store URLs from Indie Hackers`);
  } catch (error) {
    console.error('Error in Indie Hackers scraper:', error.message);
  }

  return stores;
};
