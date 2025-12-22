import axios from 'axios';
import * as cheerio from 'cheerio';
import { getHTMLWithAPI, scrapeWithAPI } from './scrapingApi.js';

/**
 * Detect if a URL is a Shopify store - HIGH ACCURACY DETECTION
 * Uses multiple detection methods in order of reliability:
 * 1. /cart.js endpoint (highest accuracy)
 * 2. X-ShopId header
 * 3. cdn.shopify.com in assets
 * 4. /products.json endpoint
 * 5. .myshopify.com domain (fallback)
 */
export const isShopifyStore = async (url) => {
  try {
    // Normalize URL
    const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
    const urlObj = new URL(normalizedUrl);
    const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
    const urlLower = normalizedUrl.toLowerCase();

    // Helper function to make requests with error handling
    const makeRequest = async (requestUrl, options = {}) => {
      try {
        const defaultOptions = {
          timeout: 8000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
          maxRedirects: 5,
          validateStatus: (status) => status < 500,
        };
        
        const response = await axios.get(requestUrl, { ...defaultOptions, ...options });
        return { response, error: null };
      } catch (error) {
        return { response: null, error };
      }
    };

    // CHECK 1: Test /cart.js - Highest accuracy (almost flawless)
    // If it returns JSON, it's Shopify
    try {
      const cartUrl = `${baseUrl}/cart.js`;
      const { response: cartResponse } = await makeRequest(cartUrl);
      
      if (cartResponse && cartResponse.status === 200) {
        const contentType = cartResponse.headers['content-type'] || '';
        if (contentType.includes('application/json') || contentType.includes('text/javascript')) {
          try {
            const data = typeof cartResponse.data === 'string' 
              ? JSON.parse(cartResponse.data) 
              : cartResponse.data;
            // If it's valid JSON/JS with cart data structure, it's Shopify
            if (data && (data.items !== undefined || data.token !== undefined || data.total_price !== undefined)) {
              return true;
            }
          } catch (e) {
            // If it's JSON but not cart structure, still might be Shopify
            if (contentType.includes('application/json')) {
              return true;
            }
          }
        }
      }
    } catch (error) {
      // Continue to next check
    }

    // CHECK 2: Test Shopify headers - X-ShopId
    try {
      const { response: headerResponse } = await makeRequest(normalizedUrl);
      if (headerResponse && headerResponse.headers) {
        const shopId = headerResponse.headers['x-shopid'] || headerResponse.headers['X-ShopId'];
        if (shopId) {
          return true; // X-ShopId exists → Shopify
        }
      }
    } catch (error) {
      // Continue to next check
    }

    // CHECK 3: Test /products.json or /products/xxx.js
    // If it returns product data → Shopify
    try {
      const productsUrl = `${baseUrl}/products.json`;
      const { response: productsResponse } = await makeRequest(productsUrl);
      
      if (productsResponse && productsResponse.status === 200) {
        try {
          const data = typeof productsResponse.data === 'string' 
            ? JSON.parse(productsResponse.data) 
            : productsResponse.data;
          if (data && Array.isArray(data.products)) {
            return true; // Valid products.json → Shopify
          }
        } catch (e) {
          // Not valid JSON, continue
        }
      }
    } catch (error) {
      // Continue to next check
    }

    // CHECK 3b: Test /collections.json (Shopify Storefront API)
    // If it returns collections data → Shopify
    try {
      const collectionsUrl = `${baseUrl}/collections.json`;
      const { response: collectionsResponse } = await makeRequest(collectionsUrl);
      
      if (collectionsResponse && collectionsResponse.status === 200) {
        try {
          const data = typeof collectionsResponse.data === 'string' 
            ? JSON.parse(collectionsResponse.data) 
            : collectionsResponse.data;
          if (data && Array.isArray(data.collections)) {
            return true; // Valid collections.json → Shopify
          }
        } catch (e) {
          // Not valid JSON, continue
        }
      }
    } catch (error) {
      // Continue to next check
    }

    // CHECK 3c: Test /search/suggest.json (Shopify Storefront API)
    // If it returns search suggestions → Shopify
    try {
      const searchUrl = `${baseUrl}/search/suggest.json?q=test`;
      const { response: searchResponse } = await makeRequest(searchUrl);
      
      if (searchResponse && searchResponse.status === 200) {
        try {
          const data = typeof searchResponse.data === 'string' 
            ? JSON.parse(searchResponse.data) 
            : searchResponse.data;
          // Shopify search/suggest.json has specific structure
          if (data && (data.products !== undefined || data.suggestions !== undefined)) {
            return true; // Valid search/suggest.json → Shopify
          }
        } catch (e) {
          // Not valid JSON, continue
        }
      }
    } catch (error) {
      // Continue to next check
    }

    // CHECK 4: Test asset CDN - Look for cdn.shopify.com
    try {
      let html = null;
      if (process.env.SCRAPING_API_KEY) {
        html = await getHTMLWithAPI(normalizedUrl);
      }
      
      if (!html) {
        const { response: htmlResponse } = await makeRequest(normalizedUrl);
        if (htmlResponse) {
          html = htmlResponse.data;
        }
      }

      if (html) {
        const htmlLower = html.toLowerCase();
        
        // Check for cdn.shopify.com in HTML content
        if (htmlLower.includes('cdn.shopify.com')) {
          return true; // Found cdn.shopify.com → Shopify
        }

        // Also check in script and link tags
        const $ = cheerio.load(html);
        let foundCdn = false;
        
        $('script[src], link[href]').each((i, elem) => {
          const src = $(elem).attr('src') || $(elem).attr('href') || '';
          if (src.includes('cdn.shopify.com')) {
            foundCdn = true;
            return false; // Break loop
          }
        });

        if (foundCdn) {
          return true;
        }
      }
    } catch (error) {
      // Continue to next check
    }

    // CHECK 5: Fallback - .myshopify.com domain check
    if (urlLower.includes('.myshopify.com')) {
      const domainMatch = urlLower.match(/https?:\/\/([^\/]+)/);
      if (domainMatch) {
        const domain = domainMatch[1];
        // Must be a store subdomain, not admin, partners, help, etc.
        const excludedSubdomains = ['admin', 'partners', 'help', 'community', 'developers', 'apps', 'checkout'];
        const isExcluded = excludedSubdomains.some(sub => domain.startsWith(sub + '.'));
        if (!isExcluded) {
          return true; // Confirmed .myshopify.com store
        }
      }
    }

    // If none of the checks passed, it's not a Shopify store
    return false;
  } catch (error) {
    // If we can't access the URL, it's not a valid store
    console.error(`Error checking Shopify store: ${url}`, error.message);
    return false;
  }
};

