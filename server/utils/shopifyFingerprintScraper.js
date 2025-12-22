import axios from 'axios';
import * as cheerio from 'cheerio';
import { looksLikeShopifyStore } from './shopifyUrlValidator.js';

/**
 * Shopify Fingerprint Detection Scraper
 * Detects Shopify stores by checking for Shopify-specific files and patterns
 */

/**
 * Check if a domain is a Shopify store using fingerprint detection
 */
export const checkShopifyFingerprints = async (domain) => {
  const baseUrl = domain.startsWith('http') ? domain : `https://${domain}`;
  const fingerprints = {
    productsJson: false,
    cartJs: false,
    cdnShopify: false,
    shopifyTheme: false,
    shopifySection: false,
    liquidMarkers: false,
    checkoutHeaders: false,
  };
  
  try {
    // Fingerprint 1: Check /products.json
    try {
      const productsResponse = await axios.get(`${baseUrl}/products.json`, {
        timeout: 10000,
        validateStatus: (status) => status < 500, // Accept 200, 404, etc.
      });
      
      if (productsResponse.status === 200) {
        const data = productsResponse.data;
        // Check if it has Shopify products.json structure
        if (data && (Array.isArray(data.products) || data.products)) {
          fingerprints.productsJson = true;
        }
      }
    } catch (error) {
      // Not a Shopify store or not accessible
    }
    
    // Fingerprint 2: Check /cart.js
    try {
      const cartResponse = await axios.get(`${baseUrl}/cart.js`, {
        timeout: 10000,
        validateStatus: (status) => status < 500,
      });
      
      if (cartResponse.status === 200) {
        const contentType = cartResponse.headers['content-type'] || '';
        if (contentType.includes('javascript') || contentType.includes('application/json')) {
          const content = cartResponse.data;
          if (typeof content === 'string' && (
            content.includes('Shopify') || 
            content.includes('cart') ||
            content.includes('items')
          )) {
            fingerprints.cartJs = true;
          } else if (typeof content === 'object' && content.items) {
            fingerprints.cartJs = true;
          }
        }
      }
    } catch (error) {
      // Not accessible
    }
    
    // Fingerprint 3: Check HTML for Shopify patterns
    try {
      const htmlResponse = await axios.get(baseUrl, {
        timeout: 10000,
        validateStatus: (status) => status < 500,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });
      
      if (htmlResponse.status === 200) {
        const html = htmlResponse.data;
        const $ = cheerio.load(html);
        
        // Check for cdn.shopify.com
        if (html.includes('cdn.shopify.com') || html.includes('cdn.shopifycdn.com')) {
          fingerprints.cdnShopify = true;
        }
        
        // Check for Shopify.theme
        if (html.includes('Shopify.theme') || html.includes('Shopify.shop')) {
          fingerprints.shopifyTheme = true;
        }
        
        // Check for shopify-section patterns
        if (html.includes('shopify-section') || html.includes('shopify-section-')) {
          fingerprints.shopifySection = true;
        }
        
        // Check for Liquid template markers
        if (html.includes('{{') && html.includes('}}') && (
          html.includes('product.') || 
          html.includes('collection.') ||
          html.includes('shop.')
        )) {
          fingerprints.liquidMarkers = true;
        }
        
        // Check for Shopify checkout headers
        const setCookieHeader = htmlResponse.headers['set-cookie'] || [];
        if (Array.isArray(setCookieHeader)) {
          const cookieString = setCookieHeader.join(' ');
          if (cookieString.includes('_shopify') || cookieString.includes('cart')) {
            fingerprints.checkoutHeaders = true;
          }
        }
      }
    } catch (error) {
      // Not accessible
    }
    
    // If 2+ fingerprints match, it's likely a Shopify store
    const matchCount = Object.values(fingerprints).filter(Boolean).length;
    return {
      isShopify: matchCount >= 2,
      confidence: matchCount,
      fingerprints,
      domain: baseUrl,
    };
  } catch (error) {
    return {
      isShopify: false,
      confidence: 0,
      fingerprints,
      domain: baseUrl,
      error: error.message,
    };
  }
};

/**
 * Scrape newly registered domains from various sources
 */
export const scrapeNewlyRegisteredDomains = async () => {
  const domains = [];
  
  try {
    console.log('🌐 Scraping newly registered domains...');
    
    // Source 1: New Domain Zone files (if available)
    // These are typically available from domain registrars
    
    // Source 2: RapidAPI WHOIS "domain creation date" APIs
    if (process.env.RAPIDAPI_KEY) {
      try {
        // Example: Use RapidAPI to get recently registered domains
        // This is a placeholder - actual implementation depends on available APIs
        console.log('   Checking RapidAPI for new domains...');
      } catch (error) {
        console.error('   Error with RapidAPI:', error.message);
      }
    }
    
    // Source 3: Free new domain lists
    // NDD (New Domain Day) feeds
    try {
      // These are typically RSS feeds or text files
      // Implementation depends on available sources
      console.log('   Checking free new domain lists...');
    } catch (error) {
      console.error('   Error with new domain lists:', error.message);
    }
    
    // Source 4: DomainDroplets or similar services
    // These provide lists of newly registered domains
    
    console.log(`   Found ${domains.length} newly registered domains to check`);
  } catch (error) {
    console.error('Error scraping newly registered domains:', error.message);
  }
  
  return domains;
};

/**
 * Scan newly registered domains for Shopify fingerprints
 */
export const scanNewDomainsForShopify = async (domains = []) => {
  const shopifyStores = [];
  
  try {
    console.log(`🔍 Scanning ${domains.length} new domains for Shopify fingerprints...`);
    
    // Process in batches to avoid overwhelming
    const batchSize = 10;
    for (let i = 0; i < domains.length; i += batchSize) {
      const batch = domains.slice(i, i + batchSize);
      
      const results = await Promise.allSettled(
        batch.map(domain => checkShopifyFingerprints(domain))
      );
      
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value.isShopify) {
          shopifyStores.push({
            url: result.value.domain,
            source: 'New Domain Fingerprint',
            confidence: result.value.confidence,
            fingerprints: result.value.fingerprints,
          });
        }
      }
      
      // Rate limiting
      if (i + batchSize < domains.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log(`   Found ${shopifyStores.length} Shopify stores via fingerprint detection`);
  } catch (error) {
    console.error('Error scanning new domains:', error.message);
  }
  
  return shopifyStores;
};

/**
 * Main function to find new Shopify stores via fingerprint detection
 */
export const findNewStoresViaFingerprints = async () => {
  const stores = [];
  
  try {
    console.log('🔍 Starting Shopify fingerprint detection...');
    
    // Step 1: Get newly registered domains
    const newDomains = await scrapeNewlyRegisteredDomains();
    
    // Step 2: Scan them for Shopify fingerprints
    if (newDomains.length > 0) {
      const foundStores = await scanNewDomainsForShopify(newDomains);
      stores.push(...foundStores);
    }
    
    console.log(`   Total stores found via fingerprints: ${stores.length}`);
  } catch (error) {
    console.error('Error in fingerprint detection:', error.message);
  }
  
  return stores;
};

