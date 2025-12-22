# Google Custom Search Engine (CSE) API Implementation ✅

## Status: **FULLY IMPLEMENTED**

The Google Custom Search Engine API integration has been fully implemented and is ready to use!

## 📋 Overview

The Google Custom Search API allows you to programmatically search Google using a custom search engine. This is useful for finding Shopify stores through targeted searches.

## 🚀 Setup Instructions

### 1. Create a Custom Search Engine

1. Visit: https://programmablesearchengine.google.com/
2. Click "Add" to create a new search engine
3. Configure your search engine:
   - **Sites to search**: Leave empty or add specific sites (e.g., `myshopify.com/*`)
   - **Name**: Give it a name (e.g., "Shopify Store Finder")
4. Click "Create"
5. Click "Control Panel" to access settings

### 2. Get Your Search Engine ID (CX)

1. In the Control Panel, go to "Setup" → "Basics"
2. Find your **Search engine ID** (also called CX)
3. Copy this ID - you'll need it for the `.env` file

### 3. Get Your API Key

1. Visit: https://console.cloud.google.com/apis/credentials
2. Create a new project or select an existing one
3. Enable the **Custom Search API**:
   - Go to "APIs & Services" → "Library"
   - Search for "Custom Search API"
   - Click "Enable"
4. Create credentials:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "API Key"
   - Copy the API key

### 4. Configure Environment Variables

Add to your `server/.env` file:

```env
# Google Custom Search Engine API
GOOGLE_CSE_API_KEY=your_api_key_here
GOOGLE_CSE_ID=your_search_engine_id_here
```

## 📊 API Limits

- **Free Tier**: 100 queries per day
- **Paid Tier**: Up to 10,000 queries per day
- **Rate Limit**: 1 request per second (enforced in code)

## 🎯 Features

### Implemented Features

✅ **Multi-Query Search**
- Searches 20+ optimized queries for finding Shopify stores
- Includes site-specific searches (`site:myshopify.com`)
- Includes keyword searches (`shopify store`, `online store`, etc.)
- Includes country-specific searches

✅ **Pagination Support**
- Automatically paginates through search results
- Fetches up to 100 results per query
- Handles Google's 10-results-per-page limit

✅ **Rate Limiting**
- 1 second delay between requests
- Automatic handling of rate limit errors
- Graceful error handling

✅ **Deduplication**
- Removes duplicate URLs within the same scrape
- Integrates with database deduplication

✅ **Shopify Store Filtering**
- Automatically filters results to only Shopify stores
- Uses `looksLikeShopifyStore()` validation

✅ **Integration**
- Integrated into continuous scraping service
- Runs automatically every 30 minutes (if enabled)
- Included in deep scraping (every 6 hours)
- Included in daily comprehensive scrape (2 AM)

## 📝 Usage

### Automatic Usage

The scraper runs automatically as part of the continuous scraping service. No manual intervention needed!

### Manual Usage

You can also use it programmatically:

```javascript
import { scrapeGoogleCustomSearch } from './utils/googleCustomSearchScraper.js';

// Scrape Google CSE for Shopify stores
const stores = await scrapeGoogleCustomSearch();
console.log(`Found ${stores.length} stores`);
```

### Search with Specific Query

```javascript
import { searchGoogleCSEByQuery } from './utils/googleCustomSearchScraper.js';

// Search with a specific query
const stores = await searchGoogleCSEByQuery('site:myshopify.com', 50);
```

### Get Search Statistics

```javascript
import { getGoogleCSEStats } from './utils/googleCustomSearchScraper.js';

// Get statistics for a query
const stats = await getGoogleCSEStats('site:myshopify.com');
console.log(`Total results: ${stats.totalResults}`);
```

## 🔍 Search Queries Used

The scraper uses the following optimized queries:

1. `site:myshopify.com`
2. `site:myshopify.com store`
3. `site:myshopify.com shop`
4. `site:myshopify.com products`
5. `"Powered by Shopify"`
6. `"shopify-section"`
7. `myshopify.com`
8. `shopify store`
9. `shopify online store`
10. `shopify ecommerce`
11. `new shopify store`
12. `shopify dropshipping store`
13. Country-specific searches (US, Canada, UK, Australia, etc.)
14. Product-focused searches

## ⚙️ Configuration

### Enable/Disable in Continuous Scraping

The Google CSE scraper is automatically enabled when:
- `searchEngines` source is enabled (default: `true`)
- `GOOGLE_CSE_API_KEY` is set
- `GOOGLE_CSE_ID` is set

To disable, either:
1. Remove the environment variables, or
2. Set `ENABLED_SOURCES.searchEngines = false` in `continuousScrapingService.js`

## 🐛 Troubleshooting

### Error: "API credentials not configured"
- Make sure `GOOGLE_CSE_API_KEY` and `GOOGLE_CSE_ID` are set in `server/.env`
- Restart the server after adding environment variables

### Error: "Rate limit exceeded"
- You've hit the 100 queries/day free tier limit
- Wait 24 hours or upgrade to paid tier
- The scraper will automatically wait and retry

### Error: "Access denied" or "403"
- Check that your API key is valid
- Make sure Custom Search API is enabled in Google Cloud Console
- Verify your API key has the correct permissions

### Error: "Invalid request" or "400"
- Check that your Search Engine ID (CX) is correct
- Verify the search engine is active in Google CSE Control Panel

### No Results Found
- This is normal if all stores have already been scraped
- Try different search queries
- Check that your search engine is configured to search the web (not just specific sites)

## 📊 Expected Output

When running, you'll see logs like:

```
🔍 Scraping Google Custom Search Engine for Shopify stores...
   Processing 20 search queries...
   [1/20] Searching: "site:myshopify.com"...
      ✅ Found 15 stores (15 total unique)
   [2/20] Searching: "shopify store"...
      ✅ Found 8 stores (23 total unique)
   ...
   ✅ Found 45 unique Shopify stores from Google Custom Search
```

## ✅ Integration Status

- ✅ Scraper implementation complete
- ✅ Integrated into `scrapers.js`
- ✅ Integrated into continuous scraping service
- ✅ Environment variables documented in `env.template`
- ✅ Error handling and rate limiting implemented
- ✅ Deduplication integrated
- ✅ Shopify store filtering implemented

## 📚 Additional Resources

- [Google Custom Search API Documentation](https://developers.google.com/custom-search/v1/overview)
- [Custom Search Engine Control Panel](https://programmablesearchengine.google.com/)
- [Google Cloud Console](https://console.cloud.google.com/)

---

**Last Updated**: 2025-01-12  
**Status**: ✅ Ready to use!
