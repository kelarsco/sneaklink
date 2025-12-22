import axios from 'axios';
import { looksLikeShopifyStore } from './shopifyUrlValidator.js';

/**
 * Get the latest Common Crawl index
 */
const getLatestIndex = async () => {
  try {
    const response = await axios.get('https://index.commoncrawl.org/collinfo.json', {
      timeout: 10000,
    });
    
    if (response.data && response.data.length > 0) {
      // Get the most recent index
      const latest = response.data.sort((a, b) => 
        new Date(b.cdxApi) - new Date(a.cdxApi)
      )[0];
      return latest.id;
    }
    
    // Fallback to a known recent index
    return 'CC-MAIN-2024-26';
  } catch (error) {
    console.error('Error getting Common Crawl index:', error.message);
    // Fallback to a known recent index
    return 'CC-MAIN-2024-26';
  }
};

/**
 * Helper function to process a Common Crawl record
 */
const processCommonCrawlRecord = (record, seenUrls, stores) => {
  // Common Crawl CDX format: urlkey (reverse domain format) or url field
  const urlKey = record.urlkey || record.url || '';
  
  if (urlKey && urlKey.includes('myshopify')) {
    // Extract the actual URL from urlkey
    // urlkey format: com,myshopify,storename)/path or com,myshopify,storename
    let normalizedUrl = '';
    
    if (urlKey.includes('http://') || urlKey.includes('https://')) {
      normalizedUrl = urlKey.split(' ')[0]; // Take first part if space-separated
    } else {
      // Parse reverse domain format: com,myshopify,storename
      const parts = urlKey.split(',');
      if (parts.length >= 3 && parts[1] === 'myshopify') {
        const storePart = parts[2].split('/')[0].split(')')[0].split('?')[0];
        normalizedUrl = `https://${storePart}.myshopify.com`;
      } else if (urlKey.includes('.myshopify.com')) {
        // Direct domain in urlkey
        const match = urlKey.match(/([a-zA-Z0-9-]+\.myshopify\.com)/);
        if (match) {
          normalizedUrl = `https://${match[1]}`;
        }
      }
    }
    
    if (normalizedUrl && looksLikeShopifyStore(normalizedUrl)) {
      // Extract base domain
      try {
        const urlObj = new URL(normalizedUrl);
        const baseUrl = `${urlObj.protocol}//${urlObj.hostname}`;
        const normalizedBase = baseUrl.toLowerCase().replace(/\/$/, '');
        
        // Skip duplicates and excluded subdomains
        if (!seenUrls.has(normalizedBase) && 
            !normalizedBase.includes('admin.') &&
            !normalizedBase.includes('partners.') &&
            !normalizedBase.includes('help.') &&
            !normalizedBase.includes('checkout.')) {
          seenUrls.add(normalizedBase);
          
          stores.push({
            url: baseUrl,
            source: 'Common Crawl',
          });
        }
      } catch (urlError) {
        // Invalid URL format, skip
        return;
      }
    }
  }
};

/**
 * Search Common Crawl for Shopify stores
 */
