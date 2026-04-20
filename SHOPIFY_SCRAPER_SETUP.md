# Shopify Store Scraper Setup

## Overview

This system automatically scrapes Shopify stores every 20 minutes, focusing on `.myshopify.com` domains and excluding big brands.

## Features

✅ **Automatic Scraping** - Runs every 20 minutes  
✅ **Focused on .myshopify.com** - Only scrapes Shopify subdomains  
✅ **Big Brand Filter** - Excludes known large brands  
✅ **Multiple Sources** - Reddit, Global Search, WHOISXML  
✅ **7-Stage Detection** - Full validation and categorization  
✅ **No Limits** - Scrapes as many stores as found  

## Scraping Sources

### 1. Reddit Scraper
- Scrapes Shopify-related subreddits:
  - r/shopify
  - r/ecommerce
  - r/dropship
  - r/dropshipping
  - r/printondemand
  - r/entrepreneur
  - r/startups
  - r/sideproject
  - r/indiebiz
  - r/smallbusiness
  - r/onlineselling
  - r/shopifystores

- Extracts URLs from posts and comments
- Filters for `.myshopify.com` domains only
- Excludes big brands

### 2. Global Search Scraper
- Uses multiple search APIs:
  - Google Custom Search Engine (if `GOOGLE_CSE_API_KEY` configured)
  - SerpAPI (if `SERPAPI_KEY` configured)
  - Serper.dev (if `SERPER_API_KEY` configured)

- Search queries:
  - `site:myshopify.com`
  - `site:myshopify.com store`
  - `site:myshopify.com shop`
  - `site:myshopify.com products`
  - `site:myshopify.com collection`
  - `site:myshopify.com dropshipping`
  - `site:myshopify.com print on demand`
  - `site:myshopify.com ecommerce`
  - `site:myshopify.com online store`
  - `site:myshopify.com -shopify.com -shopify.dev` (excludes Shopify's own domains)

### 3. WHOISXML Scraper
- Uses Certificate Transparency API to find `.myshopify.com` domains
- Finds all SSL certificates issued for Shopify stores
- Verifies domains are active Shopify stores

## Configuration

### Required Environment Variables

Add to `server/.env`:

```env
# WHOISXML API (for Certificate Transparency)
WHOISXML_API_KEY=at_XXXXXXXXXXXXXXXXXXXXX

# Google Custom Search (optional but recommended)
GOOGLE_CSE_API_KEY=your_google_cse_api_key
GOOGLE_CSE_ID=your_search_engine_id

# SerpAPI (optional alternative)
SERPAPI_KEY=your_serpapi_key

# Serper.dev (optional alternative)
SERPER_API_KEY=your_serper_api_key
```

### API Setup Instructions

#### WHOISXML API
1. Sign up at https://whoisxmlapi.com/
2. Get your API key from dashboard
3. Free tier: 500 WHOIS calls, 100 Domain Availability calls
4. Add to `.env`: `WHOISXML_API_KEY=at_XXXXXXXXXXXXXXXXXXXXX`

#### Google Custom Search Engine
1. Create Custom Search Engine: https://programmablesearchengine.google.com/
2. Get API Key: https://console.cloud.google.com/apis/credentials
3. Get Search Engine ID (CX) from CSE settings
4. Free tier: 100 queries/day
5. Add to `.env`:
   ```
   GOOGLE_CSE_API_KEY=your_key
   GOOGLE_CSE_ID=your_cx_id
   ```

#### SerpAPI (Alternative)
1. Sign up at https://serpapi.com/
2. Get API key from dashboard
3. Free tier: 100 searches/month
4. Add to `.env`: `SERPAPI_KEY=your_key`

#### Serper.dev (Alternative)
1. Sign up at https://serper.dev/
2. Get API key from dashboard
3. Free tier: 2,500 searches/month
4. Add to `.env`: `SERPER_API_KEY=your_key`

## How It Works

1. **Scheduler** - Runs every 20 minutes automatically
2. **Scraping** - Collects stores from all sources
3. **Deduplication** - Removes duplicate URLs
4. **Database Check** - Skips stores already in database
5. **7-Stage Detection** - Validates and categorizes each store:
   - Stage 1: Shopify detection
   - Stage 2: Activity check
   - Stage 3: Save store
   - Stage 4: Country detection
   - Stage 5: Theme detection
   - Stage 6: Ad detection
   - Stage 7: Business model detection
6. **Save** - Stores that pass all checks are saved

## Big Brand Exclusion

The system automatically excludes these big brands:
- shopify.com, shopify.dev, shopifypartners.com
- allbirds, gymshark, kyliecosmetics, fashionnova
- colourpop, glossier, mvmt, brooklinen
- away, warbyparker, casper, dollar shave club
- bombas, everlane, reformation
- And more...

## Scheduling

- **Initial Scrape**: 30 seconds after server startup
- **Regular Scraping**: Every 20 minutes
- **Automatic**: No manual intervention needed

## Monitoring

Check server logs to see scraping progress:

```
🚀 Starting Shopify Store Scraping Job
📡 Scraping from multiple sources...
🔍 Reddit: Scraping Shopify store links...
🔍 Global Search: Searching for Shopify stores...
🔍 WHOISXML: Searching for Shopify stores via Certificate Transparency...
✅ Found 45 unique Shopify stores to process
🔄 Processing stores through 7-stage detection...
[1/45] Processing: https://store.myshopify.com
   ✅ Saved: Store Name
📊 Scraping Job Complete
   Found: 45
   Processed: 45
   Saved: 38
   Rejected: 7
   Errors: 0
```

## Manual Trigger

You can also manually trigger a scraping job:

```bash
# Via API (requires authentication)
POST /api/stores/scrape
{
  "url": "https://store.myshopify.com",
  "source": "manual"
}
```

Or use the service directly:

```javascript
import { runShopifyStoreScraping } from './services/shopifyStoreScraper.js';
await runShopifyStoreScraping();
```

## Rate Limiting

The system includes built-in rate limiting:
- 1-2 second delays between API requests
- Respects API quotas
- Handles rate limit errors gracefully

## Troubleshooting

### No stores found
- Check API keys are configured correctly
- Verify API quotas haven't been exceeded
- Check server logs for errors

### Stores being rejected
- Check if stores are actually Shopify stores
- Verify stores aren't password protected
- Ensure stores are active (not dead)

### Rate limit errors
- Increase delays between requests
- Check API quotas
- Use multiple API keys if available

## Notes

- The system focuses on `.myshopify.com` domains only
- Big brands are automatically excluded
- Stores are validated through 7-stage detection
- Only active, non-password-protected stores are saved
- The system runs continuously without manual intervention