/**
 * Check if store is password protected
 * Uses strict detection to avoid false positives
 */
export const isPasswordProtected = async (url) => {
  try {
    const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
    
    // Try ScrapingAPI first if available
    let html = null;
    if (process.env.SCRAPING_API_KEY) {
      html = await getHTMLWithAPI(normalizedUrl);
    }
    
    if (!html) {
      // Fallback to direct request
      try {
        const response = await axios.get(normalizedUrl, {
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
          maxRedirects: 5,
          validateStatus: (status) => status < 500, // Don't throw on 4xx errors
        });
        html = response.data;
      } catch (error) {
        // Network errors or timeouts are not password protection
        // Only check for specific password page indicators
        if (error.response?.status === 401 || error.response?.status === 403) {
          // 401/403 could be many things, check the response body
          const errorHtml = error.response?.data || '';
          if (typeof errorHtml === 'string') {
            const errorHtmlLower = errorHtml.toLowerCase();
            // Only return true if it's clearly a password page
            if (errorHtmlLower.includes('enter store password') || 
                errorHtmlLower.includes('this store is password protected') ||
                errorHtmlLower.includes('password-protected') ||
                (errorHtmlLower.includes('password') && errorHtmlLower.includes('store') && errorHtmlLower.includes('protected'))) {
              return true;
            }
          }
        }
        return false;
      }
    }

    if (!html || typeof html !== 'string') {
      return false;
    }

    const $ = cheerio.load(html);
    const htmlLower = html.toLowerCase();
    
    // STRICT DETECTION: Look for specific Shopify password page indicators
    // Shopify password pages have very specific characteristics
    
    // 1. Check for password form with specific Shopify patterns
    const hasPasswordForm = $('form[action*="password"]').length > 0 || 
                            $('input[type="password"][name*="password"]').length > 0 ||
                            $('input[type="password"][id*="password"]').length > 0;
    
    // 2. Check for specific Shopify password page text (must be very specific to avoid false positives)
    const passwordPageIndicators = [
      'enter store password',
      'this store is password protected',
      'password-protected',
      'store is password protected',
      'password page',
      'protected by password',
    ];
    
    // 3. Check for absence of normal store content (password pages are minimal)
    const hasStoreContent = htmlLower.includes('product') || 
                           htmlLower.includes('collection') ||
                           htmlLower.includes('add to cart') ||
                           htmlLower.includes('shopify') && htmlLower.includes('theme') ||
                           $('nav').length > 0 ||
                           $('[class*="product"]').length > 0 ||
                           $('[class*="collection"]').length > 0;
    
    // 4. Check for specific password page structure
    const hasPasswordPageStructure = (
      htmlLower.includes('password') && 
      (htmlLower.includes('protected') || htmlLower.includes('enter')) &&
      hasPasswordForm &&
      !hasStoreContent // Password pages don't have normal store content
    );
    
    // 5. Check for explicit password page indicators
    let hasExplicitIndicator = false;
    for (const indicator of passwordPageIndicators) {
      if (htmlLower.includes(indicator)) {
        hasExplicitIndicator = true;
        break;
      }
    }
    
    // Only return true if we have strong evidence it's a password page
    // Require either explicit indicator OR password form + protected text + no store content
    return hasExplicitIndicator || (hasPasswordForm && htmlLower.includes('protected') && !hasStoreContent);
    
  } catch (error) {
    // On any error, assume NOT password protected (avoid false positives)
    // Only check response body if we have a 401/403
    if (error.response?.status === 401 || error.response?.status === 403) {
      const errorHtml = error.response?.data || '';
      if (typeof errorHtml === 'string') {
        const errorHtmlLower = errorHtml.toLowerCase();
        // Only return true if it's clearly a password page
        if (errorHtmlLower.includes('enter store password') || 
            errorHtmlLower.includes('this store is password protected') ||
            errorHtmlLower.includes('password-protected')) {
          return true;
        }
      }
    }
    return false;
  }
};

