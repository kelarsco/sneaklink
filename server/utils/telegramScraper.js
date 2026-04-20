import axios from 'axios';
import { looksLikeShopifyStore } from './shopifyUrlValidator.js';

/**
 * Scrape Telegram channels and groups for Shopify store links
 * Telegram is a major source for store promotion and discovery
 */
export const scrapeTelegram = async () => {
  const stores = [];
  const seenUrls = new Set();
  
  try {
    console.log('📱 Scraping Telegram channels for Shopify stores...');
    
    // Telegram public channel discovery sources
    const discoverySources = [
      {
        name: 'Shopify Communities',
        keywords: [
          'shopify store',
          'shopify dropshipping',
          'ecommerce success',
          'shopify theme',
          'print on demand',
        ]
      },
      {
        name: 'Dropshipping Groups',
        keywords: [
          'dropshipping wins',
          'shopify product',
          'ecommerce tips',
          'dropshipping suppliers',
        ]
      },
      {
        name: 'E-commerce Communities',
        keywords: [
          'ecommerce store',
          'online business',
          'digital products',
          'e-commerce success',
        ]
      }
    ];

    for (const source of discoverySources) {
      console.log(`   🔍 Searching ${source.name}...`);
      
      for (const keyword of source.keywords) {
        try {
          // Use Telegram's public search API (if available) or alternative methods
          // Note: Telegram's official API requires authentication, so we'll use public aggregators
          const searchUrl = `https://t.me/s/${encodeURIComponent(keyword)}`;
          
          const response = await axios.get(searchUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; SneakLinkBot/1.0)',
            },
            timeout: 15000,
          });

          // Extract URLs from channel posts
          const urlRegex = /(https?:\/\/[^\s\)]+)/g;
          const foundUrls = response.data.match(urlRegex) || [];
          
          for (const foundUrl of foundUrls) {
            try {
              const cleanUrl = foundUrl.trim();
              
              if (looksLikeShopifyStore(cleanUrl) && !seenUrls.has(cleanUrl.toLowerCase())) {
                seenUrls.add(cleanUrl.toLowerCase());
                stores.push({
                  url: cleanUrl,
                  source: 'Telegram Channels',
                  metadata: {
                    discoverySource: source.name,
                    keyword: keyword,
                    foundAt: new Date().toISOString(),
                  }
                });
              }
            } catch (error) {
              continue;
            }
          }
          
          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
          // Try alternative method - use public channel directories
          try {
            const directoryUrl = `https://t.me/search?q=${encodeURIComponent(keyword)}`;
            const dirResponse = await axios.get(directoryUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; SneakLinkBot/1.0)',
              },
              timeout: 15000,
            });

            const urlRegex = /(https?:\/\/[^\s\)]+)/g;
            const foundUrls = dirResponse.data.match(urlRegex) || [];
            
            for (const foundUrl of foundUrls) {
              try {
                const cleanUrl = foundUrl.trim();
                
                if (looksLikeShopifyStore(cleanUrl) && !seenUrls.has(cleanUrl.toLowerCase())) {
                  seenUrls.add(cleanUrl.toLowerCase());
                  stores.push({
                    url: cleanUrl,
                    source: 'Telegram Directory',
                    metadata: {
                      discoverySource: source.name,
                      keyword: keyword,
                      foundAt: new Date().toISOString(),
                    }
                  });
                }
              } catch (error) {
                continue;
              }
            }
          } catch (dirError) {
            console.warn(`     ⚠️  Error searching Telegram for "${keyword}": ${error.message}`);
          }
        }
      }
    }
    
    console.log(`✅ Found ${stores.length} stores from Telegram`);
    
  } catch (error) {
    console.error('❌ Error scraping Telegram:', error.message);
  }
  
  return stores;
};

/**
 * Scrape Telegram channel directories and catalogs
 * These directories list popular e-commerce and business channels
 */
export const scrapeTelegramDirectories = async () => {
  const stores = [];
  const seenUrls = new Set();
  
  try {
    console.log('📚 Scraping Telegram channel directories...');
    
    const directories = [
      {
        name: 'Telegram Channels',
        url: 'https://tgstat.com/search?q=shopify',
        category: 'business'
      },
      {
        name: 'TLGRM',
        url: 'https://tlgrm.com/search?q=ecommerce',
        category: 'business'
      },
      {
        name: 'Telegram Directory',
        url: 'https://telegramchannels.me/search?q=dropshipping',
        category: 'business'
      }
    ];

    for (const dir of directories) {
      try {
        console.log(`   🔍 Checking ${dir.name}...`);
        
        const response = await axios.get(dir.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; SneakLinkBot/1.0)',
          },
          timeout: 15000,
        });

        // Extract channel information and URLs
        const urlRegex = /(https?:\/\/[^\s\)]+)/g;
        const foundUrls = response.data.match(urlRegex) || [];
        
        for (const foundUrl of foundUrls) {
          try {
            const cleanUrl = foundUrl.trim();
            
            // Check if it's a Shopify store
            if (looksLikeShopifyStore(cleanUrl) && !seenUrls.has(cleanUrl.toLowerCase())) {
              seenUrls.add(cleanUrl.toLowerCase());
              stores.push({
                url: cleanUrl,
                source: 'Telegram Directory',
                metadata: {
                  directory: dir.name,
                  category: dir.category,
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
        console.warn(`     ⚠️  Error accessing ${dir.name}: ${error.message}`);
      }
    }
    
    console.log(`✅ Found ${stores.length} stores from Telegram directories`);
    
  } catch (error) {
    console.error('❌ Error scraping Telegram directories:', error.message);
  }
  
  return stores;
};
