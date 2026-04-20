import axios from 'axios';
import { looksLikeShopifyStore } from './shopifyUrlValidator.js';

/**
 * Scrape various forums and communities for Shopify store links
 * Forums are rich sources of store discoveries and case studies
 */
export const scrapeForums = async () => {
  const stores = [];
  const seenUrls = new Set();
  
  try {
    console.log('💬 Scraping forums for Shopify stores...');
    
    // Forum sources with their search URLs
    const forumSources = [
      {
        name: 'BlackHatWorld',
        baseUrl: 'https://www.blackhatworld.com/forums/',
        searchQueries: [
          'shopify store',
          'dropshipping journey',
          'ecommerce case study',
          'shopify theme',
        ]
      },
      {
        name: 'Warrior Forum',
        baseUrl: 'https://www.warriorforum.com/',
        searchQueries: [
          'shopify success',
          'ecommerce business',
          'dropshipping winner',
          'online store',
        ]
      },
      {
        name: 'Reddit (Additional)',
        baseUrl: 'https://www.reddit.com/',
        subreddits: [
          'ecommerce',
          'dropship',
          'shopify',
          'entrepreneur',
          'smallbusiness',
          'SideHustle',
          'OnlineBusiness',
        ]
      },
      {
        name: 'Indie Hackers',
        baseUrl: 'https://www.indiehackers.com/',
        searchQueries: [
          'shopify store',
          'ecommerce revenue',
          'dropshipping',
          'saas ecommerce',
        ]
      }
    ];

    for (const forum of forumSources) {
      console.log(`   🔍 Scraping ${forum.name}...`);
      
      if (forum.name === 'Reddit (Additional)') {
        // Handle Reddit specifically
        for (const subreddit of forum.subreddits) {
          try {
            const redditUrl = `https://www.reddit.com/r/${subreddit}/hot.json?limit=100`;
            
            const response = await axios.get(redditUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; SneakLinkBot/1.0)',
              },
              timeout: 15000,
            });

            const posts = response.data?.data?.children || [];
            
            for (const post of posts) {
              const text = (post.data?.selftext || '') + ' ' + (post.data?.title || '') + ' ' + (post.data?.url || '');
              const urlRegex = /(https?:\/\/[^\s\)]+)/g;
              const urls = text.match(urlRegex) || [];
              
              for (const url of urls) {
                try {
                  const cleanUrl = url.trim();
                  
                  if (looksLikeShopifyStore(cleanUrl) && !seenUrls.has(cleanUrl.toLowerCase())) {
                    seenUrls.add(cleanUrl.toLowerCase());
                    stores.push({
                      url: cleanUrl,
                      source: 'Forums',
                      metadata: {
                        forum: forum.name,
                        subreddit: subreddit,
                        postId: post.data?.id,
                        foundAt: new Date().toISOString(),
                      }
                    });
                  }
                } catch (error) {
                  continue;
                }
              }
            }
            
            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 2000));
          } catch (error) {
            console.warn(`     ⚠️  Error scraping r/${subreddit}: ${error.message}`);
          }
        }
      } else {
        // Handle other forums
        for (const query of forum.searchQueries) {
          try {
            const searchUrl = `${forum.baseUrl}search?q=${encodeURIComponent(query)}`;
            
            const response = await axios.get(searchUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; SneakLinkBot/1.0)',
              },
              timeout: 15000,
            });

            // Extract URLs from forum posts
            const urlRegex = /(https?:\/\/[^\s\)"\]]+)/g;
            const foundUrls = response.data.match(urlRegex) || [];
            
            for (const foundUrl of foundUrls) {
              try {
                const cleanUrl = foundUrl.trim();
                
                if (looksLikeShopifyStore(cleanUrl) && !seenUrls.has(cleanUrl.toLowerCase())) {
                  seenUrls.add(cleanUrl.toLowerCase());
                  stores.push({
                    url: cleanUrl,
                    source: 'Forums',
                    metadata: {
                      forum: forum.name,
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
            console.warn(`     ⚠️  Error searching ${forum.name} for "${query}": ${error.message}`);
          }
        }
      }
    }
    
    console.log(`✅ Found ${stores.length} stores from forums`);
    
  } catch (error) {
    console.error('❌ Error scraping forums:', error.message);
  }
  
  return stores;
};

/**
 * Scrape specialized e-commerce forums and communities
 */
export const scrapeEcommerceForums = async () => {
  const stores = [];
  const seenUrls = new Set();
  
  try {
    console.log('🛒 Scraping specialized e-commerce forums...');
    
    const ecommerceForums = [
      {
        name: 'Shopify Community',
        url: 'https://community.shopify.com/',
        searchQueries: [
          'store showcase',
          'success story',
          'new store launch',
          'theme showcase',
        ]
      },
      {
        name: 'eCommerce Fuel',
        url: 'https://www.ecommercefuel.com/',
        searchQueries: [
          'store example',
          'case study',
          'success story',
          'shopify store',
        ]
      },
      {
        name: 'Fastlane Forums',
        url: 'https://www.fastlaneforum.com/',
        searchQueries: [
          'shopify store',
          'ecommerce business',
          'dropshipping',
          'online store',
        ]
      },
      {
        name: 'BiggerPockets',
        url: 'https://www.biggerpockets.com/forums/',
        searchQueries: [
          'ecommerce',
          'online business',
          'retail business',
        ]
      }
    ];

    for (const forum of ecommerceForums) {
      try {
        console.log(`   🔍 Scraping ${forum.name}...`);
        
        for (const query of forum.searchQueries) {
          try {
            const searchUrl = `${forum.url}search?q=${encodeURIComponent(query)}`;
            
            const response = await axios.get(searchUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; SneakLinkBot/1.0)',
              },
              timeout: 15000,
            });

            // Extract URLs from forum content
            const urlRegex = /(https?:\/\/[^\s\)"\]]+)/g;
            const foundUrls = response.data.match(urlRegex) || [];
            
            for (const foundUrl of foundUrls) {
              try {
                const cleanUrl = foundUrl.trim();
                
                if (looksLikeShopifyStore(cleanUrl) && !seenUrls.has(cleanUrl.toLowerCase())) {
                  seenUrls.add(cleanUrl.toLowerCase());
                  stores.push({
                    url: cleanUrl,
                    source: 'E-commerce Forums',
                    metadata: {
                      forum: forum.name,
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
            console.warn(`     ⚠️  Error searching ${forum.name} for "${query}": ${error.message}`);
          }
        }
      } catch (error) {
        console.warn(`     ⚠️  Error accessing ${forum.name}: ${error.message}`);
      }
    }
    
    console.log(`✅ Found ${stores.length} stores from e-commerce forums`);
    
  } catch (error) {
    console.error('❌ Error scraping e-commerce forums:', error.message);
  }
  
  return stores;
};

/**
 * Scrape startup and business forums
 */
export const scrapeStartupForums = async () => {
  const stores = [];
  const seenUrls = new Set();
  
  try {
    console.log('🚀 Scraping startup and business forums...');
    
    const startupForums = [
      {
        name: 'Hacker News',
        url: 'https://news.ycombinator.com/',
        searchQueries: [
          'shopify',
          'ecommerce',
          'dropshipping',
          'online store',
        ]
      },
      {
        name: 'Product Hunt',
        url: 'https://www.producthunt.com/',
        searchQueries: [
          'shopify app',
          'ecommerce tool',
          'dropshipping tool',
          'online store',
        ]
      },
      {
        name: 'BetaList',
        url: 'https://www.betalist.com/',
        searchQueries: [
          'ecommerce',
          'shopify',
          'online business',
        ]
      },
      {
        name: 'AngelList',
        url: 'https://angel.co/',
        searchQueries: [
          'ecommerce startup',
          'shopify business',
          'online retail',
        ]
      }
    ];

    for (const forum of startupForums) {
      try {
        console.log(`   🔍 Scraping ${forum.name}...`);
        
        for (const query of forum.searchQueries) {
          try {
            let searchUrl;
            
            if (forum.name === 'Hacker News') {
              searchUrl = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&hitsPerPage=50`;
              
              const response = await axios.get(searchUrl, {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (compatible; SneakLinkBot/1.0)',
                },
                timeout: 15000,
              });

              const hits = response.data?.hits || [];
              
              for (const hit of hits) {
                const text = (hit.title || '') + ' ' + (hit.url || '') + ' ' + (hit.story_text || '');
                const urlRegex = /(https?:\/\/[^\s\)]+)/g;
                const urls = text.match(urlRegex) || [];
                
                for (const url of urls) {
                  try {
                    const cleanUrl = url.trim();
                    
                    if (looksLikeShopifyStore(cleanUrl) && !seenUrls.has(cleanUrl.toLowerCase())) {
                      seenUrls.add(cleanUrl.toLowerCase());
                      stores.push({
                        url: cleanUrl,
                        source: 'Startup Forums',
                        metadata: {
                          forum: forum.name,
                          searchQuery: query,
                          storyId: hit.objectID,
                          foundAt: new Date().toISOString(),
                        }
                      });
                    }
                  } catch (error) {
                    continue;
                  }
                }
              }
            } else {
              searchUrl = `${forum.url}search?q=${encodeURIComponent(query)}`;
              
              const response = await axios.get(searchUrl, {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (compatible; SneakLinkBot/1.0)',
                },
                timeout: 15000,
              });

              const urlRegex = /(https?:\/\/[^\s\)"\]]+)/g;
              const foundUrls = response.data.match(urlRegex) || [];
              
              for (const foundUrl of foundUrls) {
                try {
                  const cleanUrl = foundUrl.trim();
                  
                  if (looksLikeShopifyStore(cleanUrl) && !seenUrls.has(cleanUrl.toLowerCase())) {
                    seenUrls.add(cleanUrl.toLowerCase());
                    stores.push({
                      url: cleanUrl,
                      source: 'Startup Forums',
                      metadata: {
                        forum: forum.name,
                        searchQuery: query,
                        foundAt: new Date().toISOString(),
                      }
                    });
                  }
                } catch (error) {
                  continue;
                }
              }
            }
            
            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 3000));
          } catch (error) {
            console.warn(`     ⚠️  Error searching ${forum.name} for "${query}": ${error.message}`);
          }
        }
      } catch (error) {
        console.warn(`     ⚠️  Error accessing ${forum.name}: ${error.message}`);
      }
    }
    
    console.log(`✅ Found ${stores.length} stores from startup forums`);
    
  } catch (error) {
    console.error('❌ Error scraping startup forums:', error.message);
  }
  
  return stores;
};
