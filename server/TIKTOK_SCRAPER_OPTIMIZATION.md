# TikTok Scraper Optimization

## Overview

The TikTok scraper has been optimized to use RapidAPI Scraptik to extract Shopify store URLs from posts, profiles, and hashtags.

## Features

### ✅ What It Does

1. **Searches Posts by Keywords**
   - Searches TikTok posts using Shopify-related keywords
   - Extracts URLs from post descriptions
   - Extracts URLs from author bios
   - Extracts URLs from bio links

2. **Searches Hashtags**
   - Finds relevant hashtags
   - Can extract posts from hashtags (if API supports)

3. **Checks User Profiles**
   - Extracts URLs from profile bios
   - Extracts URLs from profile bio links
   - Can check posts from specific users

4. **Smart URL Extraction**
   - Extracts URLs from multiple content fields:
     - Post descriptions
     - Video descriptions
     - Author bios/signatures
     - Bio links
     - Profile information

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

# Option 2: Use specific TikTok RapidAPI key
TIKTOK_RAPIDAPI_KEY=your_tiktok_rapidapi_key_here
TIKTOK_RAPIDAPI_HOST=scraptik.p.rapidapi.com
```

### Get API Key

1. Go to https://rapidapi.com/
2. Search for "Scraptik" or "TikTok API"
3. Subscribe to the Scraptik API
4. Get your API key from the dashboard
5. Add to `.env` file

## How It Works

### 1. Post Search Strategy

```javascript
// Searches posts with keywords like:
- 'shopify store'
- 'my store'
- 'shop now'
- 'unboxing'
- 'just launched'
- 'new store'
- 'link in bio'
- 'online store'

// For each post found:
1. Extract URLs from description
2. Extract URLs from author bio
3. Extract URLs from bio link
4. Filter for Shopify stores
5. Add to results
```

### 2. Hashtag Search Strategy

```javascript
// Searches hashtags like:
- 'shopify'
- 'shopifystore'
- 'onlinestore'
- 'ecommerce'
- 'dropshipping'

// Can get posts from hashtags (if API supports)
```

### 3. Profile Search Strategy

```javascript
// Checks user profiles:
1. Extract URLs from profile bio
2. Extract URLs from bio link
3. Get user's posts
4. Extract URLs from posts
5. Filter for Shopify stores
```

## URL Extraction

The scraper extracts URLs from:

- ✅ **Post descriptions** - Main post text
- ✅ **Video descriptions** - Video-specific descriptions
- ✅ **Author bios** - User signature/bio text
- ✅ **Bio links** - Direct bio link URLs
- ✅ **Profile bios** - Profile page bios
- ✅ **Profile bio links** - Profile page bio links

## Rate Limiting

The scraper includes intelligent rate limiting:

- **Between keywords**: 3 seconds
- **Between regions**: 2 seconds
- **Between hashtags**: 2 seconds
- **Automatic retry**: 5 seconds on rate limit (429)

## Configuration

### Search Limits

- **Keywords**: Limited to 8 keywords per run
- **Regions**: Limited to 2 regions per keyword
- **Posts per search**: 30 posts
- **Hashtags**: Limited to 4 hashtag searches
- **Total posts checked**: ~240-480 posts per run

### Performance

- **Expected stores per run**: 5-50 stores (depends on keyword relevance)
- **API calls per run**: ~20-40 calls
- **Time per run**: ~2-5 minutes (with rate limiting)

## Usage

### Automatic (Integrated)

The scraper is automatically called by the continuous scraping service:

```javascript
// In continuousScrapingService.js
if (SCRAPING_CONFIG.ENABLED_SOURCES.socialMediaAdvanced) {
  sources.push({
    name: 'Social Media Advanced (TikTok/Instagram/Pinterest)',
    fn: scrapeSocialMediaForStores,
    priority: 2,
  });
}
```

### Manual Usage

```javascript
import { scrapeTikTokOptimized, scrapeTikTokUser } from './utils/tiktokScraper.js';

// Scrape TikTok for stores
const stores = await scrapeTikTokOptimized();

// Scrape specific user
const userStores = await scrapeTikTokUser('username');
```

## API Endpoints Used

The scraper uses these RapidAPI Scraptik endpoints:

1. **`search-posts`** - Search posts by keyword
2. **`search-hashtags`** - Search hashtags
3. **`get-user`** - Get user profile
4. **`get-user-posts`** - Get user's posts
5. **`get-post`** - Get single post (for detailed extraction)

## Error Handling

- ✅ Handles rate limits (429) with automatic retry
- ✅ Handles API errors gracefully
- ✅ Continues on individual post/profile errors
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
   - Uses Promise.all where possible

4. **Rate Limit Management**
   - Respects API rate limits
   - Automatic backoff on 429 errors

## Example Output

```
📱 Scraping TikTok for Shopify stores (RapidAPI Scraptik)...
   Searching posts by keywords...
   ✅ Checked 240 posts, found 12 stores
   Searching hashtags...
   ✅ Checked 20 hashtags
   Searching user profiles...
   ✅ Found 12 unique Shopify stores from TikTok
   📊 Stats: 240 posts, 0 profiles, 20 hashtags
```

## Troubleshooting

### No stores found

1. **Check API key**: Verify `RAPIDAPI_KEY` is set correctly
2. **Check API subscription**: Ensure Scraptik API is subscribed
3. **Check rate limits**: May need to wait or upgrade plan
4. **Check keywords**: Keywords may not be finding relevant posts

### Rate limit errors

- The scraper automatically handles rate limits
- Waits 5 seconds and retries
- If persistent, reduce keyword count or add delays

### API errors

- Check API key validity
- Check API subscription status
- Verify endpoint availability
- Check RapidAPI dashboard for issues

## Next Steps

1. ✅ **Implemented**: Post search with URL extraction
2. ✅ **Implemented**: Hashtag search
3. ✅ **Implemented**: Profile URL extraction
4. 🟡 **Partial**: User profile search (needs user search endpoint)
5. 🟡 **Partial**: Hashtag post extraction (depends on API)

## Notes

- The scraper uses the same `RAPIDAPI_KEY` as other RapidAPI services
- Can use specific `TIKTOK_RAPIDAPI_KEY` if you have separate keys
- Integrates seamlessly with existing scraping infrastructure
- Results are automatically deduplicated with other sources

---

**Last Updated:** 2025-01-12

