import axios from 'axios';
import { looksLikeShopifyStore } from './shopifyUrlValidator.js';

/**
 * Discover Shopify stores using Wappalyzer API
 * Strategy: Use domain lists + Wappalyzer verification to find Shopify stores
 */
export const scrapeWappalyzer = async () => {
  const stores = [];
  const apiKey = process.env.WAPPALYZER_API_KEY;
  const seenUrls = new Set();

  if (!apiKey) {
    console.log('⚠️  Wappalyzer API key not configured, skipping Wappalyzer scraping');
    return stores;
  }

  try {
    console.log('🔍 Using Wappalyzer API to discover Shopify stores...');

    // Strategy 1: Batch verify domains from potential sources
    const potentialDomains = await getPotentialDomainsForWappalyzer();
    
    if (potentialDomains.length > 0) {
      console.log(`   Verifying ${potentialDomains.length} potential domains with Wappalyzer...`);
      
      // Wappalyzer supports batch lookups
      const batchSize = 10; // Wappalyzer API batch limit
      for (let i = 0; i < Math.min(potentialDomains.length, 100); i += batchSize) {
        const batch = potentialDomains.slice(i, i + batchSize);
        
        try {
          // Batch lookup
          const domainsString = batch.map(d => {
            const url = d.startsWith('http') ? d : `https://${d}`;
            const urlObj = new URL(url);
            return urlObj.hostname;
          }).join(',');
          
          const apiUrl = `https://api.wappalyzer.com/v2/lookup?urls=${domainsString}`;
          
          const response = await axios.get(apiUrl, {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
            },
            timeout: 15000,
          });

          if (response.data && Array.isArray(response.data)) {
            for (const techStack of response.data) {
              if (techStack.url && techStack.technologies) {
                const hasShopify = techStack.technologies.some(tech => 
                  tech.name && tech.name.toLowerCase().includes('shopify')
                );
                
                if (hasShopify) {
                  const url = techStack.url.startsWith('http') 
                    ? techStack.url 
                    : `https://${techStack.url}`;
                  const normalized = url.toLowerCase().replace(/\/$/, '');
                  
                  if (!seenUrls.has(normalized) && looksLikeShopifyStore(url)) {
                    seenUrls.add(normalized);
                    stores.push({
                      url,
                      source: 'Wappalyzer',
                    });
                  }
                }
              }
            }
          }
        } catch (error) {
          // If batch fails, try individual lookups
          for (const domain of batch) {
            try {
              const techStack = await detectTechStack(domain);
              if (techStack && techStack.isShopify) {
                const url = domain.startsWith('http') ? domain : `https://${domain}`;
                const normalized = url.toLowerCase().replace(/\/$/, '');
                
                if (!seenUrls.has(normalized)) {
                  seenUrls.add(normalized);
                  stores.push({
                    url,
                    source: 'Wappalyzer',
                  });
                }
              }
            } catch (err) {
              // Skip individual errors
            }
          }
        }
        
        // Rate limiting
        if (i + batchSize < potentialDomains.length) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    console.log(`   Found ${stores.length} Shopify stores from Wappalyzer API`);
  } catch (error) {
    console.error('Error in Wappalyzer scraper:', error.message);
  }

  return stores;
};

/**
 * Get potential domains for Wappalyzer verification
 */
const getPotentialDomainsForWappalyzer = async () => {
  const domains = [];
  
  try {
    // Source 1: Common .myshopify.com patterns
    const commonPrefixes = [
      'store', 'shop', 'storefront', 'my', 'new', 'test', 'demo', 'app',
      'store1', 'shop1', 'store2', 'shop2', 'mystore', 'myshop', 'online'
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
            for (const store of foundStores.slice(0, 30)) {
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
    return uniqueDomains.slice(0, 100); // Limit to 100 domains
    
  } catch (error) {
    console.error('Error getting potential domains for Wappalyzer:', error.message);
  }
  
  return domains;
};

/**
 * Detect technology stack using Wappalyzer API
 * Can help identify if a domain is a Shopify store
 */
export const detectTechStack = async (url) => {
  const apiKey = process.env.WAPPALYZER_API_KEY;

  if (!apiKey) {
    return null;
  }

  try {
    const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
    const urlObj = new URL(normalizedUrl);
    const domain = urlObj.hostname;

    // Wappalyzer API endpoint (check their documentation for exact endpoint)
    // This is a placeholder - adjust based on actual Wappalyzer API documentation
    const apiUrl = `https://api.wappalyzer.com/v2/lookup?urls=${domain}`;
    
    const response = await axios.get(apiUrl, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      timeout: 10000,
    });

    if (response.data && Array.isArray(response.data) && response.data.length > 0) {
      const techStack = response.data[0];
      
      // Check if Shopify is detected
      if (techStack.technologies) {
        const hasShopify = techStack.technologies.some(tech => 
          tech.name && tech.name.toLowerCase().includes('shopify')
        );
        
        return {
          isShopify: hasShopify,
          technologies: techStack.technologies,
        };
      }
    }

    return null;
  } catch (error) {
    console.error(`Error detecting tech stack for ${url}:`, error.message);
    return null;
  }
};

