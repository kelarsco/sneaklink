import axios from 'axios';
import * as cheerio from 'cheerio';
import { getHTMLWithAPI } from './scrapingApi.js';

/**
 * BUSINESS MODEL DETECTOR V2 - Confidence-Based
 * 
 * Returns confidence scores for all business models instead of binary classification
 * Never assigns Dropshipping as fallback - returns scores for all models
 * 
 * Returns: {
 *   scores: { 'Print on Demand': 0.85, 'Dropshipping': 0.15, ... },
 *   primaryModel: 'Print on Demand' | null,
 *   confidence: 0.85,
 *   signals: { ... }
 * }
 */

export const detectBusinessModelWithScores = async (url) => {
  try {
    const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
    
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
        maxRedirects: 5,
      });
      html = response.data;
    }

    if (!html) {
      return {
        scores: {
          'Print on Demand': 0.25,
          'Dropshipping': 0.25,
          'Branded Ecommerce': 0.25,
          'Marketplace': 0.25,
        },
        primaryModel: null,
        confidence: 0.25,
        signals: { error: 'no_html' },
      };
    }

    const htmlLower = html.toLowerCase();
    const $ = cheerio.load(html);
    
    // Extract additional signals: currency, language, domain, footer address
    const urlObj = new URL(normalizedUrl);
    const domain = urlObj.hostname.toLowerCase();
    
    // Extract currency from HTML (meta tags, scripts, or content)
    let currency = null;
    const currencyMatch = html.match(/currency["\s:=]+([A-Z]{3})/i) || 
                          html.match(/["']currency["']:\s*["']([A-Z]{3})["']/i) ||
                          html.match(/<meta[^>]*currency[^>]*content=["']([A-Z]{3})["']/i);
    if (currencyMatch) {
      currency = currencyMatch[1].toUpperCase();
    }
    
    // Extract language from HTML
    let language = null;
    const langMatch = html.match(/<html[^>]*lang=["']([^"']+)["']/i) ||
                     html.match(/<meta[^>]*http-equiv=["']content-language["'][^>]*content=["']([^"']+)["']/i);
    if (langMatch) {
      language = langMatch[1].toLowerCase().split('-')[0];
    }
    
    // Extract footer address (common location for business info)
    const footer = $('footer').text().toLowerCase() || '';
    const footerAddress = footer.match(/\d+[^,]+(?:street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|way|circle|cir)[^,]*/i);
    
    const scores = {
      'Print on Demand': 0.0,
      'Dropshipping': 0.0,
      'Branded Ecommerce': 0.0,
      'Marketplace': 0.0,
    };
    
    const signals = {
      pod: [],
      dropshipping: [],
      branded: [],
      marketplace: [],
      metadata: {
        domain,
        currency: currency || 'unknown',
        language: language || 'unknown',
        hasFooterAddress: !!footerAddress,
      },
    };
    
    // Domain-based signals
    // .myshopify.com domains are often POD or Dropshipping (less likely branded)
    let dropshippingScore = 0.0; // Initialize early for domain signals
    if (domain.includes('.myshopify.com')) {
      signals.dropshipping.push('myshopify-domain');
      signals.pod.push('myshopify-domain');
    }
    
    // Currency signals (non-USD often indicates international/dropshipping)
    if (currency && currency !== 'USD' && currency !== 'EUR' && currency !== 'GBP') {
      dropshippingScore += 0.1;
      signals.dropshipping.push(`currency:${currency}`);
    }
    
    // Footer address signals (branded stores more likely to have physical address)
    if (footerAddress) {
      scores['Branded Ecommerce'] += 0.2;
      signals.branded.push('footer-address');
    }

    // ============================================
    // PRINT-ON-DEMAND DETECTION
    // ============================================
    let podScore = 0.0;
    
    // POD Apps (very strong signals - weight: 0.8)
    // GREEN FLAG: If ANY of these apps are detected, it's a strong POD indicator
    const podApps = [
      // User-specified POD apps (highest priority)
      'printify', 'printful', 'gelato', 'spod', 'customcat',
      'jetprint', 'inkedjoy', 'aop+', 'aop easy print on demand',
      'printy6', 'printy 6',
      // Additional POD platforms
      'gooten', 'teespring', 'spring', 'apliiq', 'printaura',
      'textildruck', 'contrado', 'redbubble', 'zazzle', 'society6',
      'designbyhumans', 'printfy.js', 'printful.js',
      'print on demand', 'print-on-demand',
      // POD app integrations and scripts
      'printful-integration', 'printify-integration', 'gooten-integration',
      'printful.js', 'printify.js', 'gelato.js', 'spod.js',
    ];
    
    for (const app of podApps) {
      const appPattern = new RegExp(app.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
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
        podScore += 0.8; // Very strong signal - one POD app = high confidence
        signals.pod.push(`app:${app}`);
        break; // One POD app is enough for high confidence
      }
    }
    
    // POD Keywords (weight: 0.2 each, max 0.4)
    const podKeywords = [
      'made to order', 'printed just for you', 'production time',
      'custom printed', 'made when you order', 'printed on demand',
      'this product is made on demand', 'no refunds on custom items',
      'made on demand', 'print on demand', 'custom items',
      'personalized items', 'printed when ordered',
    ];
    
    let podKeywordsFound = 0;
    for (const keyword of podKeywords) {
      if (htmlLower.includes(keyword)) {
        podScore += 0.2;
        signals.pod.push(`keyword:${keyword}`);
        podKeywordsFound++;
        if (podKeywordsFound >= 2) break; // Max 0.4 from keywords
      }
    }
    
    // Product Types & Variants (POD indicators)
    // POD stores often have many size/color variants
    const variantCount = $('[data-variant-id]').length || $('.product-variant').length || 
                        $('.variant-selector').length || $('[data-option]').length || 0;
    if (variantCount > 10) {
      podScore += 0.15;
      signals.pod.push(`many-variants:${variantCount}`);
    }
    
    // Check for size-based SKUs (common in POD)
    const sizePatterns = /\b(s|m|l|xl|2xl|3xl|4xl|5xl|6xl)\b/gi;
    const sizeMatches = htmlLower.match(sizePatterns);
    if (sizeMatches && sizeMatches.length > 5) {
      podScore += 0.1;
      signals.pod.push('size-based-skus');
    }
    
    // Product Images (mockup-style indicators)
    const imageIndicators = [
      'mockup', 'flat-lay', 'blank model', 'product mockup',
      'design mockup', 'print preview',
    ];
    for (const indicator of imageIndicators) {
      if (htmlLower.includes(indicator)) {
        podScore += 0.1;
        signals.pod.push(`image:${indicator}`);
        break;
      }
    }
    
    // Shipping Times (POD typically has longer production times)
    const podShippingPatterns = [
      'production time: 3-5 days', 'production time: 5-7 days',
      'production time: 7-10 days', 'made to order: 3-5',
      'custom printing takes', 'printing time',
    ];
    for (const pattern of podShippingPatterns) {
      if (htmlLower.includes(pattern)) {
        podScore += 0.15;
        signals.pod.push(`shipping:${pattern}`);
        break;
      }
    }
    
    // Clamp POD score to 1.0
    podScore = Math.min(1.0, podScore);
    scores['Print on Demand'] = podScore;

    // ============================================
    // DROPSHIPPING DETECTION
    // ============================================
    // dropshippingScore already initialized above for currency signals
    
    // Dropshipping Apps (strong signals - weight: 0.6)
    const dropshippingApps = [
      'oberlo', 'dsers', 'spocket', 'zendrop', 'cj dropshipping',
      'cjdropshipping', 'ali reviews', 'loox', 'judge.me', 'ryviu',
      'alireviews', 'ali-express', 'aliexpress',
    ];
    
    for (const app of dropshippingApps) {
      const appPattern = new RegExp(app.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      const foundInScripts = $(`script[src*="${app}"]`).length > 0;
      const foundInLinks = $(`a[href*="${app}"]`).length > 0;
      const foundInHTML = appPattern.test(htmlLower);
      
      if (foundInHTML || foundInScripts || foundInLinks) {
        dropshippingScore += 0.6;
        signals.dropshipping.push(`app:${app}`);
        break;
      }
    }
    
    // Shipping clues (weight: 0.2 each, max 0.4)
    const shippingClues = [
      'ships from overseas', 'delivery: 7–15 business days',
      'delivery: 7-15 business days', 'processing time',
      'ships from china', 'ships from asia', 'estimated delivery',
      'shipping from supplier', 'international shipping',
      'tracking number will be provided', 'ships from warehouse',
    ];
    
    let shippingCluesFound = 0;
    for (const clue of shippingClues) {
      if (htmlLower.includes(clue)) {
        dropshippingScore += 0.2;
        signals.dropshipping.push(`shipping:${clue}`);
        shippingCluesFound++;
        if (shippingCluesFound >= 2) break; // Max 0.4 from shipping clues
      }
    }
    
    // Product Types & Variants (Dropshipping indicators)
    // Dropshipping stores often have many generic products with many variants
    const productCount = $('.product-item, .product-card, [data-product-id]').length || 0;
    if (productCount > 50) {
      dropshippingScore += 0.15;
      signals.dropshipping.push(`many-products:${productCount}`);
    }
    
    // Generic product descriptions (common in dropshipping)
    const genericIndicators = [
      'high quality', 'premium quality', 'best seller',
      'hot sale', 'limited stock', 'wholesale price',
    ];
    let genericFound = 0;
    for (const indicator of genericIndicators) {
      if (htmlLower.includes(indicator)) {
        dropshippingScore += 0.1;
        signals.dropshipping.push(`generic:${indicator}`);
        genericFound++;
        if (genericFound >= 2) break;
      }
    }
    
    // Policy red flags (weight: 0.15 each, max 0.3)
    const policyFlags = [
      'supplier delays', 'we are not responsible for customs',
      'multiple warehouse locations', 'customs fees', 'import duties',
      'third-party supplier',
    ];
    
    let policyFlagsFound = 0;
    for (const flag of policyFlags) {
      if (htmlLower.includes(flag)) {
        dropshippingScore += 0.15;
        signals.dropshipping.push(`policy:${flag}`);
        policyFlagsFound++;
        if (policyFlagsFound >= 2) break; // Max 0.3 from policy flags
      }
    }
    
    // Clamp dropshipping score to 1.0
    dropshippingScore = Math.min(1.0, dropshippingScore);
    scores['Dropshipping'] = dropshippingScore;

    // ============================================
    // BRANDED ECOMMERCE DETECTION
    // ============================================
    let brandedScore = 0.0;
    
    // Brand indicators (strong signals)
    const brandIndicators = [
      'about us', 'our story', 'our mission', 'since 20',
      'established', 'founded', 'manufacturer', 'made in',
      'quality guarantee', 'lifetime warranty', 'brand story',
    ];
    
    for (const indicator of brandIndicators) {
      if (htmlLower.includes(indicator)) {
        brandedScore += 0.15;
        signals.branded.push(`indicator:${indicator}`);
        if (brandedScore >= 0.6) break; // Cap at 0.6
      }
    }
    
    // If POD and Dropshipping scores are both low, increase branded score
    if (podScore < 0.3 && dropshippingScore < 0.3) {
      brandedScore = Math.min(0.7, brandedScore + 0.4);
    }
    
    scores['Branded Ecommerce'] = Math.min(1.0, brandedScore);

    // ============================================
    // MARKETPLACE DETECTION
    // ============================================
    let marketplaceScore = 0.0;
    
    // Marketplace indicators
    const marketplaceIndicators = [
      'multiple sellers', 'sell on our platform', 'become a seller',
      'vendor', 'seller dashboard', 'marketplace',
    ];
    
    for (const indicator of marketplaceIndicators) {
      if (htmlLower.includes(indicator)) {
        marketplaceScore += 0.3;
        signals.marketplace.push(`indicator:${indicator}`);
        if (marketplaceScore >= 0.6) break;
      }
    }
    
    scores['Marketplace'] = Math.min(1.0, marketplaceScore);

    // ============================================
    // NORMALIZE SCORES (ensure they sum to reasonable total)
    // ============================================
    // If all scores are very low, distribute evenly (low confidence)
    const maxScore = Math.max(...Object.values(scores));
    if (maxScore < 0.3) {
      // Low confidence - distribute evenly
      Object.keys(scores).forEach(key => {
        scores[key] = 0.25;
      });
    }

    // Find primary model (highest score)
    const entries = Object.entries(scores);
    const primaryEntry = entries.reduce((a, b) => a[1] > b[1] ? a : b);
    const primaryModel = primaryEntry[1] > 0.3 ? primaryEntry[0] : null;
    const confidence = primaryEntry[1];

    return {
      scores,
      primaryModel,
      confidence,
      signals,
    };
  } catch (error) {
    console.error(`Error detecting business model: ${url}`, error.message);
    // Return low confidence for all models on error
    return {
      scores: {
        'Print on Demand': 0.25,
        'Dropshipping': 0.25,
        'Branded Ecommerce': 0.25,
        'Marketplace': 0.25,
      },
      primaryModel: null,
      confidence: 0.25,
      signals: { error: error.message },
    };
  }
};

/**
 * Legacy compatibility function (returns string like old detector)
 * Use this during transition period
 */
export const detectBusinessModel = async (url) => {
  const result = await detectBusinessModelWithScores(url);
  
  if (result.primaryModel && result.confidence >= 0.5) {
    return result.primaryModel;
  }
  
  return 'Unknown';
};
