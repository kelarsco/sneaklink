import axios from 'axios';
import { looksLikeShopifyStore } from './shopifyUrlValidator.js';

/**
 * Generate and test potential Shopify store domains
 * Uses various patterns and combinations to discover new stores
 */
export const generatePotentialDomains = async () => {
  const stores = [];
  const seenUrls = new Set();
  
  try {
    console.log('🎲 Generating potential Shopify domains...');
    
    // Common store name patterns and keywords
    const storePatterns = [
      // Common prefixes
      'shop', 'store', 'buy', 'get', 'official', 'my', 'the', 'best', 'top', 'pro',
      // Business types
      'boutique', 'market', 'corner', 'hub', 'center', 'zone', 'spot', 'place',
      // Product categories
      'fashion', 'style', 'wear', 'clothing', 'apparel', 'outfit', 'trend',
      'tech', 'gadget', 'electronics', 'device', 'smart', 'digital',
      'home', 'living', 'decor', 'furniture', 'garden', 'kitchen',
      'health', 'beauty', 'cosmetics', 'skincare', 'wellness', 'care',
      'sports', 'fitness', 'outdoor', 'adventure', 'gear', 'active',
      'food', 'organic', 'natural', 'fresh', 'gourmet', 'kitchen',
      'pet', 'animal', 'dog', 'cat', 'pet supplies', 'pet care',
      'baby', 'kids', 'children', 'toys', 'games', 'family',
      'book', 'read', 'library', 'education', 'learn', 'study',
      'art', 'craft', 'creative', 'design', 'handmade', 'custom',
      'auto', 'car', 'vehicle', 'parts', 'accessories', 'tools',
    ];
    
    // Common suffixes
    const suffixes = [
      'co', 'shop', 'store', 'market', 'boutique', 'corner', 'hub', 'spot',
      'lab', 'studio', 'works', 'goods', 'items', 'products', 'gear',
      'world', 'planet', 'earth', 'life', 'style', 'trend', 'vibe',
      'box', 'crate', 'pack', 'bundle', 'kit', 'set', 'collection',
    ];
    
    // Common TLDs
    const tlds = ['.com', '.net', '.org', '.co', '.io', '.shop', '.store'];
    
    // Generate combinations
    const generatedDomains = [];
    
    // Pattern 1: prefix + suffix + tld
    for (const prefix of storePatterns.slice(0, 20)) {
      for (const suffix of suffixes.slice(0, 10)) {
        for (const tld of tlds) {
          const domain = prefix + suffix + tld;
          generatedDomains.push(domain);
        }
      }
    }
    
    // Pattern 2: trending keywords + year
    const currentYear = new Date().getFullYear();
    const trendingKeywords = ['trend', 'vibe', 'style', 'look', 'fit', 'gear', 'life'];
    
    for (const keyword of trendingKeywords) {
      for (let year = currentYear; year >= currentYear - 2; year--) {
        for (const tld of ['.com', '.shop', '.store']) {
          const domain = keyword + year + tld;
          generatedDomains.push(domain);
        }
      }
    }
    
    // Pattern 3: short brandable names (2-4 syllables)
    const syllables = ['zen', 'lux', 'pro', 'max', 'go', 'get', 'buy', 'now', 'plus', 'one', 'two'];
    
    for (let i = 0; i < syllables.length; i++) {
      for (let j = i; j < syllables.length && j < i + 3; j++) {
        for (const tld of ['.com', '.shop', '.io']) {
          const domain = syllables.slice(i, j + 1).join('') + tld;
          generatedDomains.push(domain);
        }
      }
    }
    
    console.log(`   🎲 Generated ${generatedDomains.length} potential domains`);
    
    // Test domains in batches
    const batchSize = 100;
    for (let i = 0; i < generatedDomains.length; i += batchSize) {
      const batch = generatedDomains.slice(i, i + batchSize);
      console.log(`   🔍 Testing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(generatedDomains.length/batchSize)} (${batch.length} domains)...`);
      
      for (const domain of batch) {
        try {
          // Test if domain exists as Shopify store
          const testUrls = [
            `https://${domain}`,
            `https://${domain}.myshopify.com`,
            `https://shop.${domain}`,
            `https://store.${domain}`,
          ];
          
          for (const testUrl of testUrls) {
            try {
              const response = await axios.get(testUrl, {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (compatible; SneakLinkBot/1.0)',
                },
                timeout: 5000,
                maxRedirects: 3,
              });
              
              // Check if it's a Shopify store
              if (looksLikeShopifyStore(testUrl) && !seenUrls.has(testUrl.toLowerCase())) {
                seenUrls.add(testUrl.toLowerCase());
                stores.push({
                  url: testUrl,
                  source: 'Domain Generation',
                  metadata: {
                    originalDomain: domain,
                    testUrl: testUrl,
                    foundAt: new Date().toISOString(),
                  }
                });
              }
            } catch (error) {
              // Domain doesn't exist or isn't accessible - skip
              continue;
            }
          }
        } catch (error) {
          continue;
        }
      }
      
      // Rate limiting between batches
      if (i + batchSize < generatedDomains.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log(`✅ Found ${stores.length} stores from domain generation`);
    
  } catch (error) {
    console.error('❌ Error generating domains:', error.message);
  }
  
  return stores;
};

/**
 * Discover stores using DNS enumeration techniques
 */
export const discoverViaDNS = async () => {
  const stores = [];
  const seenUrls = new Set();
  
  try {
    console.log('🌐 Discovering stores via DNS enumeration...');
    
    // Common Shopify subdomains to test
    const commonSubdomains = [
      'shop', 'store', 'buy', 'get', 'order', 'checkout', 'cart', 'app',
      'www', 'm', 'mobile', 'api', 'admin', 'secure', 'cdn',
    ];
    
    // Popular domains to test with subdomains
    const popularDomains = [
      'shopify.com', 'example.com', 'test.com', 'demo.com', 'store.com',
      'market.com', 'buy.com', 'get.com', 'pro.com', 'best.com',
    ];
    
    // Test combinations
    for (const domain of popularDomains.slice(0, 5)) {
      for (const subdomain of commonSubdomains) {
        try {
          const testDomain = `${subdomain}.${domain}`;
          const testUrls = [
            `https://${testDomain}`,
            `https://${testDomain}.myshopify.com`,
          ];
          
          for (const testUrl of testUrls) {
            try {
              const response = await axios.get(testUrl, {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (compatible; SneakLinkBot/1.0)',
                },
                timeout: 3000,
              });
              
              if (looksLikeShopifyStore(testUrl) && !seenUrls.has(testUrl.toLowerCase())) {
                seenUrls.add(testUrl.toLowerCase());
                stores.push({
                  url: testUrl,
                  source: 'DNS Discovery',
                  metadata: {
                    discoveredDomain: testDomain,
                    method: 'subdomain_enumeration',
                    foundAt: new Date().toISOString(),
                  }
                });
              }
            } catch (error) {
              // Domain doesn't exist - skip
              continue;
            }
          }
        } catch (error) {
          continue;
        }
      }
    }
    
    console.log(`✅ Found ${stores.length} stores via DNS discovery`);
    
  } catch (error) {
    console.error('❌ Error discovering via DNS:', error.message);
  }
  
  return stores;
};

