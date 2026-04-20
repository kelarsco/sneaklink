import axios from 'axios';
import { getPrisma } from '../config/postgres.js';
import { canonicalizeUrl } from '../utils/urlCanonicalizer.js';

/**
 * Enhanced Verification Service
 * 
 * Comprehensive store validation with multiple verification methods
 * to ensure high-quality, accurate store detection
 */

// Verification configuration
const VERIFICATION_CONFIG = {
  // Verification timeouts
  timeouts: {
    quick: 3000,    // Quick verification (3 seconds)
    standard: 8000, // Standard verification (8 seconds)
    deep: 15000,     // Deep verification (15 seconds)
  },
  
  // Retry configuration
  retries: {
    max: 3,
    delay: 2000, // 2 seconds between retries
  },
  
  // Verification methods
  methods: {
    http: true,        // HTTP request verification
    https: true,       // HTTPS verification
    headers: true,      // Header analysis
    content: true,      // Content analysis
    dns: true,         // DNS verification
    ssl: true,         // SSL certificate verification
    whois: true,       // WHOIS data verification
  },
  
  // Quality thresholds
  quality: {
    minResponseTime: 5000,  // Max 5 seconds response time
    minUptime: 0.95,        // 95% uptime requirement
    minProductCount: 1,        // At least 1 product
    requiredHeaders: ['server', 'content-type'],
  }
};

/**
 * Comprehensive store verification
 */
export const verifyStoreComprehensive = async (storeId) => {
  console.log(`🔍 Starting comprehensive verification for store ${storeId}...`);
  
  try {
    const prisma = getPrisma();
    const store = await prisma.store.findUnique({
      where: { id: storeId },
    });
    
    if (!store) {
      throw new Error(`Store ${storeId} not found`);
    }
    
    const verificationResults = {
      storeId,
      url: store.url,
      timestamp: new Date(),
      methods: {},
      overall: {
        isShopify: false,
        isActive: false,
        quality: 'unknown',
        confidence: 0,
        issues: [],
      },
      performance: {
        responseTime: null,
        uptime: null,
        sslValid: null,
        redirects: null,
      },
      content: {
        hasProducts: false,
        productCount: 0,
        hasCheckout: false,
        theme: null,
        features: [],
      },
      metadata: {
        ip: null,
        country: null,
        hosting: null,
        nameservers: [],
      }
    };
    
    // Run all verification methods
    const verificationPromises = [];
    
    if (VERIFICATION_CONFIG.methods.http) {
      verificationPromises.push(verifyHttpAccess(store.url, verificationResults));
    }
    
    if (VERIFICATION_CONFIG.methods.https) {
      verificationPromises.push(verifyHttpsAccess(store.url, verificationResults));
    }
    
    if (VERIFICATION_CONFIG.methods.headers) {
      verificationPromises.push(verifyHeaders(store.url, verificationResults));
    }
    
    if (VERIFICATION_CONFIG.methods.content) {
      verificationPromises.push(verifyContent(store.url, verificationResults));
    }
    
    if (VERIFICATION_CONFIG.methods.dns) {
      verificationPromises.push(verifyDNS(store.url, verificationResults));
    }
    
    if (VERIFICATION_CONFIG.methods.ssl) {
      verificationPromises.push(verifySSL(store.url, verificationResults));
    }
    
    if (VERIFICATION_CONFIG.methods.whois) {
      verificationPromises.push(verifyWhois(store.url, verificationResults));
    }
    
    // Wait for all verifications
    const results = await Promise.allSettled(verificationPromises);
    
    // Analyze results and determine overall status
    analyzeVerificationResults(verificationResults, results);
    
    // Update store in database
    await updateStoreWithVerificationResults(storeId, verificationResults);
    
    console.log(`✅ Comprehensive verification completed for ${store.url}`);
    console.log(`   🎯 Shopify: ${verificationResults.overall.isShopify}`);
    console.log(`   ✅ Active: ${verificationResults.overall.isActive}`);
    console.log(`   ⭐ Quality: ${verificationResults.overall.quality}`);
    console.log(`   📊 Confidence: ${verificationResults.overall.confidence}%`);
    
    return verificationResults;
    
  } catch (error) {
    console.error(`❌ Comprehensive verification failed for store ${storeId}:`, error.message);
    throw error;
  }
};

/**
 * Verify HTTP access
 */
