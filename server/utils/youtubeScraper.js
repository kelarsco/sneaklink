import axios from 'axios';
import { looksLikeShopifyStore } from './shopifyUrlValidator.js';

/**
 * Scrape YouTube for Shopify store links
 * YouTube is a major platform for store promotion and tutorials
 */
export const scrapeYouTube = async () => {
  const stores = [];
  const seenUrls = new Set();
  
  try {
    console.log('🎥 Scraping YouTube for Shopify stores...');
    
    // Search queries that often contain Shopify stores
    const searchQueries = [
      'shopify store tour',
      'shopify success story',
      'dropshipping winner',
      'shopify product review',
      'print on demand store',
      'ecommerce case study',
      'shopify dropshipping',
      'winning shopify store',
      'shopify theme showcase',
    ];

    for (const query of searchQueries) {
      try {
        console.log(`   🔍 Searching: "${query}"`);
        
        // Use YouTube's search API or alternative methods
        const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
        
        const response = await axios.get(searchUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; SneakLinkBot/1.0)',
          },
          timeout: 15000,
        });

        // Extract video URLs and descriptions
        const urlRegex = /(https?:\/\/[^\s\)"\]]+)/g;
        const foundUrls = response.data.match(urlRegex) || [];
        
        for (const foundUrl of foundUrls) {
          try {
            const cleanUrl = foundUrl.trim();
            
            // Check if it's a YouTube video URL
            if (cleanUrl.includes('youtube.com/watch') || cleanUrl.includes('youtu.be')) {
              // Get video description for store links
              const videoId = extractVideoId(cleanUrl);
              if (videoId) {
                const storeUrls = await getVideoDescription(videoId);
                
                for (const storeUrl of storeUrls) {
                  if (looksLikeShopifyStore(storeUrl) && !seenUrls.has(storeUrl.toLowerCase())) {
                    seenUrls.add(storeUrl.toLowerCase());
                    stores.push({
                      url: storeUrl,
                      source: 'YouTube',
                      metadata: {
                        searchQuery: query,
                        videoId: videoId,
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
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.warn(`     ⚠️  Error searching YouTube for "${query}": ${error.message}`);
      }
    }
    
    console.log(`✅ Found ${stores.length} stores from YouTube`);
    
  } catch (error) {
    console.error('❌ Error scraping YouTube:', error.message);
  }
  
  return stores;
};

/**
 * Extract video ID from YouTube URL
 */
function extractVideoId(url) {
  try {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Get video description and extract store URLs
 */
async function getVideoDescription(videoId) {
  const storeUrls = [];
  
  try {
    // Use Invidious instance or YouTube API to get video details
    const apiUrl = `https://yewtu.be/api/v1/videos/${videoId}`;
    
    const response = await axios.get(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SneakLinkBot/1.0)',
      },
      timeout: 10000,
    });

    const videoData = response.data;
    const description = videoData.description || '';
    
    // Extract URLs from description
    const urlRegex = /(https?:\/\/[^\s\)]+)/g;
    const urls = description.match(urlRegex) || [];
    
    for (const url of urls) {
      try {
        const cleanUrl = url.trim();
        
        // Filter for potential store URLs
        if (looksLikeShopifyStore(cleanUrl)) {
          storeUrls.push(cleanUrl);
        }
      } catch (error) {
        continue;
      }
    }
    
    // Also check comments if available
    if (videoData.comments) {
      for (const comment of videoData.comments.slice(0, 50)) { // Limit to top 50 comments
        const commentText = comment.content || '';
        const commentUrls = commentText.match(urlRegex) || [];
        
        for (const url of commentUrls) {
          try {
            const cleanUrl = url.trim();
            
            if (looksLikeShopifyStore(cleanUrl)) {
              storeUrls.push(cleanUrl);
            }
          } catch (error) {
            continue;
          }
        }
      }
    }
    
  } catch (error) {
    // Try alternative method - YouTube NoCookie instance
    try {
      const fallbackUrl = `https://yewtu.be/watch?v=${videoId}`;
      const fallbackResponse = await axios.get(fallbackUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SneakLinkBot/1.0)',
        },
        timeout: 10000,
      });

      const urlRegex = /(https?:\/\/[^\s\)]+)/g;
      const urls = fallbackResponse.data.match(urlRegex) || [];
      
      for (const url of urls) {
        try {
          const cleanUrl = url.trim();
          
          if (looksLikeShopifyStore(cleanUrl)) {
            storeUrls.push(cleanUrl);
          }
        } catch (error) {
          continue;
        }
      }
    } catch (fallbackError) {
      // Skip if both methods fail
    }
  }
  
  return [...new Set(storeUrls)]; // Remove duplicates
}

/**
 * Scrape YouTube channels dedicated to e-commerce and dropshipping
 */
export const scrapeYouTubeChannels = async () => {
  const stores = [];
  const seenUrls = new Set();
  
  try {
    console.log('📺 Scraping YouTube e-commerce channels...');
    
    // Known e-commerce and dropshipping channels
    const channels = [
      'UCqo9jKhX3b_L5aRrvsU2HA', // Example channel IDs
      'UC8bXn2GY0t_7f2LQZ6y7Qg',
      'UC3wN3WwR8dQJ4L8Q8Q8Q8Q',
    ];

    for (const channelId of channels) {
      try {
        // Get channel videos
        const channelUrl = `https://yewtu.be/api/v1/channels/${channelId}/videos`;
        
        const response = await axios.get(channelUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; SneakLinkBot/1.0)',
          },
          timeout: 15000,
        });

        const videos = response.data || [];
        
        for (const video of videos.slice(0, 20)) { // Get recent 20 videos
          try {
            const videoId = video.videoId;
            const storeUrls = await getVideoDescription(videoId);
            
            for (const storeUrl of storeUrls) {
              if (looksLikeShopifyStore(storeUrl) && !seenUrls.has(storeUrl.toLowerCase())) {
                seenUrls.add(storeUrl.toLowerCase());
                stores.push({
                  url: storeUrl,
                  source: 'YouTube Channel',
                  metadata: {
                    channelId: channelId,
                    videoId: videoId,
                    videoTitle: video.title,
                    foundAt: new Date().toISOString(),
                  }
                });
              }
            }
          } catch (error) {
            continue;
          }
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 3000));
      } catch (error) {
        console.warn(`     ⚠️  Error fetching channel ${channelId}: ${error.message}`);
      }
    }
    
    console.log(`✅ Found ${stores.length} stores from YouTube channels`);
    
  } catch (error) {
    console.error('❌ Error scraping YouTube channels:', error.message);
  }
  
  return stores;
};
