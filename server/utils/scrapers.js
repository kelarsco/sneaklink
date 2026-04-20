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
// Import new comprehensive scrapers
import { scrapeDiscord, scrapeDiscordInvites } from './discordScraper.js';
import { scrapeTelegram, scrapeTelegramDirectories } from './telegramScraper.js';
import { scrapeYouTube, scrapeYouTubeChannels } from './youtubeScraper.js';
import { scrapeLinkedIn, scrapeLinkedInArticles } from './linkedinScraper.js';
import { scrapeForums, scrapeEcommerceForums, scrapeStartupForums } from './forumScraper.js';
import { scrapeAppStores, scrapeShopifyAppCaseStudies, scrapeReviewSites } from './appStoreScraper.js';
import { generatePotentialDomains, discoverViaDNS, discoverViaSSLCertificates } from './domainGenerator.js';
import { scrapeCompetitorAnalysis, scrapeEcommerceAwards, scrapeMarketplaceShowcases } from './competitorScraper.js';

/**
 * Scrape Reddit for Shopify store links
 */
export const scrapeReddit = async () => {
  const stores = [];
  const subreddits = [
    'shopify',
    'ecommerce',
    'dropship',
    'printondemand',
    'entrepreneur',
  ];

  try {
    for (const subreddit of subreddits) {
      try {
        // Using Reddit JSON API
        const response = await axios.get(
          `https://www.reddit.com/r/${subreddit}/hot.json?limit=100`,
          {
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; SneakLinkBot/1.0)',
            },
            timeout: 10000,
          }
        );

        const posts = response.data?.data?.children || [];
        
        for (const post of posts) {
          const text = (post.data?.selftext || '') + ' ' + (post.data?.title || '');
          const urlRegex = /(https?:\/\/[^\s]+)/g;
          const urls = text.match(urlRegex) || [];
          
          for (const url of urls) {
            // Quick pre-filter: Only collect URLs that look like Shopify stores
            if (looksLikeShopifyStore(url)) {
              stores.push({
                url: url.trim(),
                source: 'Reddit',
              });
            }
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
    // EXPANDED search queries for maximum coverage - thousands of variations
    const searchQueries = [
      // Direct Shopify site searches
      'site:myshopify.com',
      'site:myshopify.com store',
      'site:myshopify.com shop',
      'site:myshopify.com products',
      'site:myshopify.com collection',
      'site:myshopify.com cart',
      'site:myshopify.com checkout',
      
      // Shopify store keywords
      'shopify store',
      'shopify online store',
      'shopify ecommerce',
      'shopify dropshipping store',
      'shopify print on demand',
      'new shopify store',
      'shopify store products',
      'shopify store catalog',
      'shopify store collection',
      'shopify store sale',
      'shopify store discount',
      
      // Powered by Shopify
      '"Powered by Shopify"',
      '"powered by shopify"',
      'powered by shopify store',
      
      // Shopify-specific patterns
      'myshopify.com',
      'myshopify.com store',
      'myshopify.com shop',
      '.myshopify.com',
      
      // Ecommerce + Shopify combinations
      'ecommerce shopify',
      'online shop shopify',
      'web store shopify',
      'digital store shopify',
      'retail shopify',
      'boutique shopify',
      'fashion shopify',
      'clothing shopify',
      'jewelry shopify',
      'electronics shopify',
      'home decor shopify',
      'beauty shopify',
      'health shopify',
      'fitness shopify',
      'sports shopify',
      'toys shopify',
      'books shopify',
      'art shopify',
      'crafts shopify',
      
      // Business model + Shopify
      'dropshipping shopify',
      'print on demand shopify',
      'wholesale shopify',
      'retail shopify',
      'b2b shopify',
      'b2c shopify',
      
      // Country-specific (global coverage)
      'shopify store USA',
      'shopify store United States',
      'shopify store Canada',
      'shopify store UK',
      'shopify store United Kingdom',
      'shopify store Australia',
      'shopify store New Zealand',
      'shopify store Germany',
      'shopify store France',
      'shopify store Italy',
      'shopify store Spain',
      'shopify store Netherlands',
      'shopify store Sweden',
      'shopify store Norway',
      'shopify store Denmark',
      'shopify store Japan',
      'shopify store South Korea',
      'shopify store Singapore',
      'shopify store India',
      'shopify store Brazil',
      'shopify store Mexico',
      'shopify store Argentina',
      'shopify store South Africa',
      'shopify store UAE',
      'shopify store Saudi Arabia',
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
 * Combines multiple sources: Product Hunt, Indie Hackers, Medium
 */
export const scrapeSocialMedia = async () => {
  const stores = [];
  
  try {
    console.log('🌐 Scraping additional platforms for Shopify stores...');
    
    // Scrape all additional sources
    const [productHuntStores, indieHackerStores, mediumStores] = await Promise.all([
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
    ]);
    
    stores.push(...productHuntStores, ...indieHackerStores, ...mediumStores);
    
    console.log(`   Total from additional platforms: ${stores.length} stores`);
    console.log(`     - Product Hunt: ${productHuntStores.length}`);
    console.log(`     - Indie Hackers: ${indieHackerStores.length}`);
    console.log(`     - Medium: ${mediumStores.length}`);
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
    
    // NEW: Comprehensive discovery methods
    console.log('\n🚀 Starting comprehensive discovery methods...');
    
    // Discord Communities and Invites
    const discordStores = await scrapeDiscord().catch(err => {
      console.error('Error scraping Discord:', err.message);
      return [];
    });
    stores.push(...discordStores);
    
    const discordInviteStores = await scrapeDiscordInvites().catch(err => {
      console.error('Error scraping Discord invites:', err.message);
      return [];
    });
    stores.push(...discordInviteStores);
    
    // Telegram Channels and Directories
    const telegramStores = await scrapeTelegram().catch(err => {
      console.error('Error scraping Telegram:', err.message);
      return [];
    });
    stores.push(...telegramStores);
    
    const telegramDirStores = await scrapeTelegramDirectories().catch(err => {
      console.error('Error scraping Telegram directories:', err.message);
      return [];
    });
    stores.push(...telegramDirStores);
    
    // YouTube Videos and Channels
    const youtubeStores = await scrapeYouTube().catch(err => {
      console.error('Error scraping YouTube:', err.message);
      return [];
    });
    stores.push(...youtubeStores);
    
    const youtubeChannelStores = await scrapeYouTubeChannels().catch(err => {
      console.error('Error scraping YouTube channels:', err.message);
      return [];
    });
    stores.push(...youtubeChannelStores);
    
    // LinkedIn Profiles and Articles
    const linkedinStores = await scrapeLinkedIn().catch(err => {
      console.error('Error scraping LinkedIn:', err.message);
      return [];
    });
    stores.push(...linkedinStores);
    
    const linkedinArticleStores = await scrapeLinkedInArticles().catch(err => {
      console.error('Error scraping LinkedIn articles:', err.message);
      return [];
    });
    stores.push(...linkedinArticleStores);
    
    // Forums and Communities
    const forumStores = await scrapeForums().catch(err => {
      console.error('Error scraping forums:', err.message);
      return [];
    });
    stores.push(...forumStores);
    
    const ecommerceForumStores = await scrapeEcommerceForums().catch(err => {
      console.error('Error scraping e-commerce forums:', err.message);
      return [];
    });
    stores.push(...ecommerceForumStores);
    
    const startupForumStores = await scrapeStartupForums().catch(err => {
      console.error('Error scraping startup forums:', err.message);
      return [];
    });
    stores.push(...startupForumStores);
    
    // App Stores and Case Studies
    const appStoreStores = await scrapeAppStores().catch(err => {
      console.error('Error scraping app stores:', err.message);
      return [];
    });
    stores.push(...appStoreStores);
    
    const caseStudyStores = await scrapeShopifyAppCaseStudies().catch(err => {
      console.error('Error scraping app case studies:', err.message);
      return [];
    });
    stores.push(...caseStudyStores);
    
    const reviewSiteStores = await scrapeReviewSites().catch(err => {
      console.error('Error scraping review sites:', err.message);
      return [];
    });
    stores.push(...reviewSiteStores);
    
    // Domain Generation and Discovery
    const domainGenStores = await generatePotentialDomains().catch(err => {
      console.error('Error generating domains:', err.message);
      return [];
    });
    stores.push(...domainGenStores);
    
    const dnsStores = await discoverViaDNS().catch(err => {
      console.error('Error discovering via DNS:', err.message);
      return [];
    });
    stores.push(...dnsStores);
    
    const sslStores = await discoverViaSSLCertificates().catch(err => {
      console.error('Error discovering via SSL certificates:', err.message);
      return [];
    });
    stores.push(...sslStores);
    
    // Competitor Analysis and Awards
    const competitorStores = await scrapeCompetitorAnalysis().catch(err => {
      console.error('Error scraping competitor analysis:', err.message);
      return [];
    });
    stores.push(...competitorStores);
    
    const awardStores = await scrapeEcommerceAwards().catch(err => {
      console.error('Error scraping e-commerce awards:', err.message);
      return [];
    });
    stores.push(...awardStores);
    
    const marketplaceStores = await scrapeMarketplaceShowcases().catch(err => {
      console.error('Error scraping marketplace showcases:', err.message);
      return [];
    });
    stores.push(...marketplaceStores);
    
  } catch (error) {
    console.error('Error in comprehensive discovery:', error.message);
  }

  return stores;
};

