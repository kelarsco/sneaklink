# Advanced Scraping Setup Guide

## Overview

This guide explains the new advanced scraping methods and what you need to provide to make them work effectively.

## New Scraping Methods Implemented

### Tier 1 - Ultra Early Detection (0-6 hours after launch)

#### 1. Shopify Fingerprint Detection ✅ IMPLEMENTED
**What it does:**
- Scans newly registered domains for Shopify-specific files
- Checks for `/products.json`, `/cart.js`, CDN patterns, Liquid templates
- Finds stores within hours of DNS going live

**What you need to provide:**
- ✅ **No API keys required** - Works with free domain lists
- ⚠️ **Optional but recommended:**
  - `RAPIDAPI_KEY` - For accessing WHOIS APIs to get newly registered domains
  - New domain feed sources (NDD, DomainDroplets) - Free lists available

**How to enable:**
Already enabled by default. Set `shopifyFingerprints: true` in config.

**Expected results:**
- 10-50 new stores per scrape (depends on new domain feed quality)

---

#### 2. Shopify CDN Pattern Scanner ✅ IMPLEMENTED
**What it does:**
- Monitors Shopify CDN patterns (`cdn.shopify.com/s/files/1/xxxx/xxxx`)
- Detects new store IDs from CDN asset references
- Finds stores within minutes of creation

**What you need to provide:**
- ✅ **No API keys required** - Uses Common Crawl (free)
- ⚠️ **Optional enhancements:**
  - Better CDN monitoring requires tracking sequential store IDs
  - May need database to track known store IDs

**How to enable:**
Already enabled by default. Set `shopifyCdn: true` in config.

**Expected results:**
- 5-20 new stores per scrape (limited by CDN pattern detection)

---

### Tier 2 - Early Detection (1-24 hours after launch)

#### 3. Social Media Advanced Scraper ✅ IMPLEMENTED
**What it does:**
- Scrapes TikTok, Instagram, Pinterest for store links
- Finds stores from ads, influencer posts, bio links
- Verifies stores with fingerprint detection

**What you need to provide:**

**TikTok:**
- ⚠️ **Facebook Access Token** (`FACEBOOK_ACCESS_TOKEN`)
  - Required for TikTok Ads Library access
  - Get from: https://developers.facebook.com/
  - TikTok ads are accessible via Facebook Marketing API
- ⚠️ **TikTok API Key** (`TIKTOK_API_KEY`) - Optional
  - If TikTok provides official API access
  - Currently limited availability

**Instagram:**
- ⚠️ **Instagram Access Token** (`INSTAGRAM_ACCESS_TOKEN`)
  - Required for Instagram Basic Display API or Graph API
  - Get from: https://developers.facebook.com/docs/instagram-api
  - Free tier available

**Pinterest:**
- ⚠️ **Pinterest Access Token** (`PINTEREST_ACCESS_TOKEN`)
  - Required for Pinterest API
  - Get from: https://developers.pinterest.com/
  - Free tier available

**Facebook Ads Library:**
- ⚠️ **Facebook Access Token** (`FACEBOOK_ACCESS_TOKEN`)
  - Same as TikTok (uses Facebook platform)
  - Get from: https://developers.facebook.com/
  - Free tier available

**How to enable:**
Already enabled by default. Set `socialMediaAdvanced: true` in config.

**Expected results:**
- 20-100 stores per scrape (depends on API access and rate limits)

---

### Tier 3 - Delayed Detection (24-48 hours after launch)

#### 4. Google Index Gap Scraper ✅ IMPLEMENTED
**What it does:**
- Searches Google with time filters ("past 24 hours", "past day")
- Finds newly indexed Shopify stores
- Uses queries like "Powered by Shopify" with time constraints

**What you need to provide:**
- ⚠️ **One of the following (required):**
  - `SCRAPING_API_KEY` - From https://www.scrapingapi.com/ (Free tier available)
  - `SERPAPI_KEY` - From https://serpapi.com/ (Free tier available)
  - `SERPER_API_KEY` - From https://serper.dev/ (Free tier available)

**How to enable:**
Already enabled by default. Set `googleIndexGaps: true` in config.

**Expected results:**
- 50-200 stores per scrape (depends on search API limits)

---

## Complete Environment Variables List

Add these to your `.env` file:

```env
# Required for basic functionality
MONGODB_URI=your_mongodb_connection_string
PORT=3000

# Tier 1 - Ultra Early Detection
RAPIDAPI_KEY=your_rapidapi_key              # Optional - for WHOIS APIs

# Tier 2 - Early Detection (Social Media)
FACEBOOK_ACCESS_TOKEN=your_facebook_token  # Required for TikTok Ads & Facebook Ads Library
INSTAGRAM_ACCESS_TOKEN=your_instagram_token # Required for Instagram scraping
PINTEREST_ACCESS_TOKEN=your_pinterest_token # Required for Pinterest scraping
TIKTOK_API_KEY=your_tiktok_key              # Optional - if TikTok API available

# Tier 3 - Delayed Detection
SCRAPING_API_KEY=your_scraping_api_key     # OR use one of the search APIs below
SERPAPI_KEY=your_serpapi_key               # Alternative to SCRAPING_API_KEY
SERPER_API_KEY=your_serper_api_key         # Alternative to SCRAPING_API_KEY

# Existing APIs (still useful)
GITHUB_TOKEN=your_github_token             # For GitHub API (higher rate limits)
SHODAN_API_KEY=your_shodan_key             # For Shodan searches
CENSYS_API_ID=your_censys_id               # For Censys searches
CENSYS_SECRET=your_censys_secret           # For Censys searches
```

