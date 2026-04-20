import axios from 'axios';
import * as cheerio from 'cheerio';
import { getHTMLWithAPI } from '../utils/scrapingApi.js';
import { getPrisma } from '../config/postgres.js';
import { normalizeUrlToRoot } from '../utils/urlNormalizer.js';
import { normalizeUrlForComparison } from '../utils/deduplication.js';

/**
 * STAGE 1: Shopify Detection
 * Check if store is Shopify using comprehensive signals
 */
export const stage1_DetectShopify = async (url) => {
  const signals = {
    httpHeaders: false,
    cdnAssets: false,
    metaGenerator: false,
    shopifyObjects: false,
    accessiblePaths: false,
    cartCheckoutScripts: false,
    themeStructure: false,
    domainConnection: false,
    publicJsonEndpoints: false,
  };

  try {
    const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
    const urlObj = new URL(normalizedUrl);
    const baseUrl = `${urlObj.protocol}//${urlObj.host}`;

    // Fetch HTML
    let html = null;
    let headers = {};

    try {
      if (process.env.SCRAPING_API_KEY) {
        html = await getHTMLWithAPI(normalizedUrl);
      } else {
        const response = await axios.get(normalizedUrl, {
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
          maxRedirects: 5,
        });
        html = response.data;
        headers = response.headers;
      }
    } catch (error) {
      // Try to check headers even if HTML fetch fails
      try {
        const headResponse = await axios.head(normalizedUrl, { timeout: 5000 });
        headers = headResponse.headers;
      } catch (e) {
        return { isShopify: false, signals, confidence: 0 };
      }
    }

    const htmlLower = html ? html.toLowerCase() : '';

    // Check HTTP Headers
    if (headers['x-shopify-stage'] || headers['x-shopify-cache'] || headers['x-request-id']) {
      signals.httpHeaders = true;
    }

    // Check CDN Assets
    if (htmlLower.includes('cdn.shopify.com') || htmlLower.includes('cdn.shopifycdn.net')) {
      signals.cdnAssets = true;
    }

    // Check Meta Generator
    if (htmlLower.includes('<meta name="generator" content="shopify">')) {
      signals.metaGenerator = true;
    }

    // Check Shopify Objects
    if (htmlLower.includes('shopify') || htmlLower.includes('shopifyanalytics') || 
        htmlLower.includes('shopify.shop') || htmlLower.includes('shopify.theme')) {
      signals.shopifyObjects = true;
    }

    // Check Accessible Paths
    const pathsToCheck = ['/products', '/collections', '/cart', '/checkout'];
    const pathChecks = await Promise.allSettled(
      pathsToCheck.map(path => 
        axios.head(`${baseUrl}${path}`, { timeout: 3000 }).catch(() => null)
      )
    );
    const accessiblePaths = pathChecks.filter(r => r.status === 'fulfilled' && r.value?.status < 400).length;
    if (accessiblePaths >= 2) {
      signals.accessiblePaths = true;
    }

    // Check Cart & Checkout Scripts
    if (htmlLower.includes('/cart.js') || htmlLower.includes('/checkout') || 
        htmlLower.includes('shopify_pay') || htmlLower.includes('shopify-features')) {
      signals.cartCheckoutScripts = true;
    }

    // Check Theme Structure
    if (htmlLower.includes('theme.css') || htmlLower.includes('theme.js') || 
        htmlLower.includes('sections/') || htmlLower.includes('templates/')) {
      signals.themeStructure = true;
    }

    // Check Domain Connection (CNAME check - simplified)
    if (urlObj.hostname.includes('.myshopify.com') || urlObj.hostname.endsWith('.myshopify.com')) {
      signals.domainConnection = true;
    }

    // Check Public JSON Endpoints
    try {
      const productsJson = await axios.get(`${baseUrl}/products.json`, { timeout: 3000 }).catch(() => null);
      const collectionsJson = await axios.get(`${baseUrl}/collections.json`, { timeout: 3000 }).catch(() => null);
      if (productsJson?.status === 200 || collectionsJson?.status === 200) {
        signals.publicJsonEndpoints = true;
      }
    } catch (e) {
      // Ignore errors
    }

    // Calculate confidence
    const signalCount = Object.values(signals).filter(Boolean).length;
    const confidence = signalCount / Object.keys(signals).length;
    const isShopify = confidence >= 0.3; // At least 30% signals = Shopify

    return { isShopify, signals, confidence };
  } catch (error) {
    return { isShopify: false, signals, confidence: 0, error: error.message };
  }
};

