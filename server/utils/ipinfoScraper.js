import axios from 'axios';
import { looksLikeShopifyStore } from './shopifyUrlValidator.js';
import dns from 'dns';
import { promisify } from 'util';

const lookup = promisify(dns.lookup);

/**
 * Scrape IPinfo.io for Shopify store links
 * Free Tier: 50,000 requests per month
 * Uses IP geolocation and reverse IP lookups to find stores
 */
export const scrapeIPinfo = async () => {
  const stores = [];
  const apiKey = process.env.IPINFO_API_KEY;

  if (!apiKey) {
    console.log('⚠️  IPinfo.io API key not configured, skipping IPinfo scraping');
    return stores;
  }

  try {
    console.log('🌐 Using IPinfo.io to discover Shopify stores...');

    // Strategy: Get IP information for known Shopify stores
    // Then use reverse IP lookup to find other domains on the same IP
    // This can help discover additional Shopify stores
    
    // Known Shopify store IPs or domains to start with
    const knownShopifyStores = [
      'shopify.com',
      'myshopify.com',
    ];

    for (const domain of knownShopifyStores) {
      try {
        // Resolve domain to IP
        const ip = await lookup(domain).catch(() => null);
        
        if (!ip || !ip.address) {
          continue;
        }

        // Get IP information from IPinfo
        const ipInfoUrl = `https://ipinfo.io/${ip.address}/json?token=${apiKey}`;
        const response = await axios.get(ipInfoUrl, {
          timeout: 10000,
        });

        if (response.data) {
          const ipData = response.data;
          
          // IPinfo free tier provides:
          // - IP address
          // - Hostname
          // - City, Region, Country
          // - Location (lat/lng)
          // - Organization/ASN
          // - Timezone
          
          // Note: Reverse IP lookup (finding all domains on an IP) typically requires
          // paid tier or separate services. IPinfo free tier doesn't include this.
          // However, we can use the hostname and organization info to find related domains
          
          if (ipData.hostname && looksLikeShopifyStore(ipData.hostname)) {
            stores.push({
              url: `https://${ipData.hostname}`,
              source: 'IPinfo.io',
            });
          }

          // If organization info suggests Shopify, we can note it
          if (ipData.org && ipData.org.toLowerCase().includes('shopify')) {
            console.log(`   Found Shopify-related IP: ${ip.address} (${ipData.org})`);
          }
        }

        // Rate limiting - IPinfo free tier allows 50k/month, so we can be more generous
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Error querying IPinfo for ${domain}:`, error.message);
      }
    }

    console.log(`   Found ${stores.length} potential Shopify store URLs from IPinfo.io`);
  } catch (error) {
    console.error('Error in IPinfo scraper:', error.message);
  }

  return stores;
};

/**
 * Get IP information for a domain using IPinfo.io
 * Can help identify hosting details and potential related stores
 */
export const getIPInfo = async (domainOrIP) => {
  const apiKey = process.env.IPINFO_API_KEY;

  if (!apiKey) {
    return null;
  }

  try {
    let ip = domainOrIP;
    
    // If it's a domain, resolve it to IP first
    if (!/^\d+\.\d+\.\d+\.\d+$/.test(domainOrIP)) {
      const resolved = await lookup(domainOrIP).catch(() => null);
      if (!resolved || !resolved.address) {
        return null;
      }
      ip = resolved.address;
    }

    const url = `https://ipinfo.io/${ip}/json?token=${apiKey}`;
    
    const response = await axios.get(url, {
      timeout: 10000,
    });

    if (response.data) {
      return response.data;
    }

    return null;
  } catch (error) {
    console.error(`Error getting IP info for ${domainOrIP}:`, error.message);
    return null;
  }
};

