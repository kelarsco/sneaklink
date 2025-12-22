# Google Ads Library Scraper

## Overview

The Google Ads Library scraper extracts Shopify store URLs from Google ads using RapidAPI's Google Ads Library API.

## Features

### ✅ What It Does

1. **Searches Ads by Keywords**
   - Searches Google ads using Shopify-related keywords
   - Extracts URLs from ad creatives
   - Extracts URLs from landing pages
   - Extracts URLs from advertiser information

2. **Searches by Advertiser**
   - Gets ads for specific advertiser IDs
   - Extracts URLs from all ads by an advertiser
   - Can search multiple countries

3. **Searches by Advertiser Name**
   - Finds ads by advertiser name
   - Useful for finding all ads from a specific brand

4. **Smart URL Extraction**
   - Extracts URLs from multiple ad fields:
     - Ad creative bodies
     - Ad creative titles
     - Landing page URLs
     - Page URLs
     - Advertiser names
     - Link descriptions
     - Link titles

5. **Shopify Store Filtering**
   - Pre-filters URLs using `looksLikeShopifyStore()`
   - Only returns potential Shopify stores
   - Removes duplicates

## Setup

### Environment Variables

Add to your `.env` file:

```env
# Option 1: Use general RapidAPI key (if you have one)
RAPIDAPI_KEY=your_rapidapi_key_here

# Option 2: Use specific Google Ads Library RapidAPI key
GOOGLE_ADS_RAPIDAPI_KEY=your_google_ads_rapidapi_key_here
GOOGLE_ADS_RAPIDAPI_HOST=google-ads-library.p.rapidapi.com
```

### Get API Key

1. Go to https://rapidapi.com/
2. Search for "Google Ads Library" or "Google Ads API"
3. Subscribe to the Google Ads Library API
4. Get your API key from the dashboard
5. Add to `.env` file

## How It Works

### 1. Keyword Search Strategy

```javascript
// Searches ads with keywords like:
- 'shopify'
- 'shopify store'
- 'online store'
- 'ecommerce'
- 'my store'
- 'shop now'
- 'new store'
- 'dropshipping'

// For each ad found:
1. Extract URLs from ad creative
2. Extract URLs from landing page
3. Extract URLs from advertiser info
4. Filter for Shopify stores
5. Add to results
```

### 2. Advertiser Search Strategy

```javascript
// Gets ads for specific advertisers:
1. Use advertiser ID to get all ads
2. Extract URLs from each ad
3. Filter for Shopify stores
4. Search across multiple countries
```

### 3. Advertiser Name Search Strategy

```javascript
// Searches by advertiser name:
1. Search for advertisers by name
2. Get their ads
3. Extract URLs
4. Filter for Shopify stores
```

## URL Extraction

The scraper extracts URLs from:

- ✅ **Ad Creative Bodies** - Main ad text
- ✅ **Ad Creative Titles** - Ad headlines
- ✅ **Landing Page URLs** - `ad_snapshot_url`
- ✅ **Page URLs** - `page_url`
- ✅ **Page Names** - Sometimes contain URLs
- ✅ **Advertiser Names** - May contain URLs
- ✅ **Link Descriptions** - Ad link descriptions
- ✅ **Link Titles** - Ad link titles

## Rate Limiting

The scraper includes intelligent rate limiting:

- **Between keywords**: 3 seconds
- **Between countries**: 2 seconds
- **Between advertisers**: 2 seconds
- **Automatic retry**: 5 seconds on rate limit (429)

## Configuration

### Search Limits

- **Keywords**: Limited to 6 keywords per run
- **Countries**: Limited to 5 countries per keyword
- **Ads per search**: 50 ads
- **Advertisers**: Limited to 10 advertisers
- **Total ads checked**: ~300-1500 ads per run

### Performance

- **Expected stores per run**: 10-100 stores (depends on keyword relevance)
- **API calls per run**: ~30-60 calls
- **Time per run**: ~3-8 minutes (with rate limiting)

## Usage

### Automatic (Integrated)