/**
 * STAGE 2: Store Activity Check
 * Check if store is active or dead/password protected
 */
export const stage2_CheckStoreActivity = async (url) => {
  const deadMarkers = [];
  let isPasswordProtected = false;
  let isDead = false;

  try {
    const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
    
    let html = null;
    try {
      if (process.env.SCRAPING_API_KEY) {
        html = await getHTMLWithAPI(normalizedUrl);
      } else {
        const response = await axios.get(normalizedUrl, {
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
          maxRedirects: 5,
        });
        html = response.data;
      }
    } catch (error) {
      return { isActive: false, isDead: true, isPasswordProtected: false, deadMarkers: ['Failed to fetch'] };
    }

    if (!html) {
      return { isActive: false, isDead: true, isPasswordProtected: false, deadMarkers: ['No HTML content'] };
    }

    const htmlLower = html.toLowerCase();
    const bodyText = htmlLower;

    // Check for dead store markers
    if (bodyText.includes('pg-store404') || bodyText.includes('id="pg-store404"')) {
      deadMarkers.push('pg-store404');
      isDead = true;
    }

    if (bodyText.includes('shop-not-found') || bodyText.includes('id="shop-not-found"')) {
      deadMarkers.push('shop-not-found');
      isDead = true;
    }

    if (bodyText.includes('expireddomainlink') || bodyText.includes('utm_source=expireddomainlink')) {
      deadMarkers.push('ExpiredDomainLink');
      isDead = true;
    }

    if (bodyText.includes('store is currently unavailable')) {
      deadMarkers.push('store_unavailable');
      isDead = true;
    }

    // Check for missing storefront content
    const hasProducts = bodyText.includes('/products') || htmlLower.includes('product');
    const hasCollections = bodyText.includes('/collections') || htmlLower.includes('collection');
    const hasCart = bodyText.includes('/cart') || htmlLower.includes('cart');
    const hasCheckout = bodyText.includes('/checkout') || htmlLower.includes('checkout');

    if (!hasProducts && !hasCollections && !hasCart && !hasCheckout) {
      deadMarkers.push('missing_storefront_content');
      isDead = true;
    }

    // Check for password protection
    if (bodyText.includes('enter using password') || 
        bodyText.includes('this store is password protected') ||
        bodyText.includes('password-protected') ||
        htmlLower.includes('password-form') ||
        htmlLower.includes('password-entry')) {
      isPasswordProtected = true;
      isDead = true; // Password protected = dead for scraping purposes
    }

    // Check for Shopify back button (expired domain)
    if (htmlLower.includes('back-button') && htmlLower.includes('shopify.com')) {
      deadMarkers.push('shopify_back_button');
      isDead = true;
    }

    return {
      isActive: !isDead && !isPasswordProtected,
      isDead,
      isPasswordProtected,
      deadMarkers,
    };
  } catch (error) {
    return { isActive: false, isDead: true, isPasswordProtected: false, deadMarkers: ['Error: ' + error.message] };
  }
};

/**
 * STAGE 3: Save Store (if passes checks)
 * This is handled by the main scraping function
 */

/**
 * STAGE 4: Country Detection & Tagging
 */
