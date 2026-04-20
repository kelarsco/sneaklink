import axios from 'axios';
import { looksLikeShopifyStore } from './shopifyUrlValidator.js';

/**
 * Scrape app stores and marketplaces for Shopify stores
 * Many apps and services showcase successful stores as case studies
 */
export const scrapeAppStores = async () => {
  const stores = [];
  const seenUrls = new Set();
  
  try {
    console.log('📱 Scraping app stores for Shopify stores...');
    
    // App store sources with their search URLs
    const appStoreSources = [
      {
        name: 'Shopify App Store',
        baseUrl: 'https://apps.shopify.com/',
        searchQueries: [
          'marketing',
          'conversion',
          'analytics',
          'email marketing',
          'social media',
          'SEO',
          'customer reviews',
          'inventory',
        ]
      },
      {
        name: 'Chrome Web Store',
        baseUrl: 'https://chrome.google.com/webstore',
        searchQueries: [
          'shopify',
          'ecommerce',
          'dropshipping',
          'product importer',
        ]
      },
      {
        name: 'Firefox Add-ons',
        baseUrl: 'https://addons.mozilla.org/',
        searchQueries: [
          'shopify',
          'ecommerce',
          'online shopping',
        ]
      },
      {
        name: 'SaaS Marketplaces',
        baseUrl: 'https://www.g2.com/',
        searchQueries: [
          'shopify apps',
          'ecommerce tools',
          'marketing automation',
          'customer service',
        ]
      }
    ];

    for (const appStore of appStoreSources) {
      try {
        console.log(`   🔍 Scraping ${appStore.name}...`);
        
        for (const query of appStore.searchQueries) {
          try {
            let searchUrl;
            
            if (appStore.name === 'Shopify App Store') {
              searchUrl = `${appStore.baseUrl}search?q=${encodeURIComponent(query)}&categories=all`;
            } else if (appStore.name === 'Chrome Web Store') {
              searchUrl = `${appStore.baseUrl}search/${encodeURIComponent(query)}`;
            } else {
              searchUrl = `${appStore.baseUrl}search?q=${encodeURIComponent(query)}`;
            }
            
            const response = await axios.get(searchUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; SneakLinkBot/1.0)',
              },
              timeout: 15000,
            });

            // Extract URLs and case studies from app listings
            const urlRegex = /(https?:\/\/[^\s\)"\]]+)/g;
            const foundUrls = response.data.match(urlRegex) || [];
            
            for (const foundUrl of foundUrls) {
              try {
                const cleanUrl = foundUrl.trim();
                
                // Check if it's a store URL or case study
                if (looksLikeShopifyStore(cleanUrl) && !seenUrls.has(cleanUrl.toLowerCase())) {
                  seenUrls.add(cleanUrl.toLowerCase());
                  stores.push({
                    url: cleanUrl,
                    source: 'App Stores',
                    metadata: {
                      appStore: appStore.name,
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
            console.warn(`     ⚠️  Error searching ${appStore.name} for "${query}": ${error.message}`);
          }
        }
      } catch (error) {
        console.warn(`     ⚠️  Error accessing ${appStore.name}: ${error.message}`);
      }
    }
    
    console.log(`✅ Found ${stores.length} stores from app stores`);
    
  } catch (error) {
    console.error('❌ Error scraping app stores:', error.message);
  }
  
  return stores;
};

/**
 * Scrape Shopify app case studies and success stories
 */
export const scrapeShopifyAppCaseStudies = async () => {
  const stores = [];
  const seenUrls = new Set();
  
  try {
    console.log('📊 Scraping Shopify app case studies...');
    
    // Known Shopify apps with case study sections
    const appsWithCaseStudies = [
      {
        name: 'Klaviyo',
        caseStudyUrl: 'https://www.klaviyo.com/case-studies',
      },
      {
        name: 'Omnisend',
        caseStudyUrl: 'https://www.omnisend.com/case-studies',
      },
      {
        name: 'Privy',
        caseStudyUrl: 'https://www.privy.com/case-studies',
      },
      {
        name: 'Smile.io',
        caseStudyUrl: 'https://smile.io/case-studies',
      },
      {
        name: 'Loox',
        caseStudyUrl: 'https://www.loox.io/blog/case-studies',
      },
      {
        name: 'Judge.me',
        caseStudyUrl: 'https://judge.me/case-studies',
      },
      {
        name: 'Yotpo',
        caseStudyUrl: 'https://www.yotpo.com/case-studies',
      },
      {
        name: 'AfterShip',
        caseStudyUrl: 'https://www.aftership.com/case-studies',
      }
    ];

    for (const app of appsWithCaseStudies) {
      try {
        console.log(`   🔍 Checking ${app.name} case studies...`);
        
        const response = await axios.get(app.caseStudyUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; SneakLinkBot/1.0)',
          },
          timeout: 15000,
        });

        // Extract store URLs from case studies
        const urlRegex = /(https?:\/\/[^\s\)"\]]+)/g;
        const foundUrls = response.data.match(urlRegex) || [];
        
        for (const foundUrl of foundUrls) {
          try {
            const cleanUrl = foundUrl.trim();
            
            if (looksLikeShopifyStore(cleanUrl) && !seenUrls.has(cleanUrl.toLowerCase())) {
              seenUrls.add(cleanUrl.toLowerCase());
              stores.push({
                url: cleanUrl,
                source: 'Shopify App Case Studies',
                metadata: {
                  appName: app.name,
                  caseStudyUrl: app.caseStudyUrl,
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
        console.warn(`     ⚠️  Error accessing ${app.name} case studies: ${error.message}`);
      }
    }
    
    console.log(`✅ Found ${stores.length} stores from Shopify app case studies`);
    
  } catch (error) {
    console.error('❌ Error scraping Shopify app case studies:', error.message);
  }
  
  return stores;
};

/**
 * Scrape review sites and directories
 */
export const scrapeReviewSites = async () => {
  const stores = [];
  const seenUrls = new Set();
  
  try {
    console.log('⭐ Scraping review sites and directories...');
    
    const reviewSites = [
      {
        name: 'Capterra',
        url: 'https://www.capterra.com/',
        searchQueries: [
          'shopify stores',
          'ecommerce platforms',
          'online store reviews',
        ]
      },
      {
        name: 'Software Advice',
        url: 'https://www.softwareadvice.com/',
        searchQueries: [
          'shopify',
          'ecommerce software',
          'online store',
        ]
      },
      {
        name: 'TrustRadius',
        url: 'https://www.trustradius.com/',
        searchQueries: [
          'shopify',
          'ecommerce platform',
          'online business',
        ]
      },
      {
        name: 'GetApp',
        url: 'https://www.getapp.com/',
        searchQueries: [
          'shopify',
          'ecommerce software',
          'online store software',
        ]
      }
    ];

    for (const site of reviewSites) {
      try {
        console.log(`   🔍 Scraping ${site.name}...`);
        
        for (const query of site.searchQueries) {
          try {
            const searchUrl = `${site.url}search?q=${encodeURIComponent(query)}`;
            
            const response = await axios.get(searchUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; SneakLinkBot/1.0)',
              },
              timeout: 15000,
            });

            // Extract URLs from reviews and listings
            const urlRegex = /(https?:\/\/[^\s\)"\]]+)/g;
            const foundUrls = response.data.match(urlRegex) || [];
            
            for (const foundUrl of foundUrls) {
              try {
                const cleanUrl = foundUrl.trim();
                
                if (looksLikeShopifyStore(cleanUrl) && !seenUrls.has(cleanUrl.toLowerCase())) {
                  seenUrls.add(cleanUrl.toLowerCase());
                  stores.push({
                    url: cleanUrl,
                    source: 'Review Sites',
                    metadata: {
                      siteName: site.name,
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
            console.warn(`     ⚠️  Error searching ${site.name} for "${query}": ${error.message}`);
          }
        }
      } catch (error) {
        console.warn(`     ⚠️  Error accessing ${site.name}: ${error.message}`);
      }
    }
    
    console.log(`✅ Found ${stores.length} stores from review sites`);
    
  } catch (error) {
    console.error('❌ Error scraping review sites:', error.message);
  }
  
  return stores;
};
