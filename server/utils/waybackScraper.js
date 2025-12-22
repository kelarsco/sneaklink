import axios from 'axios';
import { looksLikeShopifyStore } from './shopifyUrlValidator.js';

/**
 * Scrape Wayback Machine API (Internet Archive) for Shopify store links
 * Free: See past versions of stores → detect migrations, Shopify theme history
 */
export const scrapeWayback = async () => {
  const stores = [];
  const seenUrls = new Set();

  try {
    console.log('🔍 Using Wayback Machine API to discover Shopify stores...');

    // Wayback Machine CDX API is free and doesn't require an API key
    // We can search for historical snapshots of Shopify stores
    
    // Strategy: Search for myshopify.com domains in Wayback Machine
    const searchUrl = 'https://web.archive.org/cdx/search/cdx';
    
    const params = {
      url: '*.myshopify.com/*',
      output: 'json',
      limit: 1000,
      filter: 'statuscode:200',
      collapse: 'urlkey',
    };

    try {
      const response = await axios.get(searchUrl, {
        params: params,
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SneakLinkBot/1.0)',
        },
      });

      if (response.data && Array.isArray(response.data) && response.data.length > 1) {
        // First row is headers, skip it
        for (let i = 1; i < response.data.length; i++) {
          const record = response.data[i];
          if (record && record.length >= 3) {
            const originalUrl = record[2]; // URL is in the 3rd column
            
            if (originalUrl && looksLikeShopifyStore(originalUrl)) {
              try {
                const urlObj = new URL(originalUrl);
                const baseUrl = `${urlObj.protocol}//${urlObj.hostname}`;
                const normalizedUrl = baseUrl.toLowerCase().replace(/\/$/, '');
                
                // Skip excluded subdomains
                if (!normalizedUrl.includes('admin.') &&
                    !normalizedUrl.includes('partners.') &&
                    !normalizedUrl.includes('help.') &&
                    !normalizedUrl.includes('checkout.') &&
                    !seenUrls.has(normalizedUrl)) {
                  seenUrls.add(normalizedUrl);
                  stores.push({
                    url: baseUrl,
                    source: 'Wayback Machine',
                  });
                }
              } catch (urlError) {
                // Invalid URL, skip
                continue;
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error querying Wayback Machine API:', error.message);
    }

    console.log(`   Found ${stores.length} unique Shopify store URLs from Wayback Machine`);
  } catch (error) {
    console.error('Error in Wayback Machine scraper:', error.message);
  }

  return stores;
};

/**
 * Get historical snapshots of a store from Wayback Machine
 * Can help detect migrations and theme history
 */
export const getWaybackSnapshots = async (url) => {
  try {
    const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
    const urlObj = new URL(normalizedUrl);
    const domain = urlObj.hostname;

    const searchUrl = 'https://web.archive.org/cdx/search/cdx';
    
    const params = {
      url: domain,
      output: 'json',
      limit: 100,
      filter: 'statuscode:200',
    };

    const response = await axios.get(searchUrl, {
      params: params,
      timeout: 15000,
    });

    if (response.data && Array.isArray(response.data) && response.data.length > 1) {
      const snapshots = [];
      // First row is headers, skip it
      for (let i = 1; i < response.data.length; i++) {
        const record = response.data[i];
        if (record && record.length >= 2) {
          snapshots.push({
            timestamp: record[1],
            url: record[2],
            waybackUrl: `https://web.archive.org/web/${record[1]}/${record[2]}`,
          });
        }
      }
      return snapshots;
    }

    return [];
  } catch (error) {
    console.error(`Error getting Wayback snapshots for ${url}:`, error.message);
    return [];
  }
};