async function verifyHttpAccess(url, results) {
  try {
    const startTime = Date.now();
    
    const response = await axios.get(url, {
      timeout: VERIFICATION_CONFIG.timeouts.standard,
      maxRedirects: 5,
      validateStatus: false,
    });
    
    const responseTime = Date.now() - startTime;
    
    results.methods.http = {
      success: true,
      responseTime,
      statusCode: response.status,
      redirects: response.request?.res?.responseUrl ? 1 : 0,
      finalUrl: response.request?.res?.responseUrl || url,
    };
    
    results.performance.responseTime = Math.min(results.performance.responseTime || Infinity, responseTime);
    
    return results.methods.http;
  } catch (error) {
    results.methods.http = {
      success: false,
      error: error.message,
      responseTime: VERIFICATION_CONFIG.timeouts.standard,
    };
    return results.methods.http;
  }
}

/**
 * Verify HTTPS access
 */
async function verifyHttpsAccess(url, results) {
  try {
    const httpsUrl = url.replace(/^http:\/\//, 'https://');
    const startTime = Date.now();
    
    const response = await axios.get(httpsUrl, {
      timeout: VERIFICATION_CONFIG.timeouts.standard,
      maxRedirects: 5,
    });
    
    const responseTime = Date.now() - startTime;
    
    results.methods.https = {
      success: true,
      responseTime,
      statusCode: response.status,
      hasValidCert: true,
      finalUrl: response.request?.res?.responseUrl || httpsUrl,
    };
    
    results.performance.responseTime = Math.min(results.performance.responseTime || Infinity, responseTime);
    results.performance.sslValid = true;
    
    return results.methods.https;
  } catch (error) {
    results.methods.https = {
      success: false,
      error: error.message,
      hasValidCert: false,
    };
    
    results.performance.sslValid = false;
    return results.methods.https;
  }
}

/**
 * Verify headers and detect Shopify
 */
async function verifyHeaders(url, results) {
  try {
    const response = await axios.head(url, {
      timeout: VERIFICATION_CONFIG.timeouts.quick,
      maxRedirects: 3,
    });
    
    const headers = response.headers;
    const server = headers.server || '';
    const poweredBy = headers['x-powered-by'] || '';
    const contentType = headers['content-type'] || '';
    
    // Shopify detection patterns
    const shopifyPatterns = [
      /shopify/i,
      /cloudflare/i,
      /nginx/i,
    ];
    
    const isShopify = shopifyPatterns.some(pattern => 
      pattern.test(server) || pattern.test(poweredBy)
    );
    
    results.methods.headers = {
      success: true,
      server,
      poweredBy,
      contentType,
      shopifyIndicators: {
        server: shopifyPatterns[0].test(server),
        poweredBy: shopifyPatterns.some(p => p.test(poweredBy)),
        cloudflare: /cloudflare/i.test(server),
      },
      isShopify,
    };
    
    return results.methods.headers;
  } catch (error) {
    results.methods.headers = {
      success: false,
      error: error.message,
      isShopify: false,
    };
    return results.methods.headers;
  }
}

/**
 * Verify content and extract store information
 */
async function verifyContent(url, results) {
  try {
    const response = await axios.get(url, {
      timeout: VERIFICATION_CONFIG.timeouts.standard,
      maxRedirects: 3,
    });
    
    const content = response.data;
    const $ = cheerio.load(content);
    
    // Shopify-specific indicators
    const shopifyIndicators = {
      hasShopifyJs: content.includes('Shopify.shop'),
      hasShopifyAdmin: content.includes('/admin') || content.includes('myshopify.com'),
      hasCheckout: content.includes('checkout') || content.includes('cart'),
      hasProductGrid: $('.product, .product-item, .grid__item').length > 0,
      theme: extractTheme(content),
    };
    
    // Product count estimation
    const productCount = estimateProductCount($);
    
    results.methods.content = {
      success: true,
      title: $('title').text().trim(),
      description: $('meta[name="description"]').attr('content') || '',
      shopifyIndicators,
      productCount,
      hasProducts: productCount > 0,
      hasCheckout: shopifyIndicators.hasCheckout,
      theme: shopifyIndicators.theme,
      features: extractFeatures($),
    };
    
    results.content.hasProducts = shopifyIndicators.hasProductGrid || productCount > 0;
    results.content.productCount = productCount;
    results.content.hasCheckout = shopifyIndicators.hasCheckout;
    results.content.theme = shopifyIndicators.theme;
    
    return results.methods.content;
  } catch (error) {
    results.methods.content = {
      success: false,
      error: error.message,
      hasProducts: false,
      productCount: 0,
    };
    return results.methods.content;
  }
}

/**
 * Verify DNS information
 */
async function verifyDNS(url, results) {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname;
    
    // Use a public DNS API (or implement custom DNS lookup)
    const dnsResponse = await axios.get(`https://dns.google/resolve?name=${domain}&type=A`, {
      timeout: VERIFICATION_CONFIG.timeouts.quick,
    });
    
    const dnsData = dnsResponse.data;
    const ips = dnsData.Answer?.map(record => record.data) || [];
    
    results.methods.dns = {
      success: true,
      domain,
      ips,
      hasRecords: ips.length > 0,
    };
    
    results.metadata.ip = ips[0] || null;
    
    return results.methods.dns;
  } catch (error) {
    results.methods.dns = {
      success: false,
      error: error.message,
      hasRecords: false,
    };
    return results.methods.dns;
  }
}

