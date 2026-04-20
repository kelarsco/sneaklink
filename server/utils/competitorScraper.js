import axios from 'axios';
import { looksLikeShopifyStore } from './shopifyUrlValidator.js';

/**
 * Scrape competitor analysis platforms and tools
 * These platforms often showcase successful stores as examples
 */
export const scrapeCompetitorAnalysis = async () => {
  const stores = [];
  const seenUrls = new Set();
  
  try {
    console.log('🔍 Scraping competitor analysis platforms...');
    
    // Competitor analysis and intelligence platforms
    const competitorSources = [
      {
        name: 'SimilarWeb',
        url: 'https://www.similarweb.com/',
        searchQueries: [
          'shopify stores',
          'ecommerce examples',
          'online retailers',
          'top dropshipping stores',
        ]
      },
      {
        name: 'Alexa Rankings',
        url: 'https://www.alexa.com/',
        searchQueries: [
          'ecommerce sites',
          'online shopping',
          'shopify examples',
        ]
      },
      {
        name: 'Ahrefs',
        url: 'https://ahrefs.com/',
        searchQueries: [
          'shopify case study',
          'ecommerce success',
          'dropshipping analysis',
        ]
      },
      {
        name: 'SEMrush',
        url: 'https://www.semrush.com/',
        searchQueries: [
          'shopify stores',
          'ecommerce competitors',
          'online business analysis',
        ]
      }
    ];

    for (const source of competitorSources) {
      try {
        console.log(`   🔍 Checking ${source.name}...`);
        
        for (const query of source.searchQueries) {
          try {
            const searchUrl = `${source.url}blog/?s=${encodeURIComponent(query)}`;
            
            const response = await axios.get(searchUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; SneakLinkBot/1.0)',
              },
              timeout: 15000,
            });

            // Extract URLs from blog posts and case studies
            const urlRegex = /(https?:\/\/[^\s\)"\]]+)/g;
            const foundUrls = response.data.match(urlRegex) || [];
            
            for (const foundUrl of foundUrls) {
              try {
                const cleanUrl = foundUrl.trim();
                
                if (looksLikeShopifyStore(cleanUrl) && !seenUrls.has(cleanUrl.toLowerCase())) {
                  seenUrls.add(cleanUrl.toLowerCase());
                  stores.push({
                    url: cleanUrl,
                    source: 'Competitor Analysis',
                    metadata: {
                      platform: source.name,
                      searchQuery: query,
                      foundAt: new Date().toISOString(),
                    }
                  });
                }
              } catch (error) {
                continue;
              }
            }
            
            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 3000));
          } catch (error) {
            console.warn(`     ⚠️  Error searching ${source.name} for "${query}": ${error.message}`);
          }
        }
      } catch (error) {
        console.warn(`     ⚠️  Error accessing ${source.name}: ${error.message}`);
      }
    }
    
    console.log(`✅ Found ${stores.length} stores from competitor analysis platforms`);
    
  } catch (error) {
    console.error('❌ Error scraping competitor analysis platforms:', error.message);
  }
  
  return stores;
};

/**
 * Scrape e-commerce awards and recognition sites
 */
