import axios from 'axios';
import * as cheerio from 'cheerio';
import { getHTMLWithAPI } from './scrapingApi.js';

/**
 * Detect business model (Dropshipping, Print on Demand, etc.)
 * Uses comprehensive pattern matching based on multiple signals
 */
export const detectBusinessModel = async (url) => {
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
      return 'Unknown';
    }

    const htmlLower = html.toLowerCase();
    const $ = cheerio.load(html);

    // ============================================
    // 1️⃣ DROPSHIPPING DETECTION (High Accuracy)
    // ============================================
    let dropshippingScore = 0;
    const dropshippingSignals = [];

    // Platform / Backend Signals
    if (htmlLower.includes('cdn.shopify.com') || htmlLower.includes('/myshopify.com') || 
        htmlLower.includes('shopify.theme') || htmlLower.includes('shopify.checkout')) {
      // These are Shopify indicators, not dropshipping-specific, but we note them
    }

    // Shipping & Fulfillment Clues
    const shippingClues = [
      'ships from overseas',
      'delivery: 7–15 business days',
      'delivery: 7-15 business days',
      'processing time',
      'international shipping',
      'tracking number will be provided',
      'ships from china',
      'ships from asia',
      'estimated delivery',
      'shipping from supplier',
    ];
    shippingClues.forEach(clue => {
      if (htmlLower.includes(clue)) {
        dropshippingScore += 1;
        dropshippingSignals.push(`shipping:${clue}`);
      }
    });

    // Apps Commonly Used by Dropshippers
    const dropshippingApps = [
      'oberlo',
      'dsers',
      'spocket',
      'zendrop',
      'cj dropshipping',
      'cjdropshipping',
      'ali reviews',
      'loox',
      'judge.me',
      'ryviu',
      'alireviews',
      'ali-express',
      'aliexpress',
    ];
    dropshippingApps.forEach(app => {
      // Check in script tags, links, and HTML content
      const appPattern = new RegExp(app.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      if (appPattern.test(htmlLower) || 
          $(`script[src*="${app}"]`).length > 0 ||
          $(`a[href*="${app}"]`).length > 0 ||
          $(`[data-app*="${app}"]`).length > 0) {
        dropshippingScore += 2; // Apps are strong signals
        dropshippingSignals.push(`app:${app}`);
      }
    });

    // Product Page Patterns
    const productPatterns = [
      'variants with many colors',
      'many colors/sizes',
      'generic product',
      'no brand story',
    ];
    productPatterns.forEach(pattern => {
      if (htmlLower.includes(pattern)) {
        dropshippingScore += 0.5;
        dropshippingSignals.push(`product:${pattern}`);
      }
    });

    // Policy Page Red Flags
    const policyRedFlags = [
      'supplier delays',
      'we are not responsible for customs',
      'multiple warehouse locations',
      'customs fees',
      'import duties',
      'third-party supplier',
    ];
    policyRedFlags.forEach(flag => {
      if (htmlLower.includes(flag)) {
        dropshippingScore += 1;
        dropshippingSignals.push(`policy:${flag}`);
      }
    });

    // Check for generic product images (many variants)
    const variantCount = $('[data-variant-id]').length || $('.product-variant').length || 0;
    if (variantCount > 10) {
      dropshippingScore += 0.5;
      dropshippingSignals.push('many-variants');
    }

    // ============================================
    // 2️⃣ PRINT-ON-DEMAND (POD) DETECTION
    // ============================================
    let podScore = 0;
    const podSignals = [];

    // POD Apps - Comprehensive list of 50+ platforms (Very Strong Signals)
    const podApps = [
      // Major POD Platforms
      'printful',
      'printify',
      'gooten',
      'teespring',
      'spring', // Teespring rebranded to Spring
      'apliiq',
      'customcat',
      'awkward styles',
      'pods', // Print on Demand by SPOD
      't-pop',
      'art of where',
      'teelaunch',
      'scalable press',
      'humble bee',
      'fourthwall',
      'shineon',
      'tee hubl',
      'inkl',
      'yoycol',
      'noissue',
      'lulu xpress',
      // Design & Asset Platforms
      'canva',
      'placeit',
      'vexels',
      'creative asset manager',
      'design \'n\' buy',
      'vidjet',
      // Product Customization Apps
      'product customizer',
      'zakeke',
      // Marketplace/Platform Apps
      'gumroad',
      'inkybay',
      // Shopify Apps (POD-related)
      'bold bundles',
      'frequently bought together',
      'cross sell & upsell',
      'order bump',
      'product options',
      'volume & tiered discounts',
      'smile: rewards & loyalty',
      'loox',
      'judge.me',
      'privy',
      // Shipping & Fulfillment Apps
      'shipstation',
      'aftership',
      'easyship',
      'parcel panel',
      'pirate ship',
      'order printer pro',
      // Marketing & Email Apps (used by POD stores)
      'klaviyo',
      'segments',
      'omnisend',
      'google & facebook channel',
      // Additional POD platforms
      'printfy.js',
      'printful.js',
      'redbubble',
      'gelato',
      'contrado',
      'print on demand',
      'print-on-demand',
      'made to order',
      'custom printed',
      // Detect POD app embeds and scripts
      'printful-integration',
      'printify-integration',
      'gooten-integration',
    ];
    podApps.forEach(app => {
      const appPattern = new RegExp(app.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      // Check multiple sources: HTML content, script tags, script content, links, data attributes, API calls
      const foundInScripts = $(`script[src*="${app}"]`).length > 0;
      const foundInLinks = $(`a[href*="${app}"]`).length > 0;
      const foundInDataAttrs = $(`[data-app*="${app}"], [data-platform*="${app}"], [class*="${app}"]`).length > 0;
      const foundInHTML = appPattern.test(htmlLower);
      
      // Check script content for POD app references
      let foundInScriptContent = false;
      $('script').each((i, elem) => {
        const scriptContent = $(elem).html()?.toLowerCase() || '';
        if (appPattern.test(scriptContent)) {
          foundInScriptContent = true;
          return false; // Break loop
        }
      });
      
      if (foundInHTML || foundInScripts || foundInLinks || foundInDataAttrs || foundInScriptContent) {
        podScore += 3; // POD apps are very strong signals
        podSignals.push(`app:${app}`);
      }
    });

    // Product Copy Keywords
    const podKeywords = [
      'made to order',
      'printed just for you',
      'production time',
      'custom printed',
      'print on demand',
      'print-on-demand',
      'made when you order',
      'printed on demand',
    ];
    podKeywords.forEach(keyword => {
      if (htmlLower.includes(keyword)) {
        podScore += 1;
        podSignals.push(`keyword:${keyword}`);
      }
    });

    // SKU / Variant Patterns (Size-based SKUs)
    const sizePatterns = /\b(s|m|l|xl|2xl|3xl|4xl|5xl)\b/gi;
    const sizeMatches = htmlLower.match(sizePatterns);
    if (sizeMatches && sizeMatches.length > 5) {
      podScore += 1;
      podSignals.push('size-based-skus');
    }

    // Image Patterns (Mockup-style indicators)
    const imageIndicators = [
      'mockup',
      'flat-lay',
      'blank model',
      'product mockup',
    ];
    imageIndicators.forEach(indicator => {
      if (htmlLower.includes(indicator)) {
        podScore += 0.5;
        podSignals.push(`image:${indicator}`);
      }
    });

    // Fulfillment Notes
    const fulfillmentNotes = [
      'this product is made on demand',
      'made on demand',
      'no refunds on custom items',
      'custom items',
      'personalized items',
    ];
    fulfillmentNotes.forEach(note => {
      if (htmlLower.includes(note)) {
        podScore += 1;
        podSignals.push(`fulfillment:${note}`);
      }
    });

    // ============================================
    // DECISION LOGIC
    // Priority: POD first, then Ads, then Dropshipping
    // ============================================
    
    // PRIORITY 1: POD detection (any POD app = POD store with high confidence)
    if (podScore >= 3) {
      console.log(`   🏷️  POD detected (score: ${podScore.toFixed(1)}, signals: ${podSignals.join(', ')})`);
      return 'Print on Demand';
    }
    
    // POD detection with lower threshold if app signals present (very strong indicator)
    const hasPodApp = podSignals.some(s => s.startsWith('app:'));
    if (hasPodApp && podScore >= 1) {
      console.log(`   🏷️  POD detected via app (score: ${podScore.toFixed(1)}, signals: ${podSignals.join(', ')})`);
      return 'Print on Demand';
    }

    // PRIORITY 2: Check for active ads (this will be done separately via detectFacebookAds)
    // If ads detected, it will be tagged separately, but doesn't override POD classification
    
    // PRIORITY 3: Dropshipping detection (default/catch-all if POD not detected)
    if (dropshippingScore >= 3 && podScore < 1) {
      console.log(`   🏷️  Dropshipping detected (score: ${dropshippingScore.toFixed(1)}, signals: ${dropshippingSignals.join(', ')})`);
      return 'Dropshipping';
    }

    // If dropshipping has moderate signals but POD doesn't
    if (dropshippingScore >= 2 && podScore < 1) {
      console.log(`   🏷️  Dropshipping detected (score: ${dropshippingScore.toFixed(1)}, signals: ${dropshippingSignals.join(', ')})`);
      return 'Dropshipping';
    }

    // DEFAULT: Dropshipping (catch-all category when neither POD nor ads clearly detected)
    // This is a lower confidence classification but serves as the default
    if (podScore === 0 && dropshippingScore === 0) {
      return 'Dropshipping'; // Default to dropshipping as catch-all
    }

    return 'Unknown';
  } catch (error) {
    console.error(`Error detecting business model: ${url}`, error.message);
    return 'Unknown';
  }
};

