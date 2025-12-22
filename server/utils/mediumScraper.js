import axios from 'axios';
import * as cheerio from 'cheerio';
import { looksLikeShopifyStore } from './shopifyUrlValidator.js';
import { getHTMLWithAPI } from './scrapingApi.js';

/**
 * Scrape Medium for Shopify store links
 * Medium articles often mention Shopify stores in tutorials and case studies
 */
export const scrapeMedium = async () => {
  const stores = [];
  const seenUrls = new Set();
  
  try {
    console.log('📝 Scraping Medium for Shopify stores...');
    
    // Medium search and topic pages
    const mediumUrls = [
      'https://medium.com/tag/shopify',
      'https://medium.com/tag/ecommerce',
      'https://medium.com/tag/dropshipping',
      'https://medium.com/search?q=myshopify.com',
      'https://medium.com/search?q=shopify%20store',
    ];
    
    for (const url of mediumUrls) {
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
          
          // Extract URLs from articles
          const urlRegex = /(https?:\/\/[^\s"<>]+)/g;
          const pageText = $('body').text();
          const urls = pageText.match(urlRegex) || [];
          
          // Check article links
          $('a[href^="http"]').each((i, elem) => {
            const href = $(elem).attr('href');
            if (href && !href.includes('medium.com')) {
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
                  source: 'Medium',
                });
              }
            }
          }
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`   Error scraping Medium: ${url}`, error.message);
      }
    }
    
    console.log(`   Found ${stores.length} unique Shopify store URLs from Medium`);
  } catch (error) {
    console.error('Error in Medium scraper:', error.message);
  }

  return stores;
};