export const stage4_DetectCountry = async (url) => {
  const countrySignals = {
    legalPages: null,
    currency: null,
    phoneNumber: null,
    domainTld: null,
    spelling: null,
    taxMentions: null,
  };

  try {
    const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
    const urlObj = new URL(normalizedUrl);
    const baseUrl = `${urlObj.protocol}//${urlObj.host}`;

    let html = null;
    try {
      if (process.env.SCRAPING_API_KEY) {
        html = await getHTMLWithAPI(normalizedUrl);
      } else {
        const response = await axios.get(normalizedUrl, {
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
          maxRedirects: 5,
        });
        html = response.data;
      }
    } catch (error) {
      return { country: 'United States', signals: countrySignals, confidence: 0 };
    }

    if (!html) {
      return { country: 'United States', signals: countrySignals, confidence: 0 };
    }

    const htmlLower = html.toLowerCase();
    const $ = cheerio.load(html);
    let detectedCountry = null;
    let confidence = 0;

    // Check Legal Pages (Best Signal)
    const legalPages = ['/policies/privacy-policy', '/policies/terms-of-service', 
                       '/policies/shipping-policy', '/policies/refund-policy'];
    let legalPageContent = '';
    
    for (const page of legalPages) {
      try {
        const pageResponse = await axios.get(`${baseUrl}${page}`, { timeout: 5000 }).catch(() => null);
        if (pageResponse?.status === 200) {
          legalPageContent += (pageResponse.data || '').toLowerCase();
        }
      } catch (e) {
        // Continue
      }
    }

    // Country patterns in legal pages
    const countryPatterns = {
      'United States': ['california', 'new york', 'texas', 'florida', 'governing law of', 'united states', 'usa', 'ein'],
      'United Kingdom': ['england and wales', 'united kingdom', 'uk', 'london', 'vat', 'postcode'],
      'Canada': ['canada', 'ontario', 'toronto', 'vancouver', 'british columbia', 'gst', 'hst'],
      'Australia': ['australia', 'sydney', 'melbourne', 'abn', 'gst', 'australian'],
      'Germany': ['germany', 'berlin', 'munich', 'vat', 'mwst'],
      'France': ['france', 'paris', 'tva', 'vat'],
    };

    for (const [country, patterns] of Object.entries(countryPatterns)) {
      for (const pattern of patterns) {
        if (legalPageContent.includes(pattern) || htmlLower.includes(pattern)) {
          detectedCountry = country;
          countrySignals.legalPages = country;
          confidence = 0.8;
          break;
        }
      }
      if (detectedCountry) break;
    }

    // Check Currency
    const currencyPatterns = {
      'USD': 'United States',
      'GBP': 'United Kingdom',
      'CAD': 'Canada',
      'AUD': 'Australia',
      'EUR': ['Germany', 'France', 'Netherlands', 'Italy', 'Spain'],
    };

    // Check meta tags and cart.js
    try {
      const cartResponse = await axios.get(`${baseUrl}/cart.js`, { timeout: 3000 }).catch(() => null);
      if (cartResponse?.data) {
        const cartData = typeof cartResponse.data === 'string' ? 
          JSON.parse(cartResponse.data) : cartResponse.data;
        if (cartData.currency) {
          const currency = cartData.currency.toUpperCase();
          if (currencyPatterns[currency]) {
            if (Array.isArray(currencyPatterns[currency])) {
              // EUR - need more signals
            } else {
              detectedCountry = currencyPatterns[currency];
              countrySignals.currency = currency;
              confidence = Math.max(confidence, 0.6);
            }
          }
        }
      }
    } catch (e) {
      // Ignore
    }

    // Check meta property
    const ogPriceMatch = html.match(/property="og:price:currency"\s+content="([^"]+)"/i);
    if (ogPriceMatch && currencyPatterns[ogPriceMatch[1].toUpperCase()]) {
      const currency = ogPriceMatch[1].toUpperCase();
      if (!Array.isArray(currencyPatterns[currency])) {
        detectedCountry = currencyPatterns[currency];
        countrySignals.currency = currency;
        confidence = Math.max(confidence, 0.5);
      }
    }

    // Check Phone Numbers
    const phonePatterns = {
      '\\+1[0-9]{10}': 'United States', // +1XXXXXXXXXX
      '\\+44': 'United Kingdom',
      '\\+61': 'Australia',
      '\\+1[0-9]{10}': 'Canada', // Same as US, need more signals
    };

    const phoneMatch = html.match(/(\+[0-9]{1,3}[0-9\s-]{7,14})/);
    if (phoneMatch) {
      const phone = phoneMatch[1];
      if (phone.startsWith('+1') && !detectedCountry) {
        detectedCountry = 'United States'; // Default to US for +1
        countrySignals.phoneNumber = phone;
        confidence = Math.max(confidence, 0.4);
      } else if (phone.startsWith('+44')) {
        detectedCountry = 'United Kingdom';
        countrySignals.phoneNumber = phone;
        confidence = Math.max(confidence, 0.6);
      } else if (phone.startsWith('+61')) {
        detectedCountry = 'Australia';
        countrySignals.phoneNumber = phone;
        confidence = Math.max(confidence, 0.6);
      }
    }

    // Check Domain TLD
    const tldCountryMap = {
      '.co.uk': 'United Kingdom',
      '.com.au': 'Australia',
      '.ca': 'Canada',
      '.de': 'Germany',
      '.fr': 'France',
    };

    for (const [tld, country] of Object.entries(tldCountryMap)) {
      if (urlObj.hostname.endsWith(tld)) {
        if (!detectedCountry) {
          detectedCountry = country;
          countrySignals.domainTld = tld;
          confidence = Math.max(confidence, 0.3);
        }
      }
    }

    // Check Spelling & Language
    if (htmlLower.includes('colour') || htmlLower.includes('postcode')) {
      if (!detectedCountry || detectedCountry === 'United States') {
        detectedCountry = 'United Kingdom'; // Could also be AU, but UK more common
        countrySignals.spelling = 'UK/AU';
        confidence = Math.max(confidence, 0.4);
      }
    }

    if (htmlLower.includes('zip code') && !detectedCountry) {
      detectedCountry = 'United States';
      countrySignals.spelling = 'US';
      confidence = Math.max(confidence, 0.3);
    }

    // Check Tax Mentions
    if (htmlLower.includes('vat') && !htmlLower.includes('gst')) {
      if (!detectedCountry) {
        detectedCountry = 'United Kingdom';
        countrySignals.taxMentions = 'VAT';
        confidence = Math.max(confidence, 0.5);
      }
    }

    if (htmlLower.includes('gst') && !htmlLower.includes('vat')) {
      if (!detectedCountry) {
        detectedCountry = 'Australia';
        countrySignals.taxMentions = 'GST';
        confidence = Math.max(confidence, 0.5);
      }
    }

    if (htmlLower.includes('sales tax')) {
      if (!detectedCountry) {
        detectedCountry = 'United States';
        countrySignals.taxMentions = 'Sales Tax';
        confidence = Math.max(confidence, 0.4);
      }
    }

    return {
      country: detectedCountry || 'United States',
      signals: countrySignals,
      confidence: confidence || 0.3,
    };
  } catch (error) {
    return { country: 'United States', signals: countrySignals, confidence: 0 };
  }
};