The scraper is automatically called by the continuous scraping service:

```javascript
// In continuousScrapingService.js
if (SCRAPING_CONFIG.ENABLED_SOURCES.socialMediaAdvanced) {
  sources.push({
    name: 'Social Media Advanced (TikTok/Instagram/Pinterest/Google Ads)',
    fn: scrapeSocialMediaForStores,
    priority: 2,
  });
}
```

### Manual Usage

```javascript
import { scrapeGoogleAds, scrapeGoogleAdsByAdvertiser } from './utils/googleAdsScraper.js';

// Scrape Google Ads for stores
const stores = await scrapeGoogleAds();

// Scrape specific advertiser
const advertiserStores = await scrapeGoogleAdsByAdvertiser('AR14188379519798214657', ['US', 'GB']);
```

## API Endpoints Used

The scraper uses these RapidAPI Google Ads Library endpoints:

1. **`advertiser_ads`** - Get ads for a specific advertiser
2. **`search_ads`** - Search ads by keyword (if available)
3. **`advertiser_ads`** (with name) - Get ads by advertiser name (if available)

## Example Request

```javascript
// Get ads for an advertiser
const ads = await getAdvertiserAds('AR14188379519798214657', 'US', 'ALL');

// Response structure:
{
  ads: [
    {
      ad_creative_bodies: ['Check out our store!'],
      ad_creative_titles: ['New Shopify Store'],
      ad_snapshot_url: 'https://store.myshopify.com',
      page_url: 'https://store.myshopify.com',
      advertiser_name: 'My Store',
      // ... more fields
    }
  ]
}
```

## Error Handling

- ✅ Handles rate limits (429) with automatic retry
- ✅ Handles API errors gracefully
- ✅ Continues on individual ad/advertiser errors
- ✅ Logs errors for debugging
- ✅ Returns partial results on errors

## Optimization Features

1. **Deduplication**
   - Removes duplicate URLs
   - Normalizes URLs (trailing slashes, etc.)

2. **Smart Filtering**
   - Pre-filters with `looksLikeShopifyStore()`
   - Only processes potential Shopify stores

3. **Batch Processing**
   - Processes multiple keywords efficiently
   - Searches across multiple countries

4. **Rate Limit Management**
   - Respects API rate limits
   - Automatic backoff on 429 errors

## Example Output

```
📢 Scraping Google Ads Library for Shopify stores...
   Searching ads by keywords...
   ✅ Checked 450 ads, found 25 stores
   Searching known Shopify advertisers...
   Searching by advertiser names...
   ✅ Found 25 unique Shopify stores from Google Ads Library
   📊 Stats: 450 ads, 5 advertisers
```

## Troubleshooting

### No stores found

1. **Check API key**: Verify `RAPIDAPI_KEY` is set correctly
2. **Check API subscription**: Ensure Google Ads Library API is subscribed
3. **Check rate limits**: May need to wait or upgrade plan
4. **Check keywords**: Keywords may not be finding relevant ads
5. **Check API endpoints**: Verify endpoint names match API documentation

### Rate limit errors

- The scraper automatically handles rate limits
- Waits 5 seconds and retries
- If persistent, reduce keyword count or add delays

### API errors

- Check API key validity
- Check API subscription status
- Verify endpoint availability
- Check RapidAPI dashboard for issues
- Verify endpoint names match API documentation

## Notes

- The scraper uses the same `RAPIDAPI_KEY` as other RapidAPI services
- Can use specific `GOOGLE_ADS_RAPIDAPI_KEY` if you have separate keys
- Integrates seamlessly with existing scraping infrastructure
- Results are automatically deduplicated with other sources
- **Note**: Endpoint names may vary - adjust based on actual API documentation

## API Response Format

The scraper handles multiple response formats:

```javascript
// Format 1: Direct array
[{ ad_creative_bodies: [...], ... }]

// Format 2: Nested in ads property
{ ads: [{ ad_creative_bodies: [...], ... }] }
```

---

**Last Updated:** 2025-01-12

