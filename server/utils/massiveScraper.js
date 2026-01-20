import axios from 'axios';
import { looksLikeShopifyStore } from './shopifyUrlValidator.js';

/**
 * Massive-scale scraper for internet-wide Shopify store discovery
 * Uses multiple techniques to find stores across the entire web
 */

/**
 * Scrape Certificate Transparency logs for Shopify domains
 * CT logs contain all SSL certificates issued, including myshopify.com subdomains
 */
export const scrapeCertificateTransparency = async () => {
  const stores = [];
  const seenUrls = new Set();
  
  try {
    console.log('🔐 Scraping Certificate Transparency logs for Shopify stores...');
    
    // Use crt.sh API to search for myshopify.com certificates
    const searchUrl = 'https://crt.sh/?q=%.myshopify.com&output=json';
    
    try {
      const response = await axios.get(searchUrl, {
        timeout: 60000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SneakLinkBot/1.0)',
        },
      });
      
      const certificates = Array.isArray(response.data) ? response.data : [];
      
      for (const cert of certificates) {
        try {
          const nameValue = cert.name_value || cert.common_name || '';
          const names = nameValue.split('\n').map(n => n.trim()).filter(Boolean);
          
          for (const name of names) {
            if (name.includes('.myshopify.com')) {
              // Extract the subdomain
              const match = name.match(/([a-zA-Z0-9-]+)\.myshopify\.com/);
              if (match) {
                const subdomain = match[1];
                const url = `https://${subdomain}.myshopify.com`;
                
                if (looksLikeShopifyStore(url) && !seenUrls.has(url.toLowerCase())) {
                  seenUrls.add(url.toLowerCase());
                  stores.push({
                    url,
                    source: 'Certificate Transparency',
                  });
                }
              }
            }
          }
        } catch (error) {
          // Skip invalid certificate entries
          continue;
        }
      }
      
      console.log(`   Found ${stores.length} unique Shopify stores from CT logs`);
    } catch (error) {
      // Silently handle timeout errors - they're expected for CT logs
      if (!error.message.includes('timeout')) {
        console.error('Error scraping Certificate Transparency:', error.message);
      }
    }
  } catch (error) {
    // Silently handle timeout errors - they're expected for CT logs
    if (!error.message.includes('timeout')) {
      console.error('Error in Certificate Transparency scraper:', error.message);
    }
  }
  
  return stores;
};

/**
 * Scrape DNS databases for Shopify subdomains
 * Uses public DNS enumeration techniques
 */
export const scrapeDNSDatabases = async () => {
  const stores = [];
  const seenUrls = new Set();
  
  try {
    console.log('🌐 Scraping DNS databases for Shopify stores...');
    
    // Use various DNS enumeration techniques
    const dnsSources = [
      // SecurityTrails API (if available)
      // VirusTotal API (if available)
      // Shodan API (if available)
    ];
    
    // For now, we'll use a combination of known patterns
    // In production, you'd integrate with DNS enumeration APIs
    
    console.log(`   Found ${stores.length} stores from DNS databases`);
  } catch (error) {
    console.error('Error scraping DNS databases:', error.message);
  }
  
  return stores;
};

/**
 * Scrape GitHub for Shopify store references
 * Enhanced version that searches more comprehensively
 */
export const scrapeGitHubMassive = async () => {
  const stores = [];
  const seenUrls = new Set();
  
  try {
    console.log('💻 Scraping GitHub extensively for Shopify stores...');
    
    // Search queries for GitHub
    const searchQueries = [
      'myshopify.com',
      'shopify store',
      'shopify theme',
      'shopify app',
      'shopify liquid',
    ];
    
    // GitHub Search API (requires authentication for higher rate limits)
    const githubToken = process.env.GITHUB_TOKEN;
    
    for (const query of searchQueries) {
      try {
        const headers = {
          'User-Agent': 'SneakLinkBot/1.0',
        };
        
        if (githubToken) {
          headers['Authorization'] = `token ${githubToken}`;
        }
        
        // Search code
        const codeSearchUrl = `https://api.github.com/search/code?q=${encodeURIComponent(query)}&per_page=100`;
        const codeResponse = await axios.get(codeSearchUrl, {
          headers,
          timeout: 30000,
        });
        
        const codeItems = codeResponse.data?.items || [];
        
        for (const item of codeItems) {
          try {
            // Extract URLs from code snippets
            const text = item.snippet || '';
            const urlRegex = /(https?:\/\/[^\s\)]+\.myshopify\.com[^\s\)]*)/g;
            const matches = text.match(urlRegex) || [];
            
            for (const url of matches) {
              const normalized = url.trim().replace(/\/$/, '');
              if (looksLikeShopifyStore(normalized) && !seenUrls.has(normalized.toLowerCase())) {
                seenUrls.add(normalized.toLowerCase());
                stores.push({
                  url: normalized,
                  source: 'GitHub (Massive)',
                });
              }
            }
          } catch (error) {
            continue;
          }
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        if (error.response?.status === 403) {
          console.log(`   ⚠️  Rate limited for query "${query}", skipping...`);
        } else {
          console.error(`Error searching GitHub for "${query}":`, error.message);
        }
      }
    }
    
    console.log(`   Found ${stores.length} unique Shopify stores from GitHub`);
  } catch (error) {
    console.error('Error in massive GitHub scraper:', error.message);
  }
  
  return stores;
};

/**
 * Scrape Shodan for Shopify stores (if API key available)
 */
