import axios from 'axios';
import { looksLikeShopifyStore } from './shopifyUrlValidator.js';

/**
 * Scrape Discord servers and communities for Shopify store links
 * Discord is a rich source of new store discoveries
 */
export const scrapeDiscord = async () => {
  const stores = [];
  const seenUrls = new Set();
  
  try {
    console.log('💬 Scraping Discord communities for Shopify stores...');
    
    // Discord public server discovery channels
    const discoverySources = [
      {
        name: 'Discord Server Lists',
        urls: [
          'https://disboard.org/servers/tag/shopify',
          'https://top.gg/servers/shopify',
          'https://discordlist.net/servers/shopify',
        ]
      },
      {
        name: 'E-commerce Communities',
        urls: [
          'https://disboard.org/servers/tag/ecommerce',
          'https://disboard.org/servers/tag/dropshipping',
          'https://disboard.org/servers/tag/entrepreneur',
        ]
      }
    ];

    for (const source of discoverySources) {
      console.log(`   🔍 Checking ${source.name}...`);
      
      for (const url of source.urls) {
        try {
          const response = await axios.get(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; SneakLinkBot/1.0)',
            },
            timeout: 15000,
          });

          // Extract URLs using regex
          const urlRegex = /(https?:\/\/[^\s\)]+)/g;
          const foundUrls = response.data.match(urlRegex) || [];
          
          for (const foundUrl of foundUrls) {
            try {
              const cleanUrl = foundUrl.trim();
              
              // Look for potential store URLs
              if (looksLikeShopifyStore(cleanUrl) && !seenUrls.has(cleanUrl.toLowerCase())) {
                seenUrls.add(cleanUrl.toLowerCase());
                stores.push({
                  url: cleanUrl,
                  source: 'Discord Communities',
                  metadata: {
                    discoverySource: source.name,
                    foundAt: new Date().toISOString(),
                  }
                });
              }
            } catch (error) {
              // Skip invalid URLs
              continue;
            }
          }
          
          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
          console.warn(`     ⚠️  Error fetching ${url}: ${error.message}`);
        }
      }
    }
    
    console.log(`✅ Found ${stores.length} stores from Discord communities`);
    
  } catch (error) {
    console.error('❌ Error scraping Discord:', error.message);
  }
  
  return stores;
};

/**
 * Scrape Discord invite links from public repositories
 * Many Discord servers are shared via invite links in GitHub repos
 */
export const scrapeDiscordInvites = async () => {
  const stores = [];
  const seenUrls = new Set();
  
  try {
    console.log('🔗 Scraping Discord invite links from repositories...');
    
    // Search GitHub for Discord invite links
    const searchQueries = [
      'shopify discord invite',
      'ecommerce discord server',
      'dropshipping discord',
      'print on demand discord',
    ];

    for (const query of searchQueries) {
      try {
        const searchUrl = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=updated&per_page=20`;
        
        const response = await axios.get(searchUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; SneakLinkBot/1.0)',
            'Accept': 'application/vnd.github.v3+json',
          },
          timeout: 15000,
        });

        const repos = response.data.items || [];
        
        for (const repo of repos) {
          try {
            // Get repository content to find Discord links
            const readmeUrl = `https://api.github.com/repos/${repo.full_name}/readme`;
            const readmeResponse = await axios.get(readmeUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; SneakLinkBot/1.0)',
                'Accept': 'application/vnd.github.v3+json',
              },
              timeout: 10000,
            });

            const content = Buffer.from(readmeResponse.data.content, 'base64').toString();
            
            // Extract Discord invite links
            const discordRegex = /(https?:\/\/discord\.gg\/[^\s\)]+)/g;
            const discordLinks = content.match(discordRegex) || [];
            
            for (const discordLink of discordLinks) {
              try {
                // Get Discord server info from invite
                const inviteResponse = await axios.get(`https://discord.com/api/v10/invites/${discordLink.split('/').pop()}`, {
                  headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; SneakLinkBot/1.0)',
                  },
                  timeout: 10000,
                });

                if (inviteResponse.data.guild) {
                  const guild = inviteResponse.data.guild;
                  
                  // Look for store URLs in server description
                  const description = guild.description || '';
                  const urlRegex = /(https?:\/\/[^\s\)]+)/g;
                  const urls = description.match(urlRegex) || [];
                  
                  for (const url of urls) {
                    if (looksLikeShopifyStore(url) && !seenUrls.has(url.toLowerCase())) {
                      seenUrls.add(url.toLowerCase());
                      stores.push({
                        url: url,
                        source: 'Discord Server Invite',
                        metadata: {
                          serverName: guild.name,
                          serverId: guild.id,
                          inviteCode: discordLink.split('/').pop(),
                          foundAt: new Date().toISOString(),
                        }
                      });
                    }
                  }
                }
              } catch (error) {
                // Skip invalid invites
                continue;
              }
            }
            
            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (error) {
            continue;
          }
        }
        
        // Rate limiting between searches
        await new Promise(resolve => setTimeout(resolve, 3000));
      } catch (error) {
        console.warn(`     ⚠️  Error searching GitHub for "${query}": ${error.message}`);
      }
    }
    
    console.log(`✅ Found ${stores.length} stores from Discord invites`);
    
  } catch (error) {
    console.error('❌ Error scraping Discord invites:', error.message);
  }
  
  return stores;
};
