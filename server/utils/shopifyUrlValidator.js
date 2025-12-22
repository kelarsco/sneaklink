/**
 * Quick validation to check if URL looks like a potential Shopify store
 * This is a fast pre-filter before doing full validation
 * UPDATED: Now accepts ANY valid URL (not just .myshopify.com) to allow custom domains
 */
export const looksLikeShopifyStore = (url) => {
  if (!url || typeof url !== 'string') {
    return false;
  }

  const urlLower = url.toLowerCase().trim();
  
  // Must be a valid URL
  if (!urlLower.startsWith('http://') && !urlLower.startsWith('https://')) {
    return false;
  }

  // Exclude known non-store domains (social media, Shopify admin, etc.)
  const excludedDomains = [
    'reddit.com',
    'imgur.com',
    'youtube.com',
    'facebook.com',
    'instagram.com',
    'twitter.com',
    'x.com',
    'tiktok.com',
    'pinterest.com',
    'linkedin.com',
    'apps.shopify.com',
    'help.shopify.com',
    'community.shopify.com',
    'partners.shopify.com',
    'developers.shopify.com',
    'checkout.shopify.com',
    'admin.shopify.com',
    'shop.shopify.com',
    'www.shopify.com',
  ];

  for (const domain of excludedDomains) {
    if (urlLower.includes(domain)) {
      return false;
    }
  }

  // ACCEPT ANY VALID URL - Let the full detection (isShopifyStore) determine if it's Shopify
  // This allows custom domains to pass through for full validation
  // The full detection will check for:
  // - /cart.js endpoint
  // - X-ShopId header
  // - /products.json endpoint
  // - cdn.shopify.com in assets
  // - Other Shopify fingerprints
  
  try {
    // Basic URL validation
    new URL(url);
    return true; // Accept any valid URL for full validation
  } catch (error) {
    return false; // Invalid URL format
  }
};
