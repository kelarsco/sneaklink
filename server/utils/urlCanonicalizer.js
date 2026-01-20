/**
 * CANONICAL URL NORMALIZATION
 * 
 * Single source of truth for URL normalization.
 * Used for database storage and deduplication.
 * 
 * Rules:
 * - Force https (never http)
 * - Remove www prefix (www.example.com = example.com)
 * - Remove trailing slashes
 * - Remove query params and fragments
 * - Extract root domain only (no subpaths)
 * - Convert to lowercase
 * - Normalize .myshopify.com domains consistently
 */

/**
 * Canonicalize URL for database storage and comparison
 * This is the SINGLE normalization function used throughout the system
 * 
 * @param {string} url - Raw URL input
 * @returns {string|null} - Canonical URL or null if invalid
 */
export const canonicalizeUrl = (url) => {
  if (!url || typeof url !== 'string') {
    return null;
  }
  
  try {
    let cleanUrl = url.trim();
    
    // Add https:// if no protocol
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = `https://${cleanUrl}`;
    }
    
    // Parse URL to extract components
    const urlObj = new URL(cleanUrl);
    
    // Force https (never http)
    let protocol = 'https:';
    
    // Extract hostname
    let hostname = urlObj.hostname.toLowerCase();
    
    // Remove www prefix (www.example.com = example.com)
    // Exception: For .myshopify.com domains, keep the subdomain as-is
    // (store.myshopify.com should stay as-is, not become myshopify.com)
    if (hostname.startsWith('www.') && !hostname.includes('.myshopify.com')) {
      hostname = hostname.replace(/^www\./, '');
    }
    
    // Reconstruct canonical URL (protocol + hostname only, no path/query/fragment)
    const canonicalUrl = `${protocol}//${hostname}`;
    
    return canonicalUrl;
  } catch (error) {
    // If URL parsing fails, try basic cleanup
    try {
      let basicClean = url.trim().toLowerCase();
      
      // Add https:// if no protocol
      if (!basicClean.startsWith('http://') && !basicClean.startsWith('https://')) {
        basicClean = `https://${basicClean}`;
      }
      
      // Extract domain part (everything before first /)
      const match = basicClean.match(/^(https?:\/\/[^\/]+)/);
      if (!match) {
        return null;
      }
      
      let domain = match[1];
      
      // Remove www prefix (except for .myshopify.com)
      if (domain.includes('://www.') && !domain.includes('.myshopify.com')) {
        domain = domain.replace('://www.', '://');
      }
      
      // Force https
      domain = domain.replace(/^http:\/\//, 'https://');
      
      return domain;
    } catch (e) {
      return null;
    }
  }
};

/**
 * Check if two URLs are equivalent (canonical comparison)
 */
export const urlsAreEquivalent = (url1, url2) => {
  const canonical1 = canonicalizeUrl(url1);
  const canonical2 = canonicalizeUrl(url2);
  
  if (!canonical1 || !canonical2) {
    return false;
  }
  
  return canonical1 === canonical2;
};