/**
 * Verify SSL certificate
 */
async function verifySSL(url, results) {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname;
    
    // Use SSL Labs API or similar
    const sslResponse = await axios.get(`https://api.ssllabs.com/api/v3/analyze?host=${domain}&fresh=1`, {
      timeout: VERIFICATION_CONFIG.timeouts.standard,
    });
    
    const sslData = sslResponse.data;
    
    results.methods.ssl = {
      success: true,
      domain,
      isValid: sslData.status === 'READY',
      grade: sslData.endpoints?.[0]?.grade || 'Unknown',
      expires: sslData.endpoints?.[0]?.details?.notAfter || null,
      issuer: sslData.endpoints?.[0]?.details?.issuer || 'Unknown',
    };
    
    results.performance.sslValid = sslData.status === 'READY';
    
    return results.methods.ssl;
  } catch (error) {
    results.methods.ssl = {
      success: false,
      error: error.message,
      isValid: false,
    };
    return results.methods.ssl;
  }
}

/**
 * Verify WHOIS information
 */
async function verifyWhois(url, results) {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname;
    
    // Use WHOIS API
    const whoisResponse = await axios.get(`https://whois.whoisxmlapi.com/whoisserver/whois.php?domain=${domain}&output_format=JSON`, {
      timeout: VERIFICATION_CONFIG.timeouts.standard,
    });
    
    const whoisData = whoisResponse.data;
    
    results.methods.whois = {
      success: true,
      domain,
      registrar: whoisData.WhoisRecord?.registrar?.name || 'Unknown',
      created: whoisData.WhoisRecord?.createdDate || null,
      expires: whoisData.WhoisRecord?.expiresDate || null,
      country: whoisData.WhoisRecord?.registrant?.country || 'Unknown',
    };
    
    results.metadata.country = whoisData.WhoisRecord?.registrant?.country || 'Unknown';
    
    return results.methods.whois;
  } catch (error) {
    results.methods.whois = {
      success: false,
      error: error.message,
      country: 'Unknown',
    };
    return results.methods.whois;
  }
}

/**
 * Extract theme from content
 */
function extractTheme(content) {
  const themePatterns = [
    /"themeStoreId":\s*"?([^"]+)"/,
    /Shopify\.theme\s*=\s*"?([^"]+)"/,
    /theme.*?[\/]([^\/\s"]+)[\/"?]/,
  ];
  
  for (const pattern of themePatterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  // Common Shopify themes
  const commonThemes = ['Dawn', 'Refresh', 'Sense', 'Craft', 'Studio', 'Taste'];
  for (const theme of commonThemes) {
    if (content.includes(theme)) {
      return theme;
    }
  }
  
  return 'Unknown';
}

/**
 * Estimate product count from page
 */
function estimateProductCount($) {
  // Try multiple selectors
  const selectors = [
    '.product',
    '.product-item',
    '.grid__item',
    '.collection-item',
    '[data-product-id]',
    '.product-card',
  ];
  
  let maxCount = 0;
  for (const selector of selectors) {
    const count = $(selector).length;
    maxCount = Math.max(maxCount, count);
  }
  
  // Also try to find count in text
  const countText = $('.product-count, .results-count, .total-products').text();
  const numberMatch = countText.match(/(\d+)/);
  if (numberMatch) {
    maxCount = Math.max(maxCount, parseInt(numberMatch[1]));
  }
  
  return maxCount;
}

/**
 * Extract store features
 */
function extractFeatures($) {
  const features = [];
  
  // Check for common Shopify features
  if ($('[data-customer="login"]').length > 0) features.push('customer-accounts');
  if ($('.wishlist, [data-wishlist]').length > 0) features.push('wishlist');
  if ($('.reviews, .rating').length > 0) features.push('reviews');
  if ($('.search, [data-search]').length > 0) features.push('search');
  if ($('.multilingual, [data-lang]').length > 0) features.push('multilingual');
  if ($('.currency, [data-currency]').length > 0) features.push('multi-currency');
  
  return features;
}

/**
 * Analyze all verification results
 */
