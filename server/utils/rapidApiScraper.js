import axios from 'axios';
import { looksLikeShopifyStore } from './shopifyUrlValidator.js';

/**
 * Discover Shopify stores using RapidAPI
 * Strategy: Use RapidAPI marketplace APIs + domain verification to find Shopify stores
 */
export const scrapeRapidApi = async () => {
  const stores = [];
  const apiKey = process.env.RAPIDAPI_KEY;
  const seenUrls = new Set();

  if (!apiKey) {
    console.log('⚠️  RapidAPI key not configured, skipping RapidAPI scraping');
    return stores;
  }

  try {
    console.log('🔍 Using RapidAPI to discover Shopify stores...');

    // Strategy 1: Use RapidAPI Website Technology Detector for domain verification
    const potentialDomains = await getPotentialDomainsForRapidApi();
    
    if (potentialDomains.length > 0) {
      console.log(`   Verifying ${potentialDomains.length} potential domains with RapidAPI...`);
      
      // Verify domains in batches
      const batchSize = 5; // Conservative batch size for rate limits
      for (let i = 0; i < Math.min(potentialDomains.length, 50); i += batchSize) {
        const batch = potentialDomains.slice(i, i + batchSize);
        
        await Promise.all(
          batch.map(async (domain) => {
            try {
              const techInfo = await detectTechRapidApi(domain);
              if (techInfo && techInfo.isShopify) {
                const url = domain.startsWith('http') ? domain : `https://${domain}`;
                const normalized = url.toLowerCase().replace(/\/$/, '');
                
                if (!seenUrls.has(normalized)) {
                  seenUrls.add(normalized);
                  stores.push({
                    url,
                    source: 'RapidAPI',
                  });
                }
              }
            } catch (error) {
              // Skip errors for individual domains
            }
          })
        );
        
        // Rate limiting
        if (i + batchSize < potentialDomains.length) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    // Strategy 2: Use RapidAPI WHOIS API to find newly registered domains
    // Then verify if they're Shopify stores
    try {
      const whoisStores = await discoverViaRapidApiWhois(apiKey);
      for (const store of whoisStores) {
        const normalized = store.url.toLowerCase().replace(/\/$/, '');
        if (!seenUrls.has(normalized)) {
          seenUrls.add(normalized);
          stores.push(store);
        }
      }
    } catch (error) {
      console.log('   RapidAPI WHOIS discovery not available');
    }

    console.log(`   Found ${stores.length} Shopify stores from RapidAPI`);
  } catch (error) {
    console.error('Error in RapidAPI scraper:', error.message);
  }

  return stores;
};

/**
 * Get potential domains for RapidAPI verification
 */
const getPotentialDomainsForRapidApi = async () => {
  const domains = [];
  
  try {
    // Source 1: Common .myshopify.com patterns
    const commonPrefixes = [
      'store', 'shop', 'storefront', 'my', 'new', 'test', 'demo', 'app',
      'store1', 'shop1', 'store2', 'shop2', 'mystore', 'myshop', 'online', 'web'
    ];
    for (const prefix of commonPrefixes) {
      domains.push(`https://${prefix}.myshopify.com`);
    }
    
    // Source 2: Use search engines to find potential domains
    if (process.env.SCRAPING_API_KEY || process.env.SERPER_API_KEY || process.env.SERPAPI_KEY) {
      try {
        const { searchShopifyStoresWithAPI } = await import('./scrapingApi.js');
        const searchQueries = [
          'site:myshopify.com',
          'myshopify.com store',
        ];
        
        for (const query of searchQueries.slice(0, 2)) {
          try {
            const foundStores = await searchShopifyStoresWithAPI(query);
            for (const store of foundStores.slice(0, 25)) {
              if (store.url) {
                domains.push(store.url);
              }
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (error) {
            // Continue on error
          }
        }
      } catch (error) {
        // Search API not available
      }
    }
    
    // Remove duplicates
    const uniqueDomains = [...new Set(domains)];
    return uniqueDomains.slice(0, 50); // Limit to 50 domains (more conservative for RapidAPI)
    
  } catch (error) {
    console.error('Error getting potential domains for RapidAPI:', error.message);
  }
  
  return domains;
};

/**
 * Discover stores via RapidAPI WHOIS API
 * Finds newly registered domains and verifies if they're Shopify
 */
const discoverViaRapidApiWhois = async (apiKey) => {
  const stores = [];
  
  try {
    // RapidAPI WHOIS API endpoint
    // This would use RapidAPI's WHOIS service to find new domains
    // Then verify if they're Shopify stores
    
    // Example: Get recently registered domains
    // Note: Actual endpoint depends on RapidAPI marketplace service
    const whoisApiUrl = 'https://whois-api.p.rapidapi.com/v1/whois';
    
    // This is a placeholder - actual implementation depends on available RapidAPI WHOIS service
    // You would:
    // 1. Get list of recently registered domains
    // 2. Filter for potential Shopify stores
    // 3. Verify with technology detector
    
    console.log('   RapidAPI WHOIS discovery requires specific RapidAPI service subscription');
    
  } catch (error) {
    console.error('Error in RapidAPI WHOIS discovery:', error.message);
  }
  
  return stores;
};

/**
 * Detect technology using RapidAPI Website Technology Detector
 * Can help identify if a domain is a Shopify store
 */
export const detectTechRapidApi = async (url) => {
  const apiKey = process.env.RAPIDAPI_KEY;

  if (!apiKey) {
    return null;
  }

  try {
    const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;

    // RapidAPI endpoint (check their marketplace for exact endpoint)
    // This is a placeholder - adjust based on actual RapidAPI endpoint
    const apiUrl = 'https://website-technology-detector.p.rapidapi.com/detect';
    
    const response = await axios.post(apiUrl, {
      url: normalizedUrl,
    }, {
      headers: {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': 'website-technology-detector.p.rapidapi.com',
      },
      timeout: 10000,
    });

    if (response.data && response.data.technologies) {
      const hasShopify = response.data.technologies.some(tech => 
        tech.name && tech.name.toLowerCase().includes('shopify')
      );
      
      return {
        isShopify: hasShopify,
        technologies: response.data.technologies,
      };
    }

    return null;
  } catch (error) {
    console.error(`Error detecting tech with RapidAPI for ${url}:`, error.message);
    return null;
  }
};

