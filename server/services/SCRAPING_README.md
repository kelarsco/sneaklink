# Clean Scraping System

## Overview

The old complex scraping system has been completely removed for clarity and balance. You now have a clean interface to configure your own scraping sources.

## What Was Removed

- All scraper files (`*scraper.js` in `server/utils/`)
- `continuousScrapingService.js` - Complex orchestration service
- Automatic cron jobs for scraping
- All hardcoded scraping sources

## What Remains (Core Services)

These services are still active and working:

1. **`discoveryService.js`** - Saves discovered stores (Phase 1)
2. **`verificationService.js`** - Verifies Shopify stores (Phase 2)
3. **`healthCheckService.js`** - Checks store health (Phase 3)
4. **`classificationService.js`** - Classifies business models (Phase 4)
5. **`strictShopifyVerification.js`** - Strict verification checks
6. **`storeProcessingScheduler.js`** - Processes stores through pipeline

## New Scraping Interface

### File: `server/services/scrapingService.js`

This is your clean interface. It has:

- `runScraping(config)` - Main function to run scraping
- `getScrapingStatus()` - Get current scraping status

### How to Use

1. **Provide your scraping sources** in the `sources` array
2. **Add your scraping logic** in the `runScraping` function
3. **Use `saveDiscoveredStore()`** to save discovered stores

### Example Configuration

```javascript
const config = {
  sources: ['pinterest', 'serpapi', 'reddit'],
  options: {
    // Your custom options
  }
};

await runScraping(config);
```

### API Endpoint

**POST** `/api/stores/scrape`

Accepts:
```json
{
  "sources": ["source1", "source2"],
  "config": {
    // Your configuration
  }
}
```

## Next Steps

1. **Tell me your scraping sources** - What APIs, websites, or methods do you want to use?
2. **Provide API keys/tokens** - I'll configure them securely
3. **Specify scraping logic** - How should each source be scraped?
4. **Set up scheduling** - How often should scraping run?

## Database

All discovered stores are saved using `discoveryService.js`, which:
- Normalizes URLs
- Prevents duplicates
- Saves stores immediately (no rejection)
- Stores discovery metadata

Stores then go through the verification pipeline automatically.