function analyzeVerificationResults(results, methodResults) {
  const successfulMethods = methodResults.filter(r => r.status === 'fulfilled' && r.value.success);
  const failedMethods = methodResults.filter(r => r.status === 'rejected' || !r.value.success);
  
  // Determine if it's a Shopify store
  const shopifyVotes = successfulMethods.filter(m => 
    m.value.shopifyIndicators?.isShopify || 
    m.value.isShopify ||
    (m.value.shopifyIndicators && Object.values(m.value.shopifyIndicators).some(Boolean))
  );
  
  const isShopify = shopifyVotes.length >= 2; // At least 2 methods must agree
  
  // Determine if store is active
  const httpSuccess = results.methods.http?.success || results.methods.https?.success;
  const hasContent = results.methods.content?.success;
  const isActive = httpSuccess && hasContent;
  
  // Calculate quality score
  let qualityScore = 0;
  let maxScore = 0;
  
  if (results.methods.http?.success) { qualityScore += 1; maxScore += 1; }
  if (results.methods.https?.success) { qualityScore += 1; maxScore += 1; }
  if (results.methods.headers?.success) { qualityScore += 1; maxScore += 1; }
  if (results.methods.content?.success) { qualityScore += 1; maxScore += 1; }
  if (results.methods.dns?.success) { qualityScore += 1; maxScore += 1; }
  if (results.methods.ssl?.success) { qualityScore += 1; maxScore += 1; }
  
  const qualityPercentage = maxScore > 0 ? (qualityScore / maxScore) * 100 : 0;
  
  // Determine overall quality
  let quality = 'poor';
  if (qualityPercentage >= 80) quality = 'excellent';
  else if (qualityPercentage >= 60) quality = 'good';
  else if (qualityPercentage >= 40) quality = 'fair';
  
  // Identify issues
  const issues = [];
  if (!isShopify) issues.push('Not detected as Shopify store');
  if (!isActive) issues.push('Store not accessible');
  if (results.performance.responseTime > VERIFICATION_CONFIG.quality.minResponseTime) {
    issues.push('Slow response time');
  }
  if (!results.performance.sslValid) issues.push('SSL certificate issues');
  if (!results.content.hasProducts) issues.push('No products detected');
  
  // Update overall results
  results.overall = {
    isShopify,
    isActive,
    quality,
    confidence: Math.round(qualityPercentage),
    issues,
    successfulMethods: successfulMethods.length,
    failedMethods: failedMethods.length,
  };
}

/**
 * Update store with verification results
 */
async function updateStoreWithVerificationResults(storeId, results) {
  try {
    const prisma = getPrisma();
    
    await prisma.store.update({
      where: { id: storeId },
      data: {
        isShopify: results.overall.isShopify,
        shopifyStatus: results.overall.isShopify ? 'verified' : 'not_shopify',
        shopifyConfidence: results.overall.confidence / 100,
        isActive: results.overall.isActive,
        healthStatus: results.overall.quality,
        productCount: results.content.productCount || null,
        productCountStatus: results.content.hasProducts ? 'detected' : 'none',
        country: results.metadata.country || 'Unknown',
        businessModel: results.content.theme || 'Unknown',
        tags: results.content.features || [],
        lastVerified: new Date(),
        verificationMetadata: {
          methods: Object.keys(results.methods),
          performance: results.performance,
          issues: results.overall.issues,
          timestamp: results.timestamp,
        },
      },
    });
    
    console.log(`✅ Updated store ${storeId} with verification results`);
  } catch (error) {
    console.error(`❌ Failed to update store ${storeId}:`, error.message);
  }
}

/**
 * Batch verify multiple stores
 */
export const batchVerifyStores = async (storeIds, options = {}) => {
  const { concurrency = 5, priority = 'normal' } = options;
  
  console.log(`🔄 Starting batch verification of ${storeIds.length} stores...`);
  console.log(`   ⚙️  Concurrency: ${concurrency}, Priority: ${priority}`);
  
  const results = [];
  const batches = [];
  
  // Create batches
  for (let i = 0; i < storeIds.length; i += concurrency) {
    batches.push(storeIds.slice(i, i + concurrency));
  }
  
  // Process batches
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`   📦 Processing batch ${i + 1}/${batches.length} (${batch.length} stores)...`);
    
    const batchPromises = batch.map(storeId => 
      verifyStoreComprehensive(storeId).catch(error => ({
        storeId,
        error: error.message,
        success: false,
      }))
    );
    
    const batchResults = await Promise.allSettled(batchPromises);
    
    batchResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        results.push({
          storeId: batch[index],
          error: result.reason?.message || 'Unknown error',
          success: false,
        });
      }
    });
    
    // Rate limiting between batches
    if (i < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  const successful = results.filter(r => r.success).length;
  const failed = results.length - successful;
  
  console.log(`✅ Batch verification completed: ${successful} successful, ${failed} failed`);
  
  return {
    results,
    summary: {
      total: results.length,
      successful,
      failed,
      duration: Date.now(),
    },
  };
};