/**
 * Get store name from the page
 */
export const getStoreName = async (url) => {
  try {
    const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
    
    // Try ScrapingAPI first if available
    let html = null;
    if (process.env.SCRAPING_API_KEY) {
      html = await getHTMLWithAPI(normalizedUrl);
    }
    
    if (!html) {
      // Fallback to direct request
      const response = await axios.get(normalizedUrl, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        maxRedirects: 5,
      });
      html = response.data;
    }

    if (!html) {
      return null;
    }

    const $ = cheerio.load(html);
    
    // PRIORITY 1: Extract HTML <title> tag (primary method)
    let name = $('title').text().trim() || '';
    
    // PRIORITY 2: Try meta og:title if title tag is empty
    if (!name) {
      name = $('meta[property="og:title"]').attr('content')?.trim() || '';
    }
    
    // PRIORITY 3: Try hero text (main heading) - check for common hero section patterns
    if (!name) {
      // Check for hero section headings (common patterns)
      const heroSelectors = [
        'h1.hero__title',
        'h1.hero-title',
        '.hero h1',
        '.hero-section h1',
        'main h1',
        '.main-content h1',
        'h1.banner__heading',
        'h1.section-header__title',
      ];
      
      for (const selector of heroSelectors) {
        const heroText = $(selector).first().text().trim();
        if (heroText && heroText.length > 0 && heroText.length < 200) {
          name = heroText;
          break;
        }
      }
      
      // If no hero-specific heading found, try any h1
      if (!name) {
        name = $('h1').first().text().trim() || '';
      }
    }
    
    // PRIORITY 4: Try logo alt text
    if (!name) {
      name = $('.site-header__logo, .logo, [class*="logo"]').attr('alt')?.trim() || '';
    }
    
    // PRIORITY 5: Fallback to clean domain name (e.g., example.com) if no title/metadata found
    if (!name || name.length === 0) {
      try {
        const urlObj = new URL(normalizedUrl);
        // Clean domain: remove www, remove .myshopify.com, keep just the domain
        let domain = urlObj.hostname.replace(/^www\./, '');
        domain = domain.replace(/\.myshopify\.com$/, '');
        name = domain || urlObj.hostname.replace(/^www\./, '');
      } catch (e) {
        // Final fallback - extract domain from URL string
        try {
          const match = normalizedUrl.match(/https?:\/\/(?:www\.)?([^\/]+)/);
          if (match && match[1]) {
            name = match[1].replace(/\.myshopify\.com$/, '');
          } else {
            name = normalizedUrl;
          }
        } catch (err) {
          name = normalizedUrl;
        }
      }
    }
    
    // Clean up the name: remove extra whitespace, limit length
    return name.trim().replace(/\s+/g, ' ').substring(0, 100);
  } catch (error) {
    console.error(`Error getting store name: ${url}`, error.message);
    return null;
  }
};

/**
 * Get product count from Shopify store
 */