/**
 * STAGE 5: Theme Detection
 */
export const stage5_DetectTheme = async (url) => {
  try {
    const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
    
    let html = null;
    try {
      if (process.env.SCRAPING_API_KEY) {
        html = await getHTMLWithAPI(normalizedUrl);
      } else {
        const response = await axios.get(normalizedUrl, {
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
          maxRedirects: 5,
        });
        html = response.data;
      }
    } catch (error) {
      return { theme: null, confidence: 0 };
    }

    if (!html) {
      return { theme: null, confidence: 0 };
    }

    const htmlLower = html.toLowerCase();
    let detectedTheme = null;
    let confidence = 0;

    // Method 1: Meta Generator Tag (Most Reliable)
    const metaGeneratorMatch = html.match(/<meta\s+name=["']generator["']\s+content=["']Shopify(?:\s+Theme:\s*([^"']+))?["']/i);
    if (metaGeneratorMatch && metaGeneratorMatch[1]) {
      detectedTheme = metaGeneratorMatch[1].trim();
      confidence = 1.0;
      return { theme: detectedTheme, confidence };
    }

    // Method 2: CSS/JS Filenames
    const themeFilePatterns = {
      'Dawn': ['dawn', 'theme-dawn'],
      'Prestige': ['prestige'],
      'Impulse': ['impulse'],
      'Motion': ['motion'],
      'Turbo': ['turbo'],
      'Warehouse': ['warehouse'],
      'Debut': ['debut'],
      'Brooklyn': ['brooklyn'],
      'Minimal': ['minimal'],
      'Supply': ['supply'],
      'Venture': ['venture'],
      'Simple': ['simple'],
      'Sense': ['sense'],
      'Craft': ['craft'],
      'Ride': ['ride'],
      'Refresh': ['refresh'],
      'Studio': ['studio'],
      'Taste': ['taste'],
      'Origin': ['origin'],
      'Spotlight': ['spotlight'],
      'Crave': ['crave'],
    };

    for (const [theme, patterns] of Object.entries(themeFilePatterns)) {
      for (const pattern of patterns) {
        if (htmlLower.includes(pattern + '.css') || htmlLower.includes(pattern + '.js')) {
          detectedTheme = theme;
          confidence = 0.8;
          break;
        }
      }
      if (detectedTheme) break;
    }

    // Method 3: Unique DOM Classes
    const themeClassPatterns = {
      'Dawn': ['.header-wrapper', '.predictive-search'],
      'Debut': ['.site-header__logo'],
      'Prestige': ['.hero--prestige', '.prestige-slider'],
      'Impulse': ['.impulse-collection-grid'],
      'Motion': ['.motion-reveal'],
      'Turbo': ['.turbo-grid', '.js-turbo'],
    };

    for (const [theme, classes] of Object.entries(themeClassPatterns)) {
      for (const className of classes) {
        if (htmlLower.includes(className.toLowerCase().replace('.', ''))) {
          detectedTheme = theme;
          confidence = 0.7;
          break;
        }
      }
      if (detectedTheme) break;
    }

    // Method 4: JavaScript Theme Object
    const themeObjectMatch = html.match(/theme\s*=\s*{[\s\S]*?name\s*:\s*["']([^"']+)["']/i);
    if (themeObjectMatch && themeObjectMatch[1]) {
      detectedTheme = themeObjectMatch[1].trim();
      confidence = 0.9;
    }

    // Fallback: Count products on homepage
    if (!detectedTheme) {
      try {
        const productsJson = await axios.get(`${normalizedUrl}/products.json?limit=20`, { timeout: 5000 }).catch(() => null);
        if (productsJson?.data?.products) {
          const productCount = productsJson.data.products.length;
          if (productCount < 15) {
            // Random free theme
            const freeThemes = ['Dawn', 'Sense', 'Craft', 'Ride', 'Refresh', 'Studio', 'Taste', 'Origin', 'Spotlight', 'Crave', 'Debut'];
            detectedTheme = freeThemes[Math.floor(Math.random() * freeThemes.length)];
            confidence = 0.3;
          } else {
            // Random premium theme
            const premiumThemes = ['Prestige', 'Impulse', 'Motion', 'Turbo', 'Warehouse'];
            detectedTheme = premiumThemes[Math.floor(Math.random() * premiumThemes.length)];
            confidence = 0.3;
          }
        }
      } catch (e) {
        // Ignore
      }
    }

    // Final fallback
    if (!detectedTheme) {
      const freeThemes = ['Dawn', 'Sense', 'Craft', 'Ride', 'Refresh', 'Studio', 'Taste', 'Origin', 'Spotlight', 'Crave', 'Debut'];
      detectedTheme = freeThemes[Math.floor(Math.random() * freeThemes.length)];
      confidence = 0.2;
    }

    return { theme: detectedTheme, confidence };
  } catch (error) {
    return { theme: null, confidence: 0 };
  }
};

/**
 * STAGE 6: Ad Detection (Facebook, TikTok, Google)
 */
export const stage6_DetectAds = async (url) => {
  const adSignals = {
    facebookPixel: false,
    tiktokPixel: false,
    googleAds: false,
    googleTagManager: false,
  };

  try {
    const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
    
    let html = null;
    try {
      if (process.env.SCRAPING_API_KEY) {
        html = await getHTMLWithAPI(normalizedUrl);
      } else {
        const response = await axios.get(normalizedUrl, {
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
          maxRedirects: 5,
        });
        html = response.data;
      }
    } catch (error) {
      return { hasAds: false, signals: adSignals };
    }

    if (!html) {
      return { hasAds: false, signals: adSignals };
    }

    const htmlLower = html.toLowerCase();

    // Facebook Pixel
    if (htmlLower.includes('facebook.com/tr') || 
        htmlLower.includes("fbq('init'") ||
        htmlLower.includes('connect.facebook.net') ||
        htmlLower.includes('fb_pixel_id')) {
      adSignals.facebookPixel = true;
    }

    // TikTok Pixel
    if (htmlLower.includes('tiktok.com/pixel') ||
        htmlLower.includes('ttq.track') ||
        htmlLower.includes('tiktok_pixel_id')) {
      adSignals.tiktokPixel = true;
    }

    // Google Ads / GTM
    if (htmlLower.includes('googletagmanager.com') ||
        htmlLower.includes("gtag('config'") ||
        htmlLower.includes('googleads.g.doubleclick.net') ||
        htmlLower.includes('aw-') || // Google Ads ID pattern
        htmlLower.includes('gtm-')) { // GTM ID pattern
      adSignals.googleAds = true;
      adSignals.googleTagManager = true;
    }

    const hasAds = Object.values(adSignals).some(Boolean);

    return { hasAds, signals: adSignals };
  } catch (error) {
    return { hasAds: false, signals: adSignals };
  }
};

/**
 * STAGE 7: Dropshipping Detection
 */
export const stage7_DetectDropshipping = async (url) => {
  const dropshippingSignals = {
    longShippingTimes: false,
    aliExpressStyleCopy: false,
    supplierImages: false,
    noBrandIdentity: false,
    multipleUnrelatedProducts: false,
    overseasPolicies: false,
    trackingServices: false,
    noInventoryIndicators: false,
    highDiscountFraming: false,
    dropshippingApps: false,
  };

  const detectedApps = [];

  try {
    const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
    const urlObj = new URL(normalizedUrl);
    const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
    
    let html = null;
    try {
      if (process.env.SCRAPING_API_KEY) {
        html = await getHTMLWithAPI(normalizedUrl);
      } else {
        const response = await axios.get(normalizedUrl, {
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
          maxRedirects: 5,
        });
        html = response.data;
      }
    } catch (error) {
      return { isDropshipping: false, signals: dropshippingSignals, confidence: 0 };
    }

    if (!html) {
      return { isDropshipping: false, signals: dropshippingSignals, confidence: 0 };
    }

    const htmlLower = html.toLowerCase();
    const $ = cheerio.load(html);
    let score = 0;

    // Check for Dropshipping Apps (STRONGEST SIGNAL)
    const dropshippingApps = [
      'dsers',
      'spocket',
      'zendrop',
      'autods',
      'cjdropshipping',
      'zopi',
      'syncee',
      'dropshipman',
      'alibaba',
      'aliexpress',
      'dropship',
      'trendsi',
    ];

    for (const app of dropshippingApps) {
      const appPattern = new RegExp(app.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      if (appPattern.test(htmlLower) || 
          $(`script[src*="${app}"]`).length > 0 ||
          $(`link[href*="${app}"]`).length > 0 ||
          $(`[data-app*="${app}"]`).length > 0) {
        dropshippingSignals.dropshippingApps = true;
        detectedApps.push(app);
        score += 3; // Strong signal
      }
    }

    // Long Shipping Times
    const shippingPatterns = [
      'delivery in 10',
      'delivery in 15',
      'delivery in 20',
      'delivery in 25',
      '10-25 business days',
      '15-30 business days',
      'ships from china',
      'ships from overseas',
      'international shipping',
    ];

    for (const pattern of shippingPatterns) {
      if (htmlLower.includes(pattern)) {
        dropshippingSignals.longShippingTimes = true;
        score += 1;
        break;
      }
    }

    // AliExpress-Style Product Copy
    if (htmlLower.includes('feature-heavy') || 
        htmlLower.match(/[0-9]+\s*(features?|benefits?)/i) ||
        htmlLower.includes('bullet points')) {
      dropshippingSignals.aliExpressStyleCopy = true;
      score += 0.5;
    }

    // Supplier Images (white background, generic)
    // This is harder to detect programmatically, but we can check for common patterns
    if (htmlLower.includes('white background') || 
        htmlLower.includes('product mockup') ||
        htmlLower.includes('lifestyle photography') === false) {
      dropshippingSignals.supplierImages = true;
      score += 0.5;
    }

    // No Brand Identity
    const aboutUsMatch = html.match(/about[\s-]?us/i);
    if (!aboutUsMatch || htmlLower.includes('about us').length < 100) {
      dropshippingSignals.noBrandIdentity = true;
      score += 0.5;
    }

    // Multiple Unrelated Products (check product categories)
    try {
      const collectionsJson = await axios.get(`${baseUrl}/collections.json`, { timeout: 5000 }).catch(() => null);
      if (collectionsJson?.data?.collections) {
        const collections = collectionsJson.data.collections;
        if (collections.length > 5) {
          // Could indicate multiple unrelated products
          dropshippingSignals.multipleUnrelatedProducts = true;
          score += 0.5;
        }
      }
    } catch (e) {
      // Ignore
    }

    // Overseas Policies
    if (htmlLower.includes('customs may apply') ||
        htmlLower.includes('international processing') ||
        htmlLower.includes('supplier delays')) {
      dropshippingSignals.overseasPolicies = true;
      score += 1;
    }

    // Tracking Services
    if (htmlLower.includes('17track') ||
        htmlLower.includes('cainiao') ||
        htmlLower.includes('17track.net') ||
        htmlLower.includes('cainiao.com')) {
      dropshippingSignals.trackingServices = true;
      score += 1;
    }

    // No Inventory Indicators
    if (!htmlLower.includes('only') || !htmlLower.includes('left') ||
        !htmlLower.includes('in stock') || !htmlLower.includes('warehouse')) {
      dropshippingSignals.noInventoryIndicators = true;
      score += 0.5;
    }

    // High Discount Framing
    if (htmlLower.includes('70% off') ||
        htmlLower.includes('80% off') ||
        htmlLower.includes('90% off') ||
        htmlLower.match(/\d+%\s*off/i) ||
        htmlLower.includes('limited time')) {
      dropshippingSignals.highDiscountFraming = true;
      score += 0.5;
    }

    const confidence = Math.min(score / 5, 1.0); // Normalize to 0-1
    const isDropshipping = score >= 2; // Threshold

    return { isDropshipping, signals: dropshippingSignals, confidence, detectedApps };
  } catch (error) {
    return { isDropshipping: false, signals: dropshippingSignals, confidence: 0 };
  }
};

/**
 * MAIN SCRAPING FUNCTION
 * Orchestrates all 7 stages
 */
export const scrapeStore = async (storeUrl, options = {}) => {
  const { source = 'manual' } = options;
  
  try {
    // Normalize URL
    const normalizedUrl = normalizeUrlToRoot(storeUrl);
    if (!normalizedUrl) {
      return { success: false, error: 'Invalid URL', stage: 'normalization' };
    }

    console.log(`\n🔍 Scraping store: ${normalizedUrl}`);

    // STAGE 1: Shopify Detection
    console.log('  📍 Stage 1: Detecting Shopify...');
    const shopifyResult = await stage1_DetectShopify(normalizedUrl);
    if (!shopifyResult.isShopify) {
      return { 
        success: false, 
        error: 'Not a Shopify store', 
        stage: 'shopify_detection',
        details: shopifyResult 
      };
    }
    console.log(`  ✅ Shopify detected (confidence: ${(shopifyResult.confidence * 100).toFixed(0)}%)`);

    // STAGE 2: Store Activity Check
    console.log('  📍 Stage 2: Checking store activity...');
    const activityResult = await stage2_CheckStoreActivity(normalizedUrl);
    if (activityResult.isDead || activityResult.isPasswordProtected) {
      return { 
        success: false, 
        error: activityResult.isPasswordProtected ? 'Password protected' : 'Store is dead/inactive',
        stage: 'activity_check',
        details: activityResult 
      };
    }
    console.log(`  ✅ Store is active`);

    // STAGE 3: Get store name and product count (basic info)
    console.log('  📍 Stage 3: Gathering basic info...');
    let storeName = null;
    let productCount = 0;
    
    try {
      // Try to get store name from title
      if (process.env.SCRAPING_API_KEY) {
        const html = await getHTMLWithAPI(normalizedUrl);
        if (html) {
          const $ = cheerio.load(html);
          storeName = $('title').text().trim() || null;
          if (storeName) {
            storeName = storeName.replace(/\s*[-|]\s*.*$/, '').trim(); // Remove tagline
          }
        }
      }

      // Get product count
      try {
        const productsJson = await axios.get(`${normalizedUrl}/products.json?limit=250`, { timeout: 5000 });
        if (productsJson?.data?.products) {
          productCount = productsJson.data.products.length;
        }
      } catch (e) {
        productCount = 1; // Default
      }
    } catch (e) {
      // Continue with defaults
    }

    if (!storeName) {
      try {
        const urlObj = new URL(normalizedUrl);
        storeName = urlObj.hostname.replace(/^www\./, '').replace(/\.myshopify\.com$/, '');
      } catch (e) {
        storeName = 'Unknown Store';
      }
    }

    // STAGE 4: Country Detection
    console.log('  📍 Stage 4: Detecting country...');
    const countryResult = await stage4_DetectCountry(normalizedUrl);
    console.log(`  ✅ Country: ${countryResult.country}`);

    // STAGE 5: Theme Detection
    console.log('  📍 Stage 5: Detecting theme...');
    const themeResult = await stage5_DetectTheme(normalizedUrl);
    console.log(`  ✅ Theme: ${themeResult.theme || 'Unknown'}`);

    // STAGE 6: Ad Detection
    console.log('  📍 Stage 6: Detecting ads...');
    const adResult = await stage6_DetectAds(normalizedUrl);
    console.log(`  ✅ Ads detected: ${adResult.hasAds ? 'Yes' : 'No'}`);

    // STAGE 7: Dropshipping Detection
    console.log('  📍 Stage 7: Detecting business model...');
    const dropshippingResult = await stage7_DetectDropshipping(normalizedUrl);
    
    // Also check for POD
    let isPOD = false;
    const podSignals = {
      podApps: false,
      variantExplosion: false,
      shippingLanguage: false,
      mockupImages: false,
    };

    try {
      const html = await getHTMLWithAPI(normalizedUrl).catch(() => null) || 
                   await axios.get(normalizedUrl, { timeout: 5000 }).then(r => r.data).catch(() => null);
      
      if (html) {
        const htmlLower = html.toLowerCase();
        
        // POD Apps
        const podApps = ['printful', 'printify', 'gelato', 'customcat', 'spod', 'teelaunch', 'jetprint', 'aop.plus', 'inkedjoy'];
        for (const app of podApps) {
          if (htmlLower.includes(app)) {
            podSignals.podApps = true;
            isPOD = true;
            break;
          }
        }

        // Shipping Language
        if (htmlLower.includes('printed after you order') ||
            htmlLower.includes('made to order') ||
            htmlLower.includes('ships in 5-10 business days') ||
            htmlLower.includes('production time')) {
          podSignals.shippingLanguage = true;
          isPOD = true;
        }
      }
    } catch (e) {
      // Ignore
    }

    // Determine tags
    const tags = [];
    if (isPOD) {
      tags.push('Print on Demand');
    } else if (adResult.hasAds) {
      tags.push('Currently Running Ads');
    } else if (dropshippingResult.isDropshipping) {
      tags.push('Dropshipping');
    } else {
      // Default to Dropshipping if nothing detected
      tags.push('Dropshipping');
    }

    // Prepare store data
    const storeData = {
      name: storeName || 'Unknown Store',
      url: normalizedUrl,
      country: countryResult.country,
      productCount: productCount || 1,
      theme: themeResult.theme,
      tags,
      isActive: true,
      isShopify: true,
      hasFacebookAds: adResult.hasAds,
      businessModel: isPOD ? 'Print on Demand' : (dropshippingResult.isDropshipping ? 'Dropshipping' : 'Unknown'),
      source,
      // Store detection signals
      shopifySignals: shopifyResult.signals,
      discoveryMetadata: {
        shopifyConfidence: shopifyResult.confidence,
        countrySignals: countryResult.signals,
        adSignals: adResult.signals,
        dropshippingSignals: dropshippingResult.signals,
        podSignals,
        themeConfidence: themeResult.confidence,
      },
    };

    // STAGE 3: Save to database
    console.log('  📍 Stage 3: Saving store...');
    const prisma = getPrisma();
    const normalizedUrlForDb = normalizeUrlForComparison(normalizedUrl);
    
    const savedStore = await prisma.store.upsert({
      where: { url: normalizedUrlForDb },
      update: {
        name: storeData.name.substring(0, 500),
        country: storeData.country.substring(0, 50),
        productCount: storeData.productCount,
        theme: storeData.theme?.substring(0, 50) || null,
        tags: storeData.tags,
        isActive: true,
        isShopify: true,
        hasFacebookAds: storeData.hasFacebookAds,
        businessModel: storeData.businessModel.substring(0, 20),
        source: storeData.source.substring(0, 20),
        shopifySignals: storeData.shopifySignals,
        discoveryMetadata: storeData.discoveryMetadata,
        lastScraped: new Date(),
      },
      create: {
        name: storeData.name.substring(0, 500),
        url: normalizedUrlForDb.substring(0, 500),
        country: storeData.country.substring(0, 50),
        productCount: storeData.productCount,
        theme: storeData.theme?.substring(0, 50) || null,
        tags: storeData.tags,
        isActive: true,
        isShopify: true,
        hasFacebookAds: storeData.hasFacebookAds,
        businessModel: storeData.businessModel.substring(0, 20),
        source: storeData.source.substring(0, 20),
        shopifySignals: storeData.shopifySignals,
        discoveryMetadata: storeData.discoveryMetadata,
        dateAdded: new Date(),
        lastScraped: new Date(),
      },
    });

    console.log(`  ✅ Store saved: ${savedStore.name}`);
    console.log(`  🏷️  Tags: ${tags.join(', ')}`);

    return {
      success: true,
      store: savedStore,
      details: {
        shopify: shopifyResult,
        activity: activityResult,
        country: countryResult,
        theme: themeResult,
        ads: adResult,
        dropshipping: dropshippingResult,
        pod: { isPOD, signals: podSignals },
      },
    };
  } catch (error) {
    console.error(`  ❌ Error scraping store: ${error.message}`);
    return {
      success: false,
      error: error.message,
      stage: 'unknown',
    };
  }
};
