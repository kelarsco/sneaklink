# Custom Domain Support & Deduplication

## Overview

The system has been updated to:
1. **Detect Shopify stores on ANY domain** (not just `.myshopify.com`)
2. **Skip URLs that have already been scraped** to avoid duplicate processing

## Changes Made

### 1. Custom Domain Support ✅

**File: `server/utils/shopifyUrlValidator.js`**

**Before:** Only accepted URLs with `.myshopify.com` domain  
**After:** Accepts ANY valid URL and lets the full detection (`isShopifyStore`) determine if it's Shopify

**How it works:**
- The pre-filter (`looksLikeShopifyStore`) now accepts any valid URL
- The full detection (`isShopifyStore`) checks for Shopify fingerprints:
  - `/cart.js` endpoint
  - `X-ShopId` header
  - `/products.json` endpoint
  - `cdn.shopify.com` in assets
  - Other Shopify-specific patterns

**Result:** Custom domains like `example.com`, `mystore.com`, etc. are now detected if they're hosted on Shopify.

### 2. Deduplication System ✅

**New File: `server/utils/deduplication.js`**

**Functions:**
- `normalizeUrlForComparison(url)` - Normalizes URLs for comparison (removes trailing slashes, normalizes www, etc.)
- `isUrlAlreadyScraped(url)` - Checks if a single URL has been scraped
- `filterAlreadyScrapedUrls(urls)` - Filters out already-scraped URLs from an array
- `getDeduplicationStats(urls)` - Returns stats on new vs already-scraped URLs

**Features:**
- Handles URL variations (www, trailing slash, http/https)
- Batch database queries for efficiency
- Case-insensitive matching

### 3. Integration in Scraping Service ✅

**File: `server/services/continuousScrapingService.js`**

**Phase 2 Enhancement:**
- Before processing stores, checks all collected URLs against the database
- Filters out URLs that have already been scraped
- Shows statistics: new URLs vs already scraped

**Benefits:**
- No duplicate processing
- Faster scraping (skips known URLs)
- Better resource utilization
- Clear statistics on what's new vs already known

### 4. Store Processor Update ✅

**File: `server/services/storeProcessor.js`**

**Enhancement:**
- Uses normalized URL comparison when checking for existing stores
- Handles URL variations (www, trailing slash, etc.)
- Prevents duplicate stores with different URL formats

## How It Works

### Custom Domain Detection Flow

```
1. URL collected from scraper
   ↓
2. Pre-filter (looksLikeShopifyStore)
   ✅ Accepts ANY valid URL (not just .myshopify.com)
   ↓
3. Full detection (isShopifyStore)
   ✅ Checks Shopify fingerprints:
      - /cart.js endpoint
      - X-ShopId header
      - /products.json endpoint
      - cdn.shopify.com in assets
   ↓
4. If Shopify detected → Process store
   If not Shopify → Reject
```

### Deduplication Flow

```
1. URLs collected from all scrapers
   ↓
2. Phase 2: Deduplication
   ✅ Check against database
   ✅ Filter out already-scraped URLs
   ✅ Show statistics
   ↓
3. Phase 3: Process only NEW URLs
   ✅ Skip already-scraped URLs
   ✅ Process and save new stores
```

## Examples

### Custom Domain Detection

**Before:**
```javascript
// ❌ Rejected: Not .myshopify.com
looksLikeShopifyStore('https://mystore.com') // false
```

**After:**
```javascript
// ✅ Accepted: Valid URL, full detection will check
looksLikeShopifyStore('https://mystore.com') // true

// Full detection checks:
isShopifyStore('https://mystore.com')
// Checks: /cart.js, X-ShopId, /products.json, cdn.shopify.com
// If any match → Confirmed Shopify store
```

### Deduplication

**Before:**
```javascript
// Would process same URL multiple times
processStore({ url: 'https://store.myshopify.com' }) // Process
processStore({ url: 'https://store.myshopify.com' }) // Process again (duplicate!)
```

**After:**
```javascript
// First time
filterAlreadyScrapedUrls(['https://store.myshopify.com'])
// Returns: ['https://store.myshopify.com'] (new)

// Second time (after first was saved)
filterAlreadyScrapedUrls(['https://store.myshopify.com'])
// Returns: [] (already scraped, filtered out)
```

## Statistics

During scraping, you'll now see:

```
📦 Phase 2: Deduplicating stores...
   📊 Total URLs collected: 1500
   🔍 Checking against database for already scraped URLs...
   ✅ New URLs (not scraped before): 250
   ⏭️  Already scraped (skipped): 1250
```

This shows:
- How many URLs were collected
- How many are new (will be processed)
- How many were already scraped (skipped)

## Benefits

1. **More Stores Found:**
   - Custom domains are now detected
   - Not limited to `.myshopify.com` only

2. **No Duplicates:**
   - URLs are checked before processing
   - Already-scraped URLs are skipped
   - Saves time and resources

3. **Better Performance:**
   - Batch database queries
   - No redundant processing
   - Clear statistics

4. **Accurate Detection:**
   - Multiple Shopify fingerprint checks
   - Works for both `.myshopify.com` and custom domains
   - High accuracy

## Testing

To verify it's working:

1. **Custom Domain Test:**
   ```bash
   # Add a custom domain Shopify store
   curl -X POST http://localhost:3000/api/stores \
     -H "Content-Type: application/json" \
     -H "X-API-Key: your_key" \
     -d '{"url":"https://example-custom-domain.com"}'
   ```

2. **Deduplication Test:**
   ```bash
   # Try adding same URL twice
   curl -X POST http://localhost:3000/api/stores \
     -H "Content-Type: application/json" \
     -H "X-API-Key: your_key" \
     -d '{"url":"https://store.myshopify.com"}'
   
   # Second time should update existing, not create duplicate
   ```

## Notes

- **URL Normalization:** URLs are normalized for comparison (www, trailing slash, http/https variations are handled)
- **Database Efficiency:** Batch queries are used to check multiple URLs at once
- **Backward Compatible:** Existing `.myshopify.com` stores continue to work
- **Performance:** Deduplication happens before expensive processing, saving resources

---

**Last Updated:** 2025-01-12

