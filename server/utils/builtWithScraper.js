import axios from 'axios';
import { looksLikeShopifyStore } from './shopifyUrlValidator.js';

/**
 * Discover Shopify stores using BuiltWith API
 * Strategy: Use domain lists + BuiltWith verification to find Shopify stores
 */
export const scrapeBuiltWith = async () => {
  const stores = [];
  const apiKey = process.env.BUILTWITH_API_KEY;
  const seenUrls = new Set();

  if (!apiKey) {
    console.log('⚠️  BuiltWith API key not configured, skipping BuiltWith scraping');
    return stores;
  }

  try {
    console.log('🔍 Using BuiltWith API to discover Shopify stores...');

    // Strategy 1: Use BuiltWith's technology search (if available)
    // BuiltWith API may support searching by technology
    try {
      // Try BuiltWith's technology search endpoint
      // Note: This depends on BuiltWith API capabilities
      const techSearchUrl = `https://api.builtwith.com/v20/api.json?KEY=${apiKey}&TECH=Shopify`;
      
      try {
        const response = await axios.get(techSearchUrl, {
          timeout: 15000,
        });

        if (response.data && response.data.Results) {
          for (const result of response.data.Results) {
            if (result.Domain) {
              const domain = result.Domain;
              const url = domain.startsWith('http') ? domain : `https://${domain}`;
              const normalized = url.toLowerCase().replace(/\/$/, '');
              
              if (!seenUrls.has(normalized) && looksLikeShopifyStore(url)) {
                seenUrls.add(normalized);
                stores.push({
                  url,
                  source: 'BuiltWith',
                });
              }
            }
          }
        }
      } catch (error) {
        // Technology search may not be available in free tier
        console.log('   BuiltWith technology search not available, using domain verification method');
      }
    } catch (error) {
      // Continue to alternative method
    }

    // Strategy 2: Use domain lists and verify with BuiltWith
    // Get potential domains from various sources and verify
    const potentialDomains = await getPotentialDomainsForVerification();
    
    if (potentialDomains.length > 0) {
      console.log(`   Verifying ${potentialDomains.length} potential domains with BuiltWith...`);
      
      // Batch verify domains (limit to avoid rate limits)
      const batchSize = 10;
      for (let i = 0; i < Math.min(potentialDomains.length, 50); i += batchSize) {
        const batch = potentialDomains.slice(i, i + batchSize);
        
        await Promise.all(
          batch.map(async (domain) => {
            try {
              const info = await getBuiltWithInfo(domain);
              if (info && info.isShopify) {
                const url = domain.startsWith('http') ? domain : `https://${domain}`;
                const normalized = url.toLowerCase().replace(/\/$/, '');
                
                if (!seenUrls.has(normalized)) {
                  seenUrls.add(normalized);
                  stores.push({
                    url,
                    source: 'BuiltWith',
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

    console.log(`   Found ${stores.length} Shopify stores from BuiltWith API`);
  } catch (error) {
    console.error('Error in BuiltWith scraper:', error.message);
  }

  return stores;
};

/**
 * Get potential domains for verification
 * Uses various sources to get domain lists
 */
const getPotentialDomainsForVerification = async () => {
  const domains = [];
  
  try {
    // Source 1: Common .myshopify.com domain patterns
    const commonPrefixes = [
      'store', 'shop', 'storefront', 'my', 'new', 'test', 'demo', 'app',
      'store1', 'shop1', 'store2', 'shop2', 'mystore', 'myshop'
    ];
    for (const prefix of commonPrefixes) {
      domains.push(`https://${prefix}.myshopify.com`);
    }
    
    // Source 2: Use search engines to find potential domains
    // Integrate with search API if available
    if (process.env.SCRAPING_API_KEY || process.env.SERPER_API_KEY || process.env.SERPAPI_KEY) {
      try {
        const { searchShopifyStoresWithAPI } = await import('./scrapingApi.js');
        const searchQueries = [
          'site:myshopify.com',
          'myshopify.com store',
          'shopify store',
        ];
        
        for (const query of searchQueries.slice(0, 3)) { // Limit to 3 queries
          try {
            const foundStores = await searchShopifyStoresWithAPI(query);
            for (const store of foundStores.slice(0, 20)) { // Limit to 20 per query
              if (store.url) {
                domains.push(store.url);
              }
            }
            await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit
          } catch (error) {
            // Continue on error
          }
        }
      } catch (error) {
        // Search API not available, continue
      }
    }
    
    // Source 3: Use Common Crawl patterns (if available)
    // This would integrate with Common Crawl scraper
    
    // Remove duplicates
    const uniqueDomains = [...new Set(domains)];
    return uniqueDomains.slice(0, 100); // Limit to 100 domains
    
  } catch (error) {
    console.error('Error getting potential domains:', error.message);
  }
  
  return domains;
};

/**
 * Get technology information using BuiltWith API
 * Can help identify if a domain is a Shopify store
 */
export const getBuiltWithInfo = async (url) => {
  const apiKey = process.env.BUILTWITH_API_KEY;

  if (!apiKey) {
    return null;
  }

  try {
    const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
    const urlObj = new URL(normalizedUrl);
    const domain = urlObj.hostname;

    // BuiltWith API endpoint (check their documentation for exact endpoint)
    // This is a placeholder - adjust based on actual BuiltWith API documentation
    const apiUrl = `https://api.builtwith.com/v20/api.json?KEY=${apiKey}&LOOKUP=${domain}`;
    
    const response = await axios.get(apiUrl, {
      timeout: 10000,
    });

    if (response.data && response.data.Results) {
      const results = response.data.Results[0];
      
      // Check if Shopify is in the technology stack
      if (results.Result && results.Result.Paths) {
        for (const path of results.Result.Paths) {
          if (path.Technologies) {
            for (const tech of path.Technologies) {
              if (tech.Name && tech.Name.toLowerCase().includes('shopify')) {
                return {
                  isShopify: true,
                  technologies: path.Technologies,
                };
              }
            }
          }
        }
      }
    }

    return null;
  } catch (error) {
    console.error(`Error getting BuiltWith info for ${url}:`, error.message);
    return null;
  }
};