/**
 * Discover stores using SSL certificate patterns
 */
export const discoverViaSSLCertificates = async () => {
  const stores = [];
  const seenUrls = new Set();
  
  try {
    console.log('🔐 Discovering stores via SSL certificates...');
    
    // Use certificate transparency logs
    const certSources = [
      'https://crt.sh/',
      'https://crt.sh/?q=%.shopify.com&output=json',
      'https://certspotter.com/api/v1/certs',
    ];
    
    for (const certSource of certSources) {
      try {
        console.log(`   🔍 Checking ${certSource}...`);
        
        const response = await axios.get(certSource, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; SneakLinkBot/1.0)',
          },
          timeout: 30000,
        });
        
        if (certSource.includes('crt.sh')) {
          // Parse crt.sh response
          const certificates = Array.isArray(response.data) ? response.data : [];
          
          for (const cert of certificates.slice(0, 100)) { // Limit to avoid overwhelming
            try {
              const nameValue = cert.name_value || cert.common_name || '';
              const names = nameValue.split('\n').map(n => n.trim()).filter(Boolean);
              
              for (const name of names) {
                if (name.includes('.myshopify.com')) {
                  const match = name.match(/([a-zA-Z0-9-]+)\.myshopify\.com/);
                  if (match) {
                    const subdomain = match[1];
                    const url = `https://${subdomain}.myshopify.com`;
                    
                    if (looksLikeShopifyStore(url) && !seenUrls.has(url.toLowerCase())) {
                      seenUrls.add(url.toLowerCase());
                      stores.push({
                        url: url,
                        source: 'SSL Certificate Discovery',
                        metadata: {
                          certificateSource: certSource,
                          subdomain: subdomain,
                          foundAt: new Date().toISOString(),
                        }
                      });
                    }
                  }
                }
              }
            } catch (error) {
              continue;
            }
          }
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 5000));
      } catch (error) {
        console.warn(`     ⚠️  Error accessing ${certSource}: ${error.message}`);
      }
    }
    
    console.log(`✅ Found ${stores.length} stores via SSL certificates`);
    
  } catch (error) {
    console.error('❌ Error discovering via SSL certificates:', error.message);
  }
  
  return stores;
};
