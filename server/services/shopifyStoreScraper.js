import axios from 'axios';
import * as cheerio from 'cheerio';
import { scrapeStore } from './storeScraperService.js';
import { getPrisma } from '../config/postgres.js';
import { normalizeUrlToRoot } from '../utils/urlNormalizer.js';

/**
 * Big brands to exclude (common Shopify stores that are too large/branded)
 */
const BIG_BRANDS = [
  'shopify.com',
  'shopify.dev',
  'shopifypartners.com',
  'shopifyplus.com',
  'allbirds',
  'gymshark',
  'kyliecosmetics',
  'kylie',
  'fashionnova',
  'colourpop',
  'glossier',
  'mvmt',
  'brooklinen',
  'away',
  'allbirds',
  'warbyparker',
  'casper',
  'dollar',
  'shave',
  'club',
  'bombas',
  'everlane',
  'reformation',
  'outdoor',
  'voices',
  'taylor',
  'swift',
  'kanye',
  'west',
  'travis',
  'scott',
  'drake',
  'rihanna',
  'fenty',
  'savage',
  'xfenty',
];

/**
 * Check if URL is a big brand (should be excluded)
 */
const isBigBrand = (url) => {
  const urlLower = url.toLowerCase();
  return BIG_BRANDS.some(brand => urlLower.includes(brand));
};

/**
 * Check if URL is a .myshopify.com domain
 */
const isMyshopifyDomain = (url) => {
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    return urlObj.hostname.includes('.myshopify.com');
  } catch {
    return false;
  }
};

/**
 * WHOISXML Scraper - Find Shopify stores via Certificate Transparency
 * Focuses on .myshopify.com domains using CT logs
 */
export const scrapeWhoisXmlStores = async () => {
  const stores = [];
  const apiKey = process.env.WHOISXML_API_KEY;

  if (!apiKey) {
    console.log('⚠️  WHOISXML API key not configured, skipping WHOISXML scraping');
    return stores;
  }

  try {
    console.log('🔍 WHOISXML: Searching for Shopify stores via Certificate Transparency...');

    // Use WHOISXML Certificate Transparency API to find .myshopify.com domains
    // This finds all SSL certificates issued for *.myshopify.com domains
    try {
      // WHOISXML CT API endpoint
      const ctApiUrl = 'https://certificate-transparency.api.whoisxmlapi.com/api/v1';
      
      // Search for certificates with myshopify.com in the domain
      const searchParams = new URLSearchParams({
        apiKey: apiKey,
        q: 'myshopify.com',
        outputFormat: 'JSON',
        limit: 100, // Adjust based on API limits
      });

      const response = await axios.get(`${ctApiUrl}?${searchParams.toString()}`, {
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SneakLinkBot/1.0)',
        },
      }).catch(() => null);

      if (response?.data?.domains || response?.data?.results) {
        const domains = response.data.domains || response.data.results || [];
        
        for (const domainData of domains) {
          const domain = domainData.domain || domainData.name || domainData;
          
          if (typeof domain === 'string' && domain.includes('.myshopify.com')) {
            // Extract the subdomain
            const match = domain.match(/([^.]+)\.myshopify\.com/);
            if (match && match[1]) {
              const storeUrl = `https://${domain}`;
              
              // Exclude big brands and Shopify's own domains
              if (!isBigBrand(storeUrl) && !domain.includes('shopify')) {
                const normalizedUrl = normalizeUrlToRoot(storeUrl);
                if (normalizedUrl) {
                  stores.push({
                    url: normalizedUrl,
                    source: 'WHOISXML CT',
                  });
                }
              }
            }
          }
        }
      }
    } catch (ctError) {
      // If CT API fails, try alternative: Use WHOIS to verify domains
      console.log('   WHOISXML CT API not available, using domain verification strategy');
      
      // Alternative: Generate potential .myshopify.com domains and verify
      // This is a fallback if CT API doesn't work
      // We'll skip this for now as it's less efficient
    }

    // Deduplicate stores
    const uniqueStores = Array.from(
      new Map(stores.map(store => [store.url, store])).values()
    );

    console.log(`   WHOISXML: Found ${uniqueStores.length} unique Shopify stores`);
    return uniqueStores;
  } catch (error) {
    console.error('Error in WHOISXML scraper:', error.message);
    return stores;
  }
};

/**
 * Reddit Scraper - Enhanced to find .myshopify.com stores
 */