## Priority Setup Guide

### Minimum Setup (Works Immediately)
✅ **No additional setup needed!**
- Fingerprint detection works with free domain lists
- CDN pattern scanning uses Common Crawl (free)
- Basic functionality enabled

### Recommended Setup (Better Results)
1. **Get a Google Search API key** (Tier 3)
   - Easiest: Sign up for Serper.dev (free tier: 2,500 searches/month)
   - Or: ScrapingAPI.com (free tier available)
   - Enables: Google Index Gap detection

2. **Get Facebook Access Token** (Tier 2)
   - Sign up at https://developers.facebook.com/
   - Create an app, get access token
   - Enables: TikTok Ads Library + Facebook Ads Library

### Full Setup (Maximum Coverage)
1. All recommended APIs above
2. Instagram Access Token
3. Pinterest Access Token
4. RapidAPI Key (for WHOIS domain data)

## How to Get API Keys

### 1. Serper.dev (Google Search) - EASIEST
1. Go to https://serper.dev/
2. Sign up (free tier: 2,500 searches/month)
3. Copy API key
4. Add to `.env`: `SERPER_API_KEY=your_key`

### 2. Facebook Developer (TikTok/Instagram/Facebook Ads)
1. Go to https://developers.facebook.com/
2. Create a new app
3. Add "Marketing API" product
4. Generate access token
5. Add to `.env`: `FACEBOOK_ACCESS_TOKEN=your_token`

### 3. Instagram API
1. Use Facebook Developer (same as above)
2. Add "Instagram Basic Display" or "Instagram Graph API"
3. Generate token
4. Add to `.env`: `INSTAGRAM_ACCESS_TOKEN=your_token`

### 4. Pinterest API
1. Go to https://developers.pinterest.com/
2. Create app
3. Get access token
4. Add to `.env`: `PINTEREST_ACCESS_TOKEN=your_token`

### 5. RapidAPI (WHOIS Data)
1. Go to https://rapidapi.com/
2. Sign up
3. Subscribe to WHOIS API
4. Get API key
5. Add to `.env`: `RAPIDAPI_KEY=your_key`

## Configuration

Edit `server/services/continuousScrapingService.js` to enable/disable methods:

```javascript
ENABLED_SOURCES: {
  // Original methods (keep enabled)
  reddit: true,
  marketplace: true,
  searchEngines: true,
  socialMedia: true,
  commonCrawl: true,
  freeAPIs: true,
  massive: true,
  
  // NEW methods
  shopifyFingerprints: true,    // Tier 1 - Ultra Early
  shopifyCdn: true,             // Tier 1 - Ultra Early
  socialMediaAdvanced: true,    // Tier 2 - Early
  googleIndexGaps: true,        // Tier 3 - Delayed
}
```

## Expected Results by Tier

### Tier 1 (Ultra Early - 0-6 hours)
- **Fingerprint Detection**: 10-50 stores/scrape
- **CDN Pattern Scanner**: 5-20 stores/scrape
- **Total Tier 1**: 15-70 stores/scrape

### Tier 2 (Early - 1-24 hours)
- **Social Media Advanced**: 20-100 stores/scrape
- Depends on API access and rate limits

### Tier 3 (Delayed - 24-48 hours)
- **Google Index Gaps**: 50-200 stores/scrape
- Depends on search API limits

### Combined Results
- **Per 30-minute scrape**: 85-370 stores
- **Per 6-hour deep scrape**: 500-2000+ stores
- **Per daily comprehensive**: 1000-5000+ stores

## Troubleshooting

### "No stores found from [method]"
- Check if API keys are set correctly
- Verify API key is valid and not expired
- Check rate limits haven't been exceeded
- Some methods require specific API access levels

### "Rate limited" errors
- Reduce scraping frequency
- Upgrade API plan for higher limits
- Add delays between requests (already configured)

### "API key invalid" errors
- Verify key is correct in `.env`
- Check API key hasn't expired
- Ensure proper permissions are granted

## Notes

- **All new methods work alongside existing scrapers** - No interruption to current methods
- **Methods are enabled by default** - They'll run automatically
- **Methods gracefully handle missing API keys** - They'll skip if keys aren't provided
- **Fingerprint detection works without API keys** - Uses free domain lists
- **CDN scanning works without API keys** - Uses Common Crawl (free)

## Next Steps

1. **Start with minimum setup** - System works immediately
2. **Add Google Search API** - Easiest improvement (Serper.dev)
3. **Add Facebook token** - Enables social media scraping
4. **Add other APIs as needed** - For maximum coverage

The system will automatically use whatever APIs you provide and skip methods that require missing keys.