export const scrapeEcommerceAwards = async () => {
  const stores = [];
  const seenUrls = new Set();
  
  try {
    console.log('🏆 Scraping e-commerce awards and recognition sites...');
    
    const awardSites = [
      {
        name: 'Shopify Awards',
        url: 'https://www.shopify.com/partners/shopify-awards/',
        categories: [
          'design',
          'development',
          'marketing',
          'commerce',
        ]
      },
      {
        name: 'Internet Retailer Awards',
        url: 'https://www.internetretailer.com/',
        categories: [
          'ecommerce excellence',
          'design awards',
          'innovation awards',
        ]
      },
      {
        name: 'Digital Commerce Awards',
        url: 'https://www.digitalcommerceawards.com/',
        categories: [
          'best store',
          'best design',
          'best user experience',
        ]
      },
      {
        name: 'eCommerce Expo',
        url: 'https://www.ecommerceexpo.com/',
        categories: [
          'awards',
          'winners',
          'nominees',
        ]
      }
    ];

    for (const awardSite of awardSites) {
      try {
        console.log(`   🔍 Checking ${awardSite.name}...`);
        
        for (const category of awardSite.categories) {
          try {
            let searchUrl;
            
            if (awardSite.name === 'Shopify Awards') {
              searchUrl = `${awardSite.url}${category}/`;
            } else {
              searchUrl = `${awardSite.url}search?q=${encodeURIComponent(category)}`;
            }
            
            const response = await axios.get(searchUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; SneakLinkBot/1.0)',
              },
              timeout: 15000,
            });

            // Extract URLs from award winners and nominees
            const urlRegex = /(https?:\/\/[^\s\)"\]]+)/g;
            const foundUrls = response.data.match(urlRegex) || [];
            
            for (const foundUrl of foundUrls) {
              try {
                const cleanUrl = foundUrl.trim();
                
                if (looksLikeShopifyStore(cleanUrl) && !seenUrls.has(cleanUrl.toLowerCase())) {
                  seenUrls.add(cleanUrl.toLowerCase());
                  stores.push({
                    url: cleanUrl,
                    source: 'E-commerce Awards',
                    metadata: {
                      awardSite: awardSite.name,
                      category: category,
                      foundAt: new Date().toISOString(),
                    }
                  });
                }
              } catch (error) {
                continue;
              }
            }
            
            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 3000));
          } catch (error) {
            console.warn(`     ⚠️  Error checking ${awardSite.name} ${category}: ${error.message}`);
          }
        }
      } catch (error) {
        console.warn(`     ⚠️  Error accessing ${awardSite.name}: ${error.message}`);
      }
    }
    
    console.log(`✅ Found ${stores.length} stores from e-commerce awards`);
    
  } catch (error) {
    console.error('❌ Error scraping e-commerce awards:', error.message);
  }
  
  return stores;
};

/**
 * Scape marketplace and platform showcases
 */
export const scrapeMarketplaceShowcases = async () => {
  const stores = [];
  const seenUrls = new Set();
  
  try {
    console.log('🏪 Scraping marketplace showcases...');
    
    const marketplaces = [
      {
        name: 'Etsy Success Stories',
        url: 'https://www.etsy.com/blog/seller-stories/',
        searchQueries: [
          'successful shop',
          'top seller',
          'seller story',
        ]
      },
      {
        name: 'Amazon Seller Central',
        url: 'https://sellercentral.amazon.com/',
        searchQueries: [
          'success stories',
          'top sellers',
          'case studies',
        ]
      },
      {
        name: 'eBay Seller Center',
        url: 'https://www.ebay.com/sellercenter/',
        searchQueries: [
          'success stories',
          'top sellers',
          'seller case studies',
        ]
      },
      {
        name: 'BigCommerce',
        url: 'https://www.bigcommerce.com/',
        searchQueries: [
          'success stories',
          'case studies',
          'customer stories',
        ]
      }
    ];

    for (const marketplace of marketplaces) {
      try {
        console.log(`   🔍 Checking ${marketplace.name}...`);
        
        for (const query of marketplace.searchQueries) {
          try {
            let searchUrl;
            
            if (marketplace.name === 'Etsy Success Stories') {
              searchUrl = `${marketplace.url}`;
            } else {
              searchUrl = `${marketplace.url}blog/?search=${encodeURIComponent(query)}`;
            }
            
            const response = await axios.get(searchUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; SneakLinkBot/1.0)',
              },
              timeout: 15000,
            });

            // Extract URLs from success stories and case studies
            const urlRegex = /(https?:\/\/[^\s\)"\]]+)/g;
            const foundUrls = response.data.match(urlRegex) || [];
            
            for (const foundUrl of foundUrls) {
              try {
                const cleanUrl = foundUrl.trim();
                
                if (looksLikeShopifyStore(cleanUrl) && !seenUrls.has(cleanUrl.toLowerCase())) {
                  seenUrls.add(cleanUrl.toLowerCase());
                  stores.push({
                    url: cleanUrl,
                    source: 'Marketplace Showcases',
                    metadata: {
                      marketplace: marketplace.name,
                      searchQuery: query,
                      foundAt: new Date().toISOString(),
                    }
                  });
                }
              } catch (error) {
                continue;
              }
            }
            
            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 3000));
          } catch (error) {
            console.warn(`     ⚠️  Error searching ${marketplace.name} for "${query}": ${error.message}`);
          }
        }
      } catch (error) {
        console.warn(`     ⚠️  Error accessing ${marketplace.name}: ${error.message}`);
      }
    }
    
    console.log(`✅ Found ${stores.length} stores from marketplace showcases`);
    
  } catch (error) {
    console.error('❌ Error scraping marketplace showcases:', error.message);
  }
  
  return stores;
};
