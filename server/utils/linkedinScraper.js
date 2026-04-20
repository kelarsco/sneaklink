import axios from 'axios';
import { looksLikeShopifyStore } from './shopifyUrlValidator.js';

/**
 * Scrape LinkedIn for Shopify store links
 * LinkedIn is a source for business success stories and company pages
 */
export const scrapeLinkedIn = async () => {
  const stores = [];
  const seenUrls = new Set();
  
  try {
    console.log('💼 Scraping LinkedIn for Shopify stores...');
    
    // Search queries for LinkedIn posts and company pages
    const searchQueries = [
      'shopify store owner',
      'ecommerce entrepreneur',
      'dropshipping business',
      'online store founder',
      'e-commerce success story',
      'shopify expert',
      'print on demand business',
      'digital commerce',
    ];

    for (const query of searchQueries) {
      try {
        console.log(`   🔍 Searching LinkedIn: "${query}"`);
        
        // Use LinkedIn's search or alternative methods
        const searchUrl = `https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(query)}`;
        
        const response = await axios.get(searchUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; SneakLinkBot/1.0)',
          },
          timeout: 15000,
        });

        // Extract URLs from search results
        const urlRegex = /(https?:\/\/[^\s\)"\]]+)/g;
        const foundUrls = response.data.match(urlRegex) || [];
        
        for (const foundUrl of foundUrls) {
          try {
            const cleanUrl = foundUrl.trim();
            
            // Check if it's a LinkedIn profile or company page
            if (cleanUrl.includes('linkedin.com/in/') || cleanUrl.includes('linkedin.com/company/')) {
              // Get profile/company page for store links
              const profileUrls = await getLinkedInProfileUrls(cleanUrl);
              
              for (const profileUrl of profileUrls) {
                if (looksLikeShopifyStore(profileUrl) && !seenUrls.has(profileUrl.toLowerCase())) {
                  seenUrls.add(profileUrl.toLowerCase());
                  stores.push({
                    url: profileUrl,
                    source: 'LinkedIn',
                    metadata: {
                      searchQuery: query,
                      profileUrl: cleanUrl,
                      foundAt: new Date().toISOString(),
                    }
                  });
                }
              }
            }
          } catch (error) {
            continue;
          }
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 3000));
      } catch (error) {
        console.warn(`     ⚠️  Error searching LinkedIn for "${query}": ${error.message}`);
      }
    }
    
    console.log(`✅ Found ${stores.length} stores from LinkedIn`);
    
  } catch (error) {
    console.error('❌ Error scraping LinkedIn:', error.message);
  }
  
  return stores;
};

/**
 * Get URLs from LinkedIn profile or company page
 */
async function getLinkedInProfileUrls(profileUrl) {
  const urls = [];
  
  try {
    const response = await axios.get(profileUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SneakLinkBot/1.0)',
      },
      timeout: 10000,
    });

    const pageContent = response.data;
    
    // Extract URLs from profile description, experience, and website sections
    const urlRegex = /(https?:\/\/[^\s\)"\]]+)/g;
    const foundUrls = pageContent.match(urlRegex) || [];
    
    for (const url of foundUrls) {
      try {
        const cleanUrl = url.trim();
        
        // Filter for potential store URLs
        if (looksLikeShopifyStore(cleanUrl)) {
          urls.push(cleanUrl);
        }
      } catch (error) {
        continue;
      }
    }
    
  } catch (error) {
    // Try alternative method - use textise dot iitty
    try {
      const textiseUrl = `https://r.jina.ai/http://${profileUrl.replace(/^https?:\/\//, '')}`;
      const fallbackResponse = await axios.get(textiseUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SneakLinkBot/1.0)',
        },
        timeout: 10000,
      });

      const urlRegex = /(https?:\/\/[^\s\)"\]]+)/g;
      const urls = fallbackResponse.data.match(urlRegex) || [];
      
      for (const url of urls) {
        try {
          const cleanUrl = url.trim();
          
          if (looksLikeShopifyStore(cleanUrl)) {
            urls.push(cleanUrl);
          }
        } catch (error) {
          continue;
        }
      }
    } catch (fallbackError) {
      // Skip if both methods fail
    }
  }
  
  return [...new Set(urls)]; // Remove duplicates
}

