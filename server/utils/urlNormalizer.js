/**
 * URL Normalization Utilities
 * Normalizes URLs to root homepage only (removes all subpaths)
 */

/**
 * Normalize URL to root homepage only
 * Removes all subpaths (collections, products, pages, etc.)
 * Examples:
 * - https://store.myshopify.com/products/item → https://store.myshopify.com
 * - https://example.com/collections/sale → https://example.com
 * - https://www.example.com/pages/about → https://www.example.com
 */
export const normalizeUrlToRoot = (url) => {
  if (!url) return null;
  
  try {
    // Remove whitespace
    let cleanUrl = url.trim();
    
    // Add protocol if missing
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = `https://${cleanUrl}`;
    }
    
    // Parse URL to extract root domain
    const urlObj = new URL(cleanUrl);
    
    // Reconstruct root URL (protocol + hostname only)
    const rootUrl = `${urlObj.protocol}//${urlObj.hostname}`;
    
    // Convert to lowercase and remove trailing slash
    return rootUrl.toLowerCase().replace(/\/$/, '');
  } catch (error) {
    // If URL parsing fails, try basic cleanup
    const basicClean = url.trim().toLowerCase();
    // Remove everything after first / (but keep protocol and domain)
    const match = basicClean.match(/^(https?:\/\/[^\/]+)/);
    return match ? match[1] : basicClean.replace(/\/$/, '');
  }
};

/**
 * Check if URL is a .myshopify.com domain (prioritized for new stores)
 */
export const isMyshopifyDomain = (url) => {
  if (!url) return false;
  const urlLower = url.toLowerCase();
  return urlLower.includes('.myshopify.com');
};

/**
 * Sort stores array to prioritize .myshopify.com domains
 * .myshopify.com stores appear first in the array
 */
export const prioritizeMyshopifyStores = (stores) => {
  const myshopifyStores = [];
  const otherStores = [];
  
  for (const store of stores) {
    const url = store.url || '';
    if (isMyshopifyDomain(url)) {
      myshopifyStores.push(store);
    } else {
      otherStores.push(store);
    }
  }
  
  // Return myshopify.com stores first, then others
  return [...myshopifyStores, ...otherStores];
};