export const scrapeCommonCrawl = async () => {
  const stores = [];
  const seenUrls = new Set();
  
  try {
    console.log('🔍 Searching Common Crawl for Shopify stores...');
    
    // Get the latest index
    const indexId = await getLatestIndex();
    console.log(`   Using Common Crawl index: ${indexId}`);
    
    // Search for .myshopify.com domains
    // Common Crawl CDX API format: url=*.myshopify.com
    // Increased limit for massive scraping
    const searchUrl = `https://index.commoncrawl.org/${indexId}-index?url=*.myshopify.com&output=json&limit=10000`;
    
    try {
      const response = await axios.get(searchUrl, {
        timeout: 60000, // Longer timeout for Common Crawl
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SneakLinkBot/1.0)',
        },
        maxRedirects: 5,
      });

      // Common Crawl CDX API returns newline-delimited JSON (NDJSON)
      // Each line is a JSON object with fields like: urlkey, timestamp, url, etc.
      let data = response.data;
      if (typeof data !== 'string') {
        // If it's already parsed, convert back to string
        data = Array.isArray(data) ? data.map(JSON.stringify).join('\n') : JSON.stringify(data);
      }
      
      const lines = data.split('\n').filter(line => {
        const trimmed = line.trim();
        return trimmed && (trimmed.startsWith('{') || trimmed.startsWith('['));
      });
      
      for (const line of lines) {
        try {
          let record = JSON.parse(line);
          
          // Handle array responses
          if (Array.isArray(record)) {
            for (const item of record) {
              processCommonCrawlRecord(item, seenUrls, stores);
            }
          } else {
            processCommonCrawlRecord(record, seenUrls, stores);
          }
        } catch (parseError) {
          // Skip invalid JSON lines
          continue;
        }
      }
      
      console.log(`   Found ${stores.length} unique Shopify store URLs from Common Crawl`);
    } catch (error) {
      console.error('Error querying Common Crawl API:', error.message);
      
      // Alternative: Try searching with different patterns for better coverage
      const alternativeSearches = [
        `https://index.commoncrawl.org/${indexId}-index?url=myshopify.com&output=json&limit=5000`,
        `https://index.commoncrawl.org/${indexId}-index?url=*.myshopify.com/store&output=json&limit=5000`,
        `https://index.commoncrawl.org/${indexId}-index?url=*.myshopify.com/products&output=json&limit=5000`,
      ];
      
      for (const searchUrl of alternativeSearches) {
        try {
          const response = await axios.get(searchUrl, {
            timeout: 30000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; SneakLinkBot/1.0)',
            },
          });
          
          let data = response.data;
          if (typeof data !== 'string') {
            data = Array.isArray(data) ? data.map(JSON.stringify).join('\n') : JSON.stringify(data);
          }
          
          const lines = data.split('\n').filter(line => {
            const trimmed = line.trim();
            return trimmed && (trimmed.startsWith('{') || trimmed.startsWith('['));
          });
          
          for (const line of lines) {
            try {
              let record = JSON.parse(line);
              if (Array.isArray(record)) {
                for (const item of record) {
                  processCommonCrawlRecord(item, seenUrls, stores);
                }
              } else {
                processCommonCrawlRecord(record, seenUrls, stores);
              }
            } catch (parseError) {
              continue;
            }
          }
        } catch (altError) {
          console.error(`Error with alternative Common Crawl search:`, altError.message);
        }
      }
    }
    
  } catch (error) {
    console.error('Error in Common Crawl scraper:', error.message);
  }

  return stores;
};

/**
 * Search Common Crawl for stores by country (using domain patterns)
 */
export const scrapeCommonCrawlByCountry = async (countries = []) => {
  const stores = [];
  const seenUrls = new Set();
  
  try {
    const indexId = await getLatestIndex();
    
    // Country-specific domain patterns (simplified)
    const countryPatterns = {
      'United Kingdom': ['co.uk', 'uk'],
      'Germany': ['de'],
      'France': ['fr'],
      'Canada': ['ca'],
      'Australia': ['com.au', 'au'],
    };
    
    for (const country of countries) {
      const patterns = countryPatterns[country] || [];
      
      for (const pattern of patterns) {
        try {
          // Search for myshopify.com stores with country-specific patterns
          const searchUrl = `https://index.commoncrawl.org/${indexId}-index?url=*.myshopify.com/*${pattern}*&output=json&limit=200`;
          
          const response = await axios.get(searchUrl, {
            timeout: 30000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; SneakLinkBot/1.0)',
            },
          });
          
          let data = response.data;
          if (typeof data !== 'string') {
            data = Array.isArray(data) ? data.map(JSON.stringify).join('\n') : JSON.stringify(data);
          }
          
          const lines = data.split('\n').filter(line => {
            const trimmed = line.trim();
            return trimmed && (trimmed.startsWith('{') || trimmed.startsWith('['));
          });
          
          for (const line of lines) {
            try {
              let record = JSON.parse(line);
              if (Array.isArray(record)) {
                for (const item of record) {
                  processCommonCrawlRecord(item, seenUrls, stores);
                }
              } else {
                processCommonCrawlRecord(record, seenUrls, stores);
              }
            } catch (parseError) {
              continue;
            }
          }
        } catch (error) {
          console.error(`Error searching Common Crawl for ${country}:`, error.message);
        }
      }
    }
  } catch (error) {
    console.error('Error in Common Crawl country scraper:', error.message);
  }

  return stores;
};
