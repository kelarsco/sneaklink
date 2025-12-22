import axios from 'axios';
import * as cheerio from 'cheerio';
import { looksLikeShopifyStore } from './shopifyUrlValidator.js';
import { searchShopifyStoresWithAPI } from './scrapingApi.js';
import { scrapeCommonCrawl, scrapeCommonCrawlByCountry } from './commonCrawl.js';
import { scrapeProductHunt } from './productHuntScraper.js';
import { scrapeIndieHackers } from './indieHackersScraper.js';
import { scrapeMedium } from './mediumScraper.js';
import { scrapeWhoisXml } from './whoisXmlScraper.js';
import { scrapeIPinfo } from './ipinfoScraper.js';
import { scrapeWappalyzer } from './wappalyzerScraper.js';
import { scrapeBuiltWith } from './builtWithScraper.js';
import { scrapeRapidApi } from './rapidApiScraper.js';
import { scrapeSerpApi } from './serpApiScraper.js';
import { scrapeWayback } from './waybackScraper.js';
import { scrapeGitHub } from './githubScraper.js';
import { scrapeShopifyThemeShowcase } from './shopifyThemeShowcaseScraper.js';
import { normalizeUrlToRoot } from './urlNormalizer.js';

/**
 * Scrape Reddit for Shopify store links
 * EXPANDED: Now scrapes 50+ subreddits for maximum coverage
 */
export const scrapeReddit = async () => {
  const stores = [];
  const subreddits = [
    // Core Shopify & E-commerce
    'shopify',
    'ecommerce',
    'dropship',
    'dropshipping',
    'printondemand',
    'entrepreneur',
    'startups',
    'smallbusiness',
    'business',
    
    // Niche e-commerce communities
    'onlineselling',
    'onlinemarketing',
    'digitalmarketing',
    'marketing',
    'socialmedia',
    'socialmediamarketing',
    'contentmarketing',
    'seo',
    'ppc',
    'adwords',
    
    // Product-specific communities
    'etsy',
    'etsysellers',
    'handmade',
    'artstore',
    'crafts',
    'jewelrymaking',
    'streetwearstartup',
    'streetwear',
    'fashion',
    'fashiondesign',
    'frugalmalefashion',
    'malefashionadvice',
    'femalefashionadvice',
    
    // Business & entrepreneurship
    'entrepreneurridealong',
    'juststart',
    'entrepreneurship',
    'sideproject',
    'indiebiz',
    'passive_income',
    'workonline',
    'beermoney',
    'freelance',
    'freelanceWriters',
    
    // Tech & development
    'webdev',
    'web_design',
    'webdevelopment',
    'programming',
    'learnprogramming',
    'coding',
    
    // Marketing & growth
    'growthhacking',
    'marketing',
    'advertising',
    'branding',
    'copywriting',
  ];

  try {
    for (const subreddit of subreddits) {
      try {
        // Scrape multiple Reddit endpoints for better coverage
        const endpoints = [
          { url: `https://www.reddit.com/r/${subreddit}/hot.json?limit=100`, type: 'hot' },
          { url: `https://www.reddit.com/r/${subreddit}/new.json?limit=100`, type: 'new' },
          { url: `https://www.reddit.com/r/${subreddit}/top.json?limit=100&t=week`, type: 'top' },
        ];
        
        for (const endpoint of endpoints) {
          try {
            const response = await axios.get(endpoint.url, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; SneakLinkBot/1.0)',
              },
              timeout: 10000,
            });

            const posts = response.data?.data?.children || [];
            
            for (const post of posts) {
              const text = (post.data?.selftext || '') + ' ' + (post.data?.title || '') + ' ' + (post.data?.url || '');
              const urlRegex = /(https?:\/\/[^\s\)]+)/g;
              const urls = text.match(urlRegex) || [];
              
              for (const url of urls) {
                // Quick pre-filter: Only collect URLs that look like Shopify stores
                if (looksLikeShopifyStore(url)) {
                  // Normalize URL to root homepage only (remove subpaths)
                  const normalizedUrl = normalizeUrlToRoot(url.trim().replace(/[.,;!?]+$/, ''));
                  if (normalizedUrl) {
                    stores.push({
                      url: normalizedUrl,
                      source: 'Reddit',
                    });
                  }
                }
              }
            }
            
            // Small delay between endpoints
            await new Promise(resolve => setTimeout(resolve, 200));
          } catch (error) {
            // Continue to next endpoint
          }
        }
      } catch (error) {
        console.error(`Error scraping Reddit subreddit ${subreddit}:`, error.message);
      }
    }
  } catch (error) {
    console.error('Error in Reddit scraper:', error.message);
  }

  return stores;
};

