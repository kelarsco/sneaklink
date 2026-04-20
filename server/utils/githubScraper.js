import axios from 'axios';
import * as cheerio from 'cheerio';
import { looksLikeShopifyStore } from './shopifyUrlValidator.js';
import { getHTMLWithAPI } from './scrapingApi.js';

/**
 * Scrape GitHub for Shopify store links
 * Searches GitHub repositories, README files, and issues for Shopify store URLs
 */
export const scrapeGitHub = async () => {
  const stores = [];
  const seenUrls = new Set();
  
  try {
    console.log('💻 Scraping GitHub for Shopify stores...');
    
    // GitHub search queries for Shopify stores
    const searchQueries = [
      'myshopify.com',
      'shopify store',
      'shopify theme',
      'shopify app',
    ];
    
    // GitHub search API (public, no auth required for basic searches)
    for (const query of searchQueries) {
      try {
        // Search GitHub repositories
        const searchUrl = `https://github.com/search?q=${encodeURIComponent(query)}&type=repositories&s=updated`;
        
        let html = null;
        
        // Use ScrapingAPI if available
        if (process.env.SCRAPING_API_KEY) {
          html = await getHTMLWithAPI(searchUrl);
        }
        
        if (!html) {
          // Direct request
          const response = await axios.get(searchUrl, {
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
          
          // Extract URLs from search results
          const urlRegex = /(https?:\/\/[^\s"<>]+)/g;
          const pageText = $('body').text();
          const urls = pageText.match(urlRegex) || [];
          
          // Check repository links and README content
          $('a[href*="github.com"]').each((i, elem) => {
            const href = $(elem).attr('href');
            if (href && href.includes('github.com')) {
              // This is a GitHub repo link, we'd need to fetch the repo to find store URLs
              // For now, we'll extract from the search results page
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
                  source: 'GitHub',
                });
              }
            }
          }
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        if (error.response?.status === 403) {
          console.log(`   GitHub rate limit reached for: ${query}`);
          break; // Stop if rate limited
        } else {
          console.error(`   Error searching GitHub for "${query}":`, error.message);
        }
      }
    }
    
    console.log(`   Found ${stores.length} unique Shopify store URLs from GitHub`);
  } catch (error) {
    console.error('Error in GitHub scraper:', error.message);
  }

  return stores;
};