export const scrapeShodan = async () => {
  const stores = [];
  const seenUrls = new Set();
  
  try {
    const shodanKey = process.env.SHODAN_API_KEY;
    if (!shodanKey) {
      return stores;
    }
    
    console.log('🔍 Scraping Shodan for Shopify stores...');
    
    // Search Shodan for Shopify stores
    const searchUrl = `https://api.shodan.io/shodan/host/search?key=${shodanKey}&query=myshopify.com`;
    
    try {
      const response = await axios.get(searchUrl, {
        timeout: 30000,
      });
      
      const results = response.data?.matches || [];
      
      for (const result of results) {
        try {
          const hostname = result.hostnames?.[0] || result.domains?.[0];
          if (hostname && hostname.includes('.myshopify.com')) {
            const url = `https://${hostname}`;
            
            if (looksLikeShopifyStore(url) && !seenUrls.has(url.toLowerCase())) {
              seenUrls.add(url.toLowerCase());
              stores.push({
                url,
                source: 'Shodan',
              });
            }
          }
        } catch (error) {
          continue;
        }
      }
      
      console.log(`   Found ${stores.length} stores from Shodan`);
    } catch (error) {
      console.error('Error querying Shodan:', error.message);
    }
  } catch (error) {
    console.error('Error in Shodan scraper:', error.message);
  }
  
  return stores;
};

/**
 * Scrape Censys for Shopify stores (if API key available)
 */
export const scrapeCensys = async () => {
  const stores = [];
  const seenUrls = new Set();
  
  try {
    const censysApiId = process.env.CENSYS_API_ID;
    const censysSecret = process.env.CENSYS_SECRET;
    
    if (!censysApiId || !censysSecret) {
      return stores;
    }
    
    console.log('🔍 Scraping Censys for Shopify stores...');
    
    // Search Censys for Shopify stores
    const searchUrl = 'https://search.censys.io/api/v2/hosts/search';
    const auth = Buffer.from(`${censysApiId}:${censysSecret}`).toString('base64');
    
    try {
      const response = await axios.post(
        searchUrl,
        {
          q: 'services.tls.certificates.leaf_data.subject.common_name:*.myshopify.com',
          per_page: 100,
        },
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );
      
      const results = response.data?.result?.hits || [];
      
      for (const result of results) {
        try {
          const hostname = result.names?.[0] || result.services?.[0]?.certificate?.subject?.common_name;
          if (hostname && hostname.includes('.myshopify.com')) {
            const url = `https://${hostname}`;
            
            if (looksLikeShopifyStore(url) && !seenUrls.has(url.toLowerCase())) {
              seenUrls.add(url.toLowerCase());
              stores.push({
                url,
                source: 'Censys',
              });
            }
          }
        } catch (error) {
          continue;
        }
      }
      
      console.log(`   Found ${stores.length} stores from Censys`);
    } catch (error) {
      console.error('Error querying Censys:', error.message);
    }
  } catch (error) {
    console.error('Error in Censys scraper:', error.message);
  }
  
  return stores;
};

/**
 * Scrape multiple search engines with extensive queries
 */
export const scrapeSearchEnginesMassive = async (countries = []) => {
  const stores = [];
  
  try {
    console.log('🌐 Scraping search engines extensively...');
    
    // Extensive search queries
    const baseQueries = [
      'site:myshopify.com',
      'site:myshopify.com/store',
      'site:myshopify.com/products',
      'shopify store',
      'shopify online store',
      'myshopify.com store',
      'shopify ecommerce',
      'shopify website',
      'powered by shopify',
    ];
    
    // Add country-specific queries
    const countryQueries = countries.flatMap(country => [
      `shopify store ${country}`,
      `myshopify.com ${country}`,
      `shopify ${country}`,
      `site:myshopify.com ${country}`,
    ]);
    
    const allQueries = [...baseQueries, ...countryQueries];
    
    // Use ScrapingAPI or similar service
    if (process.env.SCRAPING_API_KEY) {
      const { searchShopifyStoresWithAPI } = await import('./scrapingApi.js');
      
      for (const query of allQueries) {
        try {
          const foundStores = await searchShopifyStoresWithAPI(query);
          stores.push(...foundStores);
          
          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
          console.error(`Error searching for "${query}":`, error.message);
        }
      }
    }
    
    console.log(`   Found ${stores.length} stores from search engines`);
  } catch (error) {
    console.error('Error in massive search engine scraper:', error.message);
  }
  
  return stores;
};

/**
 * Main massive scraper function that combines all sources
 */
export const runMassiveScrape = async () => {
  const allStores = [];
  
  try {
    console.log('🚀 Starting MASSIVE internet-wide scraping...');
    
    // Run all massive scrapers in parallel where possible
    const [
      ctStores,
      shodanStores,
      censysStores,
    ] = await Promise.allSettled([
      scrapeCertificateTransparency(),
      scrapeShodan(),
      scrapeCensys(),
    ]).then(results => results.map(r => r.status === 'fulfilled' ? r.value : []));
    
    allStores.push(
      ...ctStores,
      ...shodanStores,
      ...censysStores
    );
    
    console.log(`\n📊 Massive scraping results:`);
    console.log(`   Certificate Transparency: ${ctStores.length}`);
    console.log(`   Shodan: ${shodanStores.length}`);
    console.log(`   Censys: ${censysStores.length}`);
    console.log(`   Total: ${allStores.length}`);
    
  } catch (error) {
    console.error('Error in massive scraper:', error.message);
  }
  
  return allStores;
};