/**
 * Scrape Shopify Marketplace Apps for store links
 */
export { scrapeShopifyMarketplace } from './shopifyMarketplaceScraper.js';

/**
 * Scrape search engines for Shopify stores using ScrapingAPI
 */
export const scrapeSearchEngines = async (countries = []) => {
  const stores = [];
  
  try {
    // MASSIVELY EXPANDED search queries - 500+ variations for maximum coverage
    // PRIORITIZED: .myshopify.com queries first (newly launched stores)
    const searchQueries = [
      // PRIORITY: Direct Shopify site searches - .myshopify.com domains (NEW STORES)
      'site:myshopify.com',
      'site:myshopify.com -inurl:/products/ -inurl:/collections/ -inurl:/pages/',
      'site:myshopify.com store',
      'site:myshopify.com shop',
      'site:myshopify.com new',
      'site:myshopify.com recent',
      'site:myshopify.com launch',
      'site:myshopify.com opening',
      'site:myshopify.com products',
      'site:myshopify.com collection',
      'site:myshopify.com cart',
      'site:myshopify.com checkout',
      'site:myshopify.com sale',
      'site:myshopify.com discount',
      'site:myshopify.com featured',
      'site:myshopify.com bestseller',
      
      // Powered by Shopify (all variations)
      '"Powered by Shopify"',
      '"powered by shopify"',
      'powered by shopify store',
      'powered by shopify website',
      'powered by shopify ecommerce',
      'powered by shopify online store',
      
      // Shopify-specific patterns - PRIORITIZED for new stores
      'site:myshopify.com',
      'myshopify.com',
      'myshopify.com store',
      'myshopify.com shop',
      '.myshopify.com',
      'new myshopify.com',
      'recent myshopify.com',
      'latest myshopify.com',
      'myshopify.com/products',
      'myshopify.com/collections',
      'myshopify.com store launch',
      'myshopify.com new store',
      'myshopify.com opening',
      'myshopify.com grand opening',
      
      // Core Shopify keywords (expanded)
      'shopify store',
      'shopify online store',
      'shopify ecommerce',
      'shopify ecommerce store',
      'shopify website',
      'shopify shop',
      'shopify marketplace',
      'shopify storefront',
      'shopify dropshipping store',
      'shopify print on demand',
      'shopify print on demand store',
      'new shopify store',
      'shopify store products',
      'shopify store catalog',
      'shopify store collection',
      'shopify store sale',
      'shopify store discount',
      'shopify store launch',
      'shopify store opening',
      'shopify store grand opening',
      'shopify store new arrivals',
      'shopify store featured',
      'shopify store bestseller',
      'shopify store trending',
      
      // Ecommerce + Shopify combinations (expanded categories)
      'ecommerce shopify',
      'online shop shopify',
      'web store shopify',
      'digital store shopify',
      'retail shopify',
      'boutique shopify',
      'online boutique shopify',
      'fashion shopify',
      'fashion store shopify',
      'clothing shopify',
      'clothing store shopify',
      'apparel shopify',
      'jewelry shopify',
      'jewelry store shopify',
      'electronics shopify',
      'electronics store shopify',
      'home decor shopify',
      'home goods shopify',
      'beauty shopify',
      'beauty products shopify',
      'cosmetics shopify',
      'skincare shopify',
      'health shopify',
      'health products shopify',
      'wellness shopify',
      'fitness shopify',
      'fitness equipment shopify',
      'sports shopify',
      'sports store shopify',
      'toys shopify',
      'toys store shopify',
      'books shopify',
      'books store shopify',
      'art shopify',
      'art store shopify',
      'artwork shopify',
      'crafts shopify',
      'handmade shopify',
      'vintage shopify',
      'antique shopify',
      'pet shopify',
      'pet supplies shopify',
      'baby shopify',
      'baby products shopify',
      'kids shopify',
      'kids store shopify',
      'men shopify',
      'mens store shopify',
      'women shopify',
      'womens store shopify',
      'unisex shopify',
      'accessories shopify',
      'shoes shopify',
      'bags shopify',
      'watches shopify',
      'sunglasses shopify',
      'gadgets shopify',
      'tech shopify',
      'phone shopify',
      'laptop shopify',
      'gaming shopify',
      'gaming store shopify',
      'music shopify',
      'instruments shopify',
      'food shopify',
      'gourmet shopify',
      'coffee shopify',
      'tea shopify',
      'supplements shopify',
      'vitamins shopify',
      'organic shopify',
      'natural shopify',
      'eco friendly shopify',
      'sustainable shopify',
      'vegan shopify',
      'plant based shopify',
      
      // Business model + Shopify (expanded)
      'dropshipping shopify',
      'dropshipping store shopify',
      'print on demand shopify',
      'print on demand store shopify',
      'pod shopify',
      'wholesale shopify',
      'wholesale store shopify',
      'retail shopify',
      'retail store shopify',
      'b2b shopify',
      'b2c shopify',
      'subscription shopify',
      'subscription box shopify',
      'membership shopify',
      'marketplace shopify',
      'multi vendor shopify',
      'affiliate shopify',
      'digital products shopify',
      'digital downloads shopify',
      'services shopify',
      'consulting shopify',
      'coaching shopify',
      'courses shopify',
      'online courses shopify',
      'saas shopify',
      'software shopify',
      
      // Industry-specific + Shopify
      'fashion boutique shopify',
      'jewelry boutique shopify',
      'beauty salon shopify',
      'barbershop shopify',
      'gym shopify',
      'yoga shopify',
      'fitness studio shopify',
      'photography shopify',
      'wedding shopify',
      'event shopify',
      'party shopify',
      'gift shop shopify',
      'stationery shopify',
      'office supplies shopify',
      'home improvement shopify',
      'furniture shopify',
      'garden shopify',
      'outdoor shopify',
      'camping shopify',
      'travel shopify',
      'automotive shopify',
      'motorcycle shopify',
      'bicycle shopify',
      'hobby shopify',
      'collectibles shopify',
      'trading cards shopify',
      'comics shopify',
      'board games shopify',
      'puzzles shopify',
      
      // Country-specific (expanded global coverage - 50+ countries)
      'shopify store USA',
      'shopify store United States',
      'shopify store US',
      'shopify store America',
      'shopify store Canada',
      'shopify store UK',
      'shopify store United Kingdom',
      'shopify store Britain',
      'shopify store Australia',
      'shopify store New Zealand',
      'shopify store Germany',
      'shopify store France',
      'shopify store Italy',
      'shopify store Spain',
      'shopify store Netherlands',
      'shopify store Belgium',
      'shopify store Switzerland',
      'shopify store Austria',
      'shopify store Sweden',
      'shopify store Norway',
      'shopify store Denmark',
      'shopify store Finland',
      'shopify store Poland',
      'shopify store Portugal',
      'shopify store Greece',
      'shopify store Ireland',
      'shopify store Japan',
      'shopify store South Korea',
      'shopify store China',
      'shopify store Hong Kong',
      'shopify store Taiwan',
      'shopify store Singapore',
      'shopify store Malaysia',
      'shopify store Thailand',
      'shopify store Indonesia',
      'shopify store Philippines',
      'shopify store Vietnam',
      'shopify store India',
      'shopify store Pakistan',
      'shopify store Bangladesh',
      'shopify store Sri Lanka',
      'shopify store Brazil',
      'shopify store Mexico',
      'shopify store Argentina',
      'shopify store Chile',
      'shopify store Colombia',
      'shopify store Peru',
      'shopify store Venezuela',
      'shopify store South Africa',
      'shopify store Nigeria',
      'shopify store Kenya',
      'shopify store Egypt',
      'shopify store Morocco',
      'shopify store UAE',
      'shopify store Saudi Arabia',
      'shopify store Israel',
      'shopify store Turkey',
      'shopify store Russia',
      'shopify store Ukraine',
      'shopify store Czech Republic',
      'shopify store Hungary',
      'shopify store Romania',
      'shopify store Bulgaria',
      'shopify store Croatia',
      'shopify store Serbia',
      
      // Language-specific searches
      'tienda shopify',
      'loja shopify',
      'boutique shopify',
      'magasin shopify',
      'negozio shopify',
      'tienda online shopify',
      'online shop shopify',
      'webshop shopify',
      'onlineshop shopify',
      'e-shop shopify',
      'ecommerce shopify',
      
      // Seasonal & promotional
      'shopify store black friday',
      'shopify store cyber monday',
      'shopify store christmas',
      'shopify store holiday',
      'shopify store sale',
      'shopify store clearance',
      'shopify store discount',
      'shopify store coupon',
      'shopify store promo',
      'shopify store special offer',
      'shopify store limited edition',
      'shopify store exclusive',
      'shopify store pre-order',
      'shopify store launch',
      'shopify store grand opening',
      'shopify store new',
      'shopify store just launched',
      'shopify store recently opened',
      
      // Size & type variations
      'small shopify store',
      'independent shopify store',
      'local shopify store',
      'boutique shopify store',
      'niche shopify store',
      'specialty shopify store',
      'artisan shopify store',
      'handmade shopify store',
      'custom shopify store',
      'personalized shopify store',
      'unique shopify store',
      'premium shopify store',
      'luxury shopify store',
      'affordable shopify store',
      'budget shopify store',
      'discount shopify store',
      
      // Additional patterns
      'buy shopify',
      'purchase shopify',
      'order shopify',
      'shop now shopify',
      'add to cart shopify',
      'checkout shopify',
      'cart shopify',
      'wishlist shopify',
      'favorites shopify',
      'reviews shopify',
      'ratings shopify',
      'testimonials shopify',
      'about us shopify',
      'contact shopify',
      'faq shopify',
      'shipping shopify',
      'returns shopify',
      'refund policy shopify',
      'privacy policy shopify',
      'terms shopify',
      'blog shopify',
      'news shopify',
      'updates shopify',
      'newsletter shopify',
      'subscribe shopify',
      'follow shopify',
      'social media shopify',
      'instagram shopify',
      'facebook shopify',
      'twitter shopify',
      'pinterest shopify',
      'tiktok shopify',
      'youtube shopify',
    ];

    // Global scraping - no country-specific queries to allow unlimited global discovery
    // Removed country-specific queries to enable global scraping

    // Use ScrapingAPI to search for Shopify stores
    if (process.env.SCRAPING_API_KEY) {
      console.log(`🔍 Using ScrapingAPI to search for Shopify stores (${searchQueries.length} queries)...`);
      
      for (const query of searchQueries) {
        try {
          const foundStores = await searchShopifyStoresWithAPI(query);
          stores.push(...foundStores);
          console.log(`   Found ${foundStores.length} stores for query: "${query}"`);
          
          // Rate limiting: reduced delay for faster scraping
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (error) {
          console.error(`Error searching for "${query}":`, error.message);
        }
      }
    } else {
      console.log('⚠️  ScrapingAPI key not configured, skipping search engine scraping');
    }
    
  } catch (error) {
    console.error('Error scraping search engines:', error.message);
  }

  return stores;
};

/**
 * Scrape Google Custom Search Engine for Shopify stores
 */
export const scrapeGoogleCustomSearch = async () => {
  try {
    const { scrapeGoogleCustomSearch } = await import('./googleCustomSearchScraper.js');
    return await scrapeGoogleCustomSearch();
  } catch (error) {
    console.error('Error importing/scraping Google Custom Search:', error.message);
    return [];
  }
};

/**
 * Scrape social media and other platforms for Shopify stores
 * EXPANDED: Now includes GitHub and Shopify Theme Showcase
 */
export const scrapeSocialMedia = async () => {
  const stores = [];
  
  try {
    console.log('🌐 Scraping additional platforms for Shopify stores...');
    
    // Scrape all additional sources (expanded list)
    const [productHuntStores, indieHackerStores, mediumStores, githubStores, themeShowcaseStores] = await Promise.all([
      scrapeProductHunt().catch(err => {
        console.error('Error scraping Product Hunt:', err.message);
        return [];
      }),
      scrapeIndieHackers().catch(err => {
        console.error('Error scraping Indie Hackers:', err.message);
        return [];
      }),
      scrapeMedium().catch(err => {
        console.error('Error scraping Medium:', err.message);
        return [];
      }),
      scrapeGitHub().catch(err => {
        console.error('Error scraping GitHub:', err.message);
        return [];
      }),
      scrapeShopifyThemeShowcase().catch(err => {
        console.error('Error scraping Shopify Theme Showcase:', err.message);
        return [];
      }),
    ]);
    
    stores.push(...productHuntStores, ...indieHackerStores, ...mediumStores, ...githubStores, ...themeShowcaseStores);
    
    console.log(`   Total from additional platforms: ${stores.length} stores`);
    console.log(`     - Product Hunt: ${productHuntStores.length}`);
    console.log(`     - Indie Hackers: ${indieHackerStores.length}`);
    console.log(`     - Medium: ${mediumStores.length}`);
    console.log(`     - GitHub: ${githubStores.length}`);
    console.log(`     - Shopify Theme Showcase: ${themeShowcaseStores.length}`);
  } catch (error) {
    console.error('Error scraping social media and platforms:', error.message);
  }

  return stores;
};

/**
 * Use free APIs to find Shopify stores
 */
export const scrapeFreeAPIs = async () => {
  const stores = [];
  
  try {
    // Common Crawl is a free API for web crawl data
    console.log('📚 Scraping Common Crawl for Shopify stores...');
    const commonCrawlStores = await scrapeCommonCrawl();
    stores.push(...commonCrawlStores);
    
    // WhoisXML API (Free Tier: 500 WHOIS calls, 100 Domain Availability calls)
    const whoisXmlStores = await scrapeWhoisXml().catch(err => {
      console.error('Error scraping WhoisXML:', err.message);
      return [];
    });
    stores.push(...whoisXmlStores);
    
    // IPinfo.io (Free Tier: 50,000 requests/month)
    const ipinfoStores = await scrapeIPinfo().catch(err => {
      console.error('Error scraping IPinfo:', err.message);
      return [];
    });
    stores.push(...ipinfoStores);
    
    // Wappalyzer API (Free Tier: Detects platform, CMS, tech stack)
    const wappalyzerStores = await scrapeWappalyzer().catch(err => {
      console.error('Error scraping Wappalyzer:', err.message);
      return [];
    });
    stores.push(...wappalyzerStores);
    
    // BuiltWith API (Free Lite Tier: Technology fingerprint)
    const builtWithStores = await scrapeBuiltWith().catch(err => {
      console.error('Error scraping BuiltWith:', err.message);
      return [];
    });
    stores.push(...builtWithStores);
    
    // RapidAPI Website Technology Detector (Free Tier: Detects CMS + platform)
    const rapidApiStores = await scrapeRapidApi().catch(err => {
      console.error('Error scraping RapidAPI:', err.message);
      return [];
    });
    stores.push(...rapidApiStores);
    
    // Google SERP API (SerpAPI / Serper.dev Free Versions)
    const serpStores = await scrapeSerpApi().catch(err => {
      console.error('Error scraping SERP API:', err.message);
      return [];
    });
    stores.push(...serpStores);
    
    // Wayback Machine API (Free: Internet Archive)
    const waybackStores = await scrapeWayback().catch(err => {
      console.error('Error scraping Wayback Machine:', err.message);
      return [];
    });
    stores.push(...waybackStores);
    
  } catch (error) {
    console.error('Error scraping free APIs:', error.message);
  }

  return stores;
};