export const getProductCount = async (url) => {
  try {
    const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
    
    // Try to access the products JSON endpoint
    const productsUrl = `${normalizedUrl}/products.json?limit=250`;
    
    try {
      // Try ScrapingAPI first for products.json
      let productsData = null;
      if (process.env.SCRAPING_API_KEY) {
        const apiResponse = await scrapeWithAPI(productsUrl);
        if (apiResponse && typeof apiResponse === 'object' && apiResponse.products) {
          return apiResponse.products.length;
        }
      }
      
      // Fallback to direct request
      const response = await axios.get(productsUrl, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      if (response.data && response.data.products) {
        return response.data.products.length;
      }
    } catch (e) {
      // Fallback: try to count from HTML
      let html = null;
      if (process.env.SCRAPING_API_KEY) {
        html = await getHTMLWithAPI(normalizedUrl);
      }
      
      if (!html) {
        const response = await axios.get(normalizedUrl, {
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        });
        html = response.data;
      }

      if (!html) {
        return 0;
      }

      const $ = cheerio.load(html);
      
      // Look for product count indicators
      const productCountText = $('body').text();
      const matches = productCountText.match(/(\d+)\s*(products?|items?)/i);
      
      if (matches) {
        return parseInt(matches[1]);
      }

      // Count product links
      const productLinks = $('a[href*="/products/"]').length;
      return productLinks > 0 ? productLinks : 0;
    }
    
    return 0;
  } catch (error) {
    console.error(`Error getting product count: ${url}`, error.message);
    return 0;
  }
};

/**
 * Check if store is active (returns 200 status)
 * Also checks for Shopify "store unavailable" message and metadata
 */
export const isStoreActive = async (url) => {
  try {
    const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
    
    // Try ScrapingAPI first if available
    let html = null;
    if (process.env.SCRAPING_API_KEY) {
      html = await getHTMLWithAPI(normalizedUrl);
    }
    
    if (!html) {
      // Fallback to direct request
      const response = await axios.get(normalizedUrl, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        validateStatus: (status) => status < 500, // Accept 4xx as "active" (not server error)
        maxRedirects: 5,
      });
      
      html = response.data;
      if (response.status >= 500) {
        return false; // Server error, not active
      }
    }

    if (!html || typeof html !== 'string') {
      return true; // If we can't get HTML, assume active (let other checks handle it)
    }

    // Parse HTML to check for inactive store indicators
    const $ = cheerio.load(html);
    const htmlLower = html.toLowerCase();
    
    // CHECK 1: Check for the specific inactive store title
    // "Create an Ecommerce Website and Sell Online! Ecommerce Software by Shopify"
    const title = $('title').text().trim();
    const titleLower = title.toLowerCase();
    if (titleLower.includes('create an ecommerce website') && 
        titleLower.includes('ecommerce software by shopify')) {
      return false; // This is the inactive store page
    }
    
    // CHECK 2: Check for "This store does not exist" message
    // This is a specific inactive store indicator
    if (htmlLower.includes('this store does not exist')) {
      return false; // Store does not exist
    }
    
    // CHECK 2b: Check for "Sorry, this store is currently unavailable" text
    // This text appears on inactive Shopify stores
    if (htmlLower.includes('sorry, this store is currently unavailable') ||
        htmlLower.includes('sorry this store is currently unavailable')) {
      return false; // Store is unavailable
    }
    
    // CHECK 3: Check for body id="subpage" (indicator of inactive store page)
    const bodyId = $('body').attr('id');
    if (bodyId === 'subpage') {
      // Additional check: if body has id="subpage" AND contains unavailable text, it's inactive
      if (htmlLower.includes('unavailable') || 
          htmlLower.includes('store is currently')) {
        return false;
      }
    }
    
    // CHECK 4: Check for meta description that indicates inactive store
    // Inactive stores have meta description about Shopify e-commerce platform
    const metaDescription = $('meta[name="description"]').attr('content') || '';
    const metaDescLower = metaDescription.toLowerCase();
    if (metaDescLower.includes('ecommerce software by shopify') &&
        metaDescLower.includes('create an ecommerce website')) {
      // This is likely the inactive store page
      return false;
    }
    
    // CHECK 5: Check for specific inactive store UI elements
    // Look for buttons like "Explore other stores" and "Start a free trial" together
    const hasExploreButton = htmlLower.includes('explore other stores') ||
                            htmlLower.includes('explore other');
    const hasTrialButton = htmlLower.includes('start a free trial') ||
                          htmlLower.includes('start a 3-day free trial') ||
                          htmlLower.includes('start free trial');
    
    // Check for "Open a new Shopify store" text (indicator of inactive store page)
    const hasNewStoreText = htmlLower.includes('open a new shopify store') ||
                           htmlLower.includes('check out shopify editions');
    
    // If "This store does not exist" is present, it's definitely inactive
    if (htmlLower.includes('this store does not exist')) {
      return false;
    }
    
    // If both buttons are present along with unavailable text, it's inactive
    if (hasExploreButton && hasTrialButton && 
        (htmlLower.includes('unavailable') || htmlLower.includes('store is currently') || hasNewStoreText)) {
      return false;
    }
    
    // If "Explore other stores" + "Open a new Shopify store" together, it's inactive
    if (hasExploreButton && hasNewStoreText) {
      return false;
    }

    return true; // Store is active
  } catch (error) {
    return false;
  }
};