/**
 * Check if store is running ads (Facebook, TikTok, Google, Snap, Twitter, Pinterest)
 * Uses comprehensive detection from page content (pixels, tracking codes, etc.)
 */
export const detectFacebookAds = async (url) => {
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
      return false;
    }

    const htmlLower = html.toLowerCase();
    const $ = cheerio.load(html);
    let hasAds = false;
    const adSignals = [];

    // ============================================
    // 🔹 Meta (Facebook / Instagram Ads) - Enhanced Detection
    // ============================================
    const facebookPatterns = [
      'connect.facebook.net',
      'fbq(\'init\'',
      'fbq("init"',
      'fbq(\'track\'',
      'fbq("track"',
      'facebook pixel',
      'meta pixel',
      'facebook.com/tr',
      'fbclid=',
      'fbevents.js',
      'facebook pixel id',
      'fb-pixel',
      'facebook-analytics',
      'meta pixel id',
      'pixel_id',
      'facebook.com/events',
    ];
    
    facebookPatterns.forEach(pattern => {
      if (htmlLower.includes(pattern) || 
          $(`script[src*="facebook"]`).length > 0 ||
          $(`script[src*="fbq"]`).length > 0 ||
          $(`script[src*="fbevents"]`).length > 0 ||
          $(`[data-facebook-pixel]`).length > 0 ||
          $(`[data-fb-pixel]`).length > 0) {
        hasAds = true;
        adSignals.push('facebook');
      }
    });

    // Check script content for Facebook Pixel (comprehensive)
    $('script').each((i, elem) => {
      const scriptContent = $(elem).html()?.toLowerCase() || '';
      if (scriptContent.includes('fbq') || 
          scriptContent.includes('facebook pixel') ||
          scriptContent.includes('facebook.com/tr') ||
          scriptContent.includes('meta pixel') ||
          /fbq\s*\(/.test(scriptContent)) {
        hasAds = true;
        adSignals.push('facebook-script');
      }
    });

    // ============================================
    // 🔹 TikTok Ads - Enhanced Detection
    // ============================================
    const tiktokPatterns = [
      'analytics.tiktok.com',
      'ttq.track',
      'ttq.page',
      'ttq.identify',
      'tiktok pixel',
      'tiktok.com/analytics',
      'tiktok.com/i18n',
      'snaptik',
      'tiktokads',
      'tiktok pixel id',
      'tiktok-analytics',
    ];
    
    tiktokPatterns.forEach(pattern => {
      if (htmlLower.includes(pattern) || 
          $(`script[src*="tiktok"]`).length > 0 ||
          $(`script[src*="analytics.tiktok"]`).length > 0 ||
          $(`[data-tiktok-pixel]`).length > 0) {
        hasAds = true;
        adSignals.push('tiktok');
      }
    });

    // Check script content for TikTok (comprehensive)
    $('script').each((i, elem) => {
      const scriptContent = $(elem).html()?.toLowerCase() || '';
      if (scriptContent.includes('ttq') || 
          scriptContent.includes('tiktok pixel') ||
          scriptContent.includes('analytics.tiktok') ||
          /ttq\s*\./.test(scriptContent)) {
        hasAds = true;
        adSignals.push('tiktok-script');
      }
    });

    // ============================================
    // 🔹 Google Ads - Enhanced Detection
    // ============================================
    const googleAdsPatterns = [
      'googletagmanager.com',
      'gtag(\'config\'',
      'gtag("config"',
      'gtag(\'event\'',
      'gtag("event"',
      'googleads.g.doubleclick.net',
      'google-analytics.com',
      'ga(\'create\'',
      'ga("create"',
      'gtm.js',
      'google tag manager',
      'aw-', // Google Ads conversion ID pattern
      'gtag.js',
      'googleadservices.com',
      'doubleclick.net',
      'googleads',
      'google conversion',
      'adwords',
      'gclid=',
      'google-analytics',
    ];
    
    googleAdsPatterns.forEach(pattern => {
      if (htmlLower.includes(pattern) || 
          $(`script[src*="googletagmanager"]`).length > 0 ||
          $(`script[src*="google-analytics"]`).length > 0 ||
          $(`script[src*="doubleclick"]`).length > 0 ||
          $(`script[src*="googleadservices"]`).length > 0 ||
          $(`script[src*="gtag"]`).length > 0 ||
          $(`[data-gtm]`).length > 0 ||
          $(`[data-google-analytics]`).length > 0) {
        hasAds = true;
        adSignals.push('google');
      }
    });

    // Check script content for Google Ads (comprehensive)
    $('script').each((i, elem) => {
      const scriptContent = $(elem).html()?.toLowerCase() || '';
      if (scriptContent.includes('gtag') || 
          scriptContent.includes('google tag manager') ||
          scriptContent.includes('googleads') ||
          scriptContent.includes('aw-') ||
          scriptContent.includes('google conversion') ||
          /gtag\s*\(/.test(scriptContent) ||
          /ga\s*\(/.test(scriptContent)) {
        hasAds = true;
        adSignals.push('google-script');
      }
    });

    // ============================================
    // 🔹 Snapchat Ads - Enhanced Detection
    // ============================================
    const snapchatPatterns = [
      'snaptr(\'init\'',
      'snaptr("init"',
      'snaptr(\'track\'',
      'snaptr("track"',
      'snapchat.com',
      'sc-static.net',
      'snap pixel',
      'snapchat pixel',
      'snapchat-analytics',
    ];
    
    snapchatPatterns.forEach(pattern => {
      if (htmlLower.includes(pattern) || 
          $(`script[src*="snapchat"]`).length > 0 ||
          $(`script[src*="sc-static"]`).length > 0 ||
          $(`[data-snap-pixel]`).length > 0) {
        hasAds = true;
        adSignals.push('snapchat');
      }
    });
    
    // Check script content for Snapchat
    $('script').each((i, elem) => {
      const scriptContent = $(elem).html()?.toLowerCase() || '';
      if (scriptContent.includes('snaptr') || 
          scriptContent.includes('snap pixel') ||
          /snaptr\s*\(/.test(scriptContent)) {
        hasAds = true;
        adSignals.push('snapchat-script');
      }
    });

    // ============================================
    // 🔹 Pinterest Ads - Enhanced Detection
    // ============================================
    const pinterestPatterns = [
      'pintrk(\'load\'',
      'pintrk("load"',
      'pintrk(\'track\'',
      'pintrk("track"',
      'pinterest.com/ads',
      'ct.pinterest.com',
      'pinterest pixel',
      'pinterest-analytics',
      'pinterest tag',
    ];
    
    pinterestPatterns.forEach(pattern => {
      if (htmlLower.includes(pattern) || 
          $(`script[src*="pinterest"]`).length > 0 ||
          $(`script[src*="ct.pinterest"]`).length > 0 ||
          $(`[data-pinterest-pixel]`).length > 0) {
        hasAds = true;
        adSignals.push('pinterest');
      }
    });
    
    // Check script content for Pinterest
    $('script').each((i, elem) => {
      const scriptContent = $(elem).html()?.toLowerCase() || '';
      if (scriptContent.includes('pintrk') || 
          scriptContent.includes('pinterest pixel') ||
          scriptContent.includes('ct.pinterest') ||
          /pintrk\s*\(/.test(scriptContent)) {
        hasAds = true;
        adSignals.push('pinterest-script');
      }
    });

    // ============================================
    // 🔹 Twitter/X Ads
    // ============================================
    const twitterPatterns = [
      'ads-twitter.com',
      'twitter.com/ads',
      'twq(\'track\'',
      'twq("track"',
      'twitter pixel',
      'twitter-analytics',
    ];
    
    twitterPatterns.forEach(pattern => {
      if (htmlLower.includes(pattern) || 
          $(`script[src*="ads-twitter"]`).length > 0 ||
          $(`script[src*="twitter"]`).length > 0) {
        hasAds = true;
        adSignals.push('twitter');
      }
    });
    
    // Check script content for Twitter
    $('script').each((i, elem) => {
      const scriptContent = $(elem).html()?.toLowerCase() || '';
      if (scriptContent.includes('twq') || 
          scriptContent.includes('twitter pixel') ||
          /twq\s*\(/.test(scriptContent)) {
        hasAds = true;
        adSignals.push('twitter-script');
      }
    });

    // ============================================
    // 🔹 Shopify Native Marketing Tools
    // ============================================
    const shopifyMarketingPatterns = [
      'shopify.analytics',
      'shopify.marketing',
      'shopify pixel',
      'shopify conversion',
      'shopify checkout tracking',
      'shopify.analytics.reportConversion',
      'shopify.analytics.track',
    ];
    
    shopifyMarketingPatterns.forEach(pattern => {
      if (htmlLower.includes(pattern) || 
          $(`script:contains("${pattern}")`).length > 0) {
        hasAds = true;
        adSignals.push('shopify-marketing');
      }
    });
    
    // Check script content for Shopify marketing
    $('script').each((i, elem) => {
      const scriptContent = $(elem).html()?.toLowerCase() || '';
      if (scriptContent.includes('shopify.analytics') || 
          scriptContent.includes('shopify.marketing') ||
          scriptContent.includes('shopify conversion')) {
        hasAds = true;
        adSignals.push('shopify-marketing-script');
      }
    });

    // ============================================
    // 🔹 Landing Page Indicators
    // ============================================
    const landingPageIndicators = [
      'buy now',
      'sticky atc',
      'countdown timer',
      'exit intent popup',
      'urgency',
      'limited time',
      'act now',
    ];
    
    landingPageIndicators.forEach(indicator => {
      if (htmlLower.includes(indicator)) {
        // These are weaker signals, but can indicate ad-driven traffic
        // We don't count them as strong ad signals alone
      }
    });

    if (hasAds) {
      console.log(`   📢 Ads detected (platforms: ${[...new Set(adSignals)].join(', ')})`);
    }

    return hasAds;
  } catch (error) {
    console.error(`Error detecting ads: ${url}`, error.message);
    return false;
  }
};