/**
 * Scrape LinkedIn articles and posts for store mentions
 */
export const scrapeLinkedInArticles = async () => {
  const stores = [];
  const seenUrls = new Set();
  
  try {
    console.log('📝 Scraping LinkedIn articles for Shopify stores...');
    
    // Search for articles about e-commerce success
    const articleQueries = [
      'shopify success story',
      'ecommerce case study',
      'dropshipping journey',
      'online business growth',
      'e-commerce entrepreneur',
    ];

    for (const query of articleQueries) {
      try {
        const searchUrl = `https://www.linkedin.com/search/results/content/?keywords=${encodeURIComponent(query)}`;
        
        const response = await axios.get(searchUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; SneakLinkBot/1.0)',
          },
          timeout: 15000,
        });

        // Extract article URLs
        const urlRegex = /(https?:\/\/[^\s\)"\]]+)/g;
        const foundUrls = response.data.match(urlRegex) || [];
        
        for (const foundUrl of foundUrls) {
          try {
            const cleanUrl = foundUrl.trim();
            
            if (cleanUrl.includes('linkedin.com/posts/') || cleanUrl.includes('linkedin.com/pulse/')) {
              // Get article content for store links
              const articleUrls = await getLinkedInArticleUrls(cleanUrl);
              
              for (const articleUrl of articleUrls) {
                if (looksLikeShopifyStore(articleUrl) && !seenUrls.has(articleUrl.toLowerCase())) {
                  seenUrls.add(articleUrl.toLowerCase());
                  stores.push({
                    url: articleUrl,
                    source: 'LinkedIn Articles',
                    metadata: {
                      searchQuery: query,
                      articleUrl: cleanUrl,
                      foundAt: new Date().toISOString(),
                    }
                  });
                }
              }
            }
          } catch (error) {
            continue;
          }
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 3000));
      } catch (error) {
        console.warn(`     ⚠️  Error searching LinkedIn articles for "${query}": ${error.message}`);
      }
    }
    
    console.log(`✅ Found ${stores.length} stores from LinkedIn articles`);
    
  } catch (error) {
    console.error('❌ Error scraping LinkedIn articles:', error.message);
  }
  
  return stores;
};

/**
 * Get URLs from LinkedIn article
 */
async function getLinkedInArticleUrls(articleUrl) {
  const urls = [];
  
  try {
    const response = await axios.get(articleUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SneakLinkBot/1.0)',
      },
      timeout: 10000,
    });

    const pageContent = response.data;
    
    // Extract URLs from article content
    const urlRegex = /(https?:\/\/[^\s\)"\]]+)/g;
    const foundUrls = pageContent.match(urlRegex) || [];
    
    for (const url of foundUrls) {
      try {
        const cleanUrl = url.trim();
        
        if (looksLikeShopifyStore(cleanUrl)) {
          urls.push(cleanUrl);
        }
      } catch (error) {
        continue;
      }
    }
    
  } catch (error) {
    // Try alternative method
    try {
      const textiseUrl = `https://r.jina.ai/http://${articleUrl.replace(/^https?:\/\//, '')}`;
      const fallbackResponse = await axios.get(textiseUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SneakLinkBot/1.0)',
        },
        timeout: 10000,
      });

      const urlRegex = /(https?:\/\/[^\s\)"\]]+)/g;
      const urls = fallbackResponse.data.match(urlRegex) || [];
      
      for (const url of urls) {
        try {
          const cleanUrl = url.trim();
          
          if (looksLikeShopifyStore(cleanUrl)) {
            urls.push(cleanUrl);
          }
        } catch (error) {
          continue;
        }
      }
    } catch (fallbackError) {
      // Skip if both methods fail
    }
  }
  
  return [...new Set(urls)]; // Remove duplicates
}
