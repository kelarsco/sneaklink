import axios from 'axios';
import * as cheerio from 'cheerio';
import { looksLikeShopifyStore } from './shopifyUrlValidator.js';
import { getHTMLWithAPI } from './scrapingApi.js';
import { normalizeUrlToRoot } from './urlNormalizer.js';

/**
 * Scrape Shopify Theme Showcase for live store examples
 * The theme showcase features real stores using different themes
 */
export const scrapeShopifyThemeShowcase = async () => {
  const stores = [];
  const seenUrls = new Set();
  
  try {
    console.log('🎨 Scraping Shopify Theme Showcase for stores...');
    
    // Shopify Theme Store categories and showcase pages
    const showcaseUrls = [
      'https://themes.shopify.com/',
      'https://themes.shopify.com/themes',
      'https://themes.shopify.com/themes?sort_by=popular',
      'https://themes.shopify.com/themes?sort_by=newest',
      'https://themes.shopify.com/themes?sort_by=trending',
      'https://themes.shopify.com/themes?category=clothing',
      'https://themes.shopify.com/themes?category=electronics',
      'https://themes.shopify.com/themes?category=food-and-drink',
      'https://themes.shopify.com/themes?category=home-and-garden',
      'https://themes.shopify.com/themes?category=jewelry',
      'https://themes.shopify.com/themes?category=beauty',
      'https://themes.shopify.com/themes?category=art-and-crafts',
      'https://themes.shopify.com/themes?category=sports-and-recreation',
      'https://themes.shopify.com/themes?category=health-and-wellness',
      'https://themes.shopify.com/themes?category=books-and-music',
      'https://themes.shopify.com/themes?category=toys-and-games',
    ];
    
    for (const url of showcaseUrls) {
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
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
            maxRedirects: 5,
          });
          html = response.data;
        }
        
        if (html) {
          const $ = cheerio.load(html);
          
          // Extract store URLs from theme preview links and showcase examples
          // Theme showcase pages often link to live store examples
          $('a[href*="myshopify.com"], a[href*="shopify.com"]').each((i, elem) => {
            const href = $(elem).attr('href');
            if (href) {
              // Extract URLs from href attributes
              const urlMatch = href.match(/(https?:\/\/[^\s"<>]+)/);
              if (urlMatch) {
                const foundUrl = urlMatch[1];
                if (looksLikeShopifyStore(foundUrl)) {
                  const cleanUrl = foundUrl.trim().replace(/[.,;!?]+$/, '');
                  // Normalize URL to root homepage only
                  const normalizedUrl = normalizeUrlToRoot(cleanUrl);
                  
                  if (normalizedUrl && !seenUrls.has(normalizedUrl.toLowerCase())) {
                    seenUrls.add(normalizedUrl.toLowerCase());
                    stores.push({
                      url: normalizedUrl,
                      source: 'Shopify Theme Showcase',
                    });
                  }
                }
              }
            }
          });
          
          // Also extract from text content
          const pageText = $('body').text();
          const urlRegex = /(https?:\/\/[^\s"<>]+)/g;
          const urls = pageText.match(urlRegex) || [];
          
          for (const url of urls) {
            if (looksLikeShopifyStore(url)) {
              const cleanUrl = url.trim().replace(/[.,;!?]+$/, '');
              // Normalize URL to root homepage only
              const normalizedUrl = normalizeUrlToRoot(cleanUrl);
              
              if (normalizedUrl && !seenUrls.has(normalizedUrl.toLowerCase())) {
                seenUrls.add(normalizedUrl.toLowerCase());
                stores.push({
                  url: normalizedUrl,
                  source: 'Shopify Theme Showcase',
                });
              }
            }
          }
          
          // Look for theme demo links (themes often have live demo stores)
          $('[data-demo-url], [data-preview-url], [data-store-url]').each((i, elem) => {
            const demoUrl = $(elem).attr('data-demo-url') || 
                          $(elem).attr('data-preview-url') || 
                          $(elem).attr('data-store-url');
            if (demoUrl && looksLikeShopifyStore(demoUrl)) {
              const cleanUrl = demoUrl.trim().replace(/[.,;!?]+$/, '');
              // Normalize URL to root homepage only
              const normalizedUrl = normalizeUrlToRoot(cleanUrl);
              
              if (normalizedUrl && !seenUrls.has(normalizedUrl.toLowerCase())) {
                seenUrls.add(normalizedUrl.toLowerCase());
                stores.push({
                  url: normalizedUrl,
                  source: 'Shopify Theme Showcase',
                });
              }
            }
          });
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`   Error scraping theme showcase URL ${url}:`, error.message);
      }
    }
    
    console.log(`   Found ${stores.length} unique stores from Shopify Theme Showcase`);
  } catch (error) {
    console.error('Error in Shopify Theme Showcase scraper:', error.message);
  }
  
  return stores;
};