export const scrapeRedditStores = async () => {
  const stores = [];
  const subreddits = [
    'shopify',
    'ecommerce',
    'dropship',
    'dropshipping',
    'printondemand',
    'entrepreneur',
    'startups',
    'sideproject',
    'indiebiz',
    'smallbusiness',
    'onlineselling',
    'shopifystores',
  ];

  try {
    console.log('🔍 Reddit: Scraping Shopify store links...');

    for (const subreddit of subreddits) {
      try {
        // Get hot posts
        const hotResponse = await axios.get(
          `https://www.reddit.com/r/${subreddit}/hot.json?limit=100`,
          {
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; SneakLinkBot/1.0)',
            },
            timeout: 15000,
          }
        ).catch(() => null);

        // Get new posts
        const newResponse = await axios.get(
          `https://www.reddit.com/r/${subreddit}/new.json?limit=100`,
          {
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; SneakLinkBot/1.0)',
            },
            timeout: 15000,
          }
        ).catch(() => null);

        const allPosts = [
          ...(hotResponse?.data?.data?.children || []),
          ...(newResponse?.data?.data?.children || []),
        ];

        // Deduplicate posts by ID
        const uniquePosts = Array.from(
          new Map(allPosts.map(post => [post.data?.id, post])).values()
        );

        for (const post of uniquePosts) {
          const text = `${post.data?.selftext || ''} ${post.data?.title || ''} ${post.data?.url || ''}`;
          
          // Extract URLs
          const urlRegex = /(https?:\/\/[^\s\)]+)/g;
          const urls = text.match(urlRegex) || [];

          for (const url of urls) {
            try {
              const cleanUrl = url.trim().replace(/[.,;!?]+$/, '');
              
              // Focus on .myshopify.com domains
              if (isMyshopifyDomain(cleanUrl)) {
                // Exclude big brands
                if (!isBigBrand(cleanUrl)) {
                  const normalizedUrl = normalizeUrlToRoot(cleanUrl);
                  if (normalizedUrl) {
                    stores.push({
                      url: normalizedUrl,
                      source: 'Reddit',
                    });
                  }
                }
              }
            } catch (e) {
              // Skip invalid URLs
            }
          }
        }

        // Small delay between subreddits
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`   Error scraping Reddit subreddit ${subreddit}:`, error.message);
      }
    }

    // Deduplicate stores
    const uniqueStores = Array.from(
      new Map(stores.map(store => [store.url, store])).values()
    );

    console.log(`   Reddit: Found ${uniqueStores.length} unique Shopify stores`);
    return uniqueStores;
  } catch (error) {
    console.error('Error in Reddit scraper:', error.message);
    return stores;
  }
};

/**
 * Global Search Scraper - Search engines for .myshopify.com stores
 */
export const scrapeGlobalSearch = async () => {
  const stores = [];
  
  try {
    console.log('🔍 Global Search: Searching for Shopify stores...');

    // Search queries focused on .myshopify.com
    const searchQueries = [
      'site:myshopify.com',
      'site:myshopify.com store',
      'site:myshopify.com shop',
      'site:myshopify.com products',
      'site:myshopify.com collection',
      'site:myshopify.com dropshipping',
      'site:myshopify.com print on demand',
      'site:myshopify.com ecommerce',
      'site:myshopify.com online store',
      'site:myshopify.com -shopify.com -shopify.dev', // Exclude Shopify's own domains
    ];

    // Use Google Custom Search if available
    if (process.env.GOOGLE_CSE_API_KEY && process.env.GOOGLE_CSE_ID) {
      const googleCseApiKey = process.env.GOOGLE_CSE_API_KEY;
      const googleCseId = process.env.GOOGLE_CSE_ID;

      for (const query of searchQueries) {
        try {
          const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${googleCseApiKey}&cx=${googleCseId}&q=${encodeURIComponent(query)}&num=10`;
          
          const response = await axios.get(searchUrl, {
            timeout: 15000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; SneakLinkBot/1.0)',
            },
          }).catch(() => null);

          if (response?.data?.items) {
            for (const item of response.data.items) {
              const url = item.link;
              
              // Focus on .myshopify.com domains
              if (isMyshopifyDomain(url) && !isBigBrand(url)) {
                const normalizedUrl = normalizeUrlToRoot(url);
                if (normalizedUrl) {
                  stores.push({
                    url: normalizedUrl,
                    source: 'Google Search',
                  });
                }
              }
            }
          }

          // Rate limiting - Google CSE has 100 queries/day free tier
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
          console.error(`   Error searching with query "${query}":`, error.message);
        }
      }
    }

    // Use SerpAPI if available (alternative to Google CSE)
    if (process.env.SERPAPI_KEY) {
      const serpApiKey = process.env.SERPAPI_KEY;

      for (const query of searchQueries.slice(0, 5)) { // Limit to 5 queries for SerpAPI
        try {
          const searchUrl = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(query)}&api_key=${serpApiKey}`;
          
          const response = await axios.get(searchUrl, {
            timeout: 15000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; SneakLinkBot/1.0)',
            },
          }).catch(() => null);

          if (response?.data?.organic_results) {
            for (const result of response.data.organic_results) {
              const url = result.link;
              
              if (isMyshopifyDomain(url) && !isBigBrand(url)) {
                const normalizedUrl = normalizeUrlToRoot(url);
                if (normalizedUrl) {
                  stores.push({
                    url: normalizedUrl,
                    source: 'SerpAPI',
                  });
                }
              }
            }
          }

          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
          console.error(`   Error searching with SerpAPI "${query}":`, error.message);
        }
      }
    }

    // Use Serper.dev if available (another alternative)
    if (process.env.SERPER_API_KEY) {
      const serperApiKey = process.env.SERPER_API_KEY;

      for (const query of searchQueries.slice(0, 5)) {
        try {
          const response = await axios.post(
            'https://google.serper.dev/search',
            {
              q: query,
              num: 10,
            },
            {
              headers: {
                'X-API-KEY': serperApiKey,
                'Content-Type': 'application/json',
              },
              timeout: 15000,
            }
          ).catch(() => null);

          if (response?.data?.organic) {
            for (const result of response.data.organic) {
              const url = result.link;
              
              if (isMyshopifyDomain(url) && !isBigBrand(url)) {
                const normalizedUrl = normalizeUrlToRoot(url);
                if (normalizedUrl) {
                  stores.push({
                    url: normalizedUrl,
                    source: 'Serper.dev',
                  });
                }
              }
            }
          }

          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
          console.error(`   Error searching with Serper.dev "${query}":`, error.message);
        }
      }
    }

    // Deduplicate stores
    const uniqueStores = Array.from(
      new Map(stores.map(store => [store.url, store])).values()
    );

    console.log(`   Global Search: Found ${uniqueStores.length} unique Shopify stores`);
    return uniqueStores;
  } catch (error) {
    console.error('Error in Global Search scraper:', error.message);
    return stores;
  }
};

/**
 * Main scraping function - Runs all scrapers and processes stores
 */
export const runShopifyStoreScraping = async () => {
  console.log('\n' + '='.repeat(80));
  console.log('🚀 Starting Shopify Store Scraping Job');
  console.log('='.repeat(80));

  const allStores = [];
  const stats = {
    found: 0,
    processed: 0,
    saved: 0,
    rejected: 0,
    errors: 0,
  };

  try {
    // Run all scrapers in parallel
    console.log('\n📡 Scraping from multiple sources...\n');

    const [redditStores, globalSearchStores, whoisXmlStores] = await Promise.allSettled([
      scrapeRedditStores(),
      scrapeGlobalSearch(),
      scrapeWhoisXmlStores(),
    ]);

    // Collect all stores
    if (redditStores.status === 'fulfilled') {
      allStores.push(...redditStores.value);
    }
    if (globalSearchStores.status === 'fulfilled') {
      allStores.push(...globalSearchStores.value);
    }
    if (whoisXmlStores.status === 'fulfilled') {
      allStores.push(...whoisXmlStores.value);
    }

    // Deduplicate by URL
    const uniqueStores = Array.from(
      new Map(allStores.map(store => [store.url, store])).values()
    );

    stats.found = uniqueStores.length;
    console.log(`\n✅ Found ${stats.found} unique Shopify stores to process`);

    // Check which stores already exist in database
    const prisma = getPrisma();
    const existingUrls = new Set();
    
    if (uniqueStores.length > 0) {
      const urls = uniqueStores.map(s => normalizeUrlToRoot(s.url)).filter(Boolean);
      const existing = await prisma.store.findMany({
        where: {
          url: { in: urls },
        },
        select: { url: true },
      });
      
      existing.forEach(store => existingUrls.add(store.url));
    }

    const newStores = uniqueStores.filter(store => {
      const normalized = normalizeUrlToRoot(store.url);
      return normalized && !existingUrls.has(normalized);
    });

    console.log(`   ${newStores.length} new stores to scrape (${existingUrls.size} already exist)`);

    // Process stores through 7-stage detection
    console.log('\n🔄 Processing stores through 7-stage detection...\n');

    for (let i = 0; i < newStores.length; i++) {
      const store = newStores[i];
      stats.processed++;

      try {
        console.log(`[${i + 1}/${newStores.length}] Processing: ${store.url}`);

        const result = await scrapeStore(store.url, { source: store.source || 'scraper' });

        if (result.success) {
          stats.saved++;
          console.log(`   ✅ Saved: ${result.store.name}`);
        } else {
          stats.rejected++;
          console.log(`   ❌ Rejected: ${result.error} (${result.stage})`);
        }

        // Rate limiting - small delay between stores
        if (i < newStores.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (error) {
        stats.errors++;
        console.error(`   ❌ Error processing ${store.url}:`, error.message);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('📊 Scraping Job Complete');
    console.log('='.repeat(80));
    console.log(`   Found: ${stats.found}`);
    console.log(`   Processed: ${stats.processed}`);
    console.log(`   Saved: ${stats.saved}`);
    console.log(`   Rejected: ${stats.rejected}`);
    console.log(`   Errors: ${stats.errors}`);
    console.log('='.repeat(80) + '\n');

    return stats;
  } catch (error) {
    console.error('❌ Error in scraping job:', error.message);
    stats.errors++;
    return stats;
  }
};
