# Starting the Scraping System

## Automatic Scraping

The scraping system starts **automatically** when you start the backend server:

```bash
cd server
npm run dev
```

The system will:
1. ✅ Connect to MongoDB
2. ✅ Wait 5 seconds after connection
3. ✅ Automatically start the first scraping job
4. ✅ Continue scraping every 30 minutes
5. ✅ Run deep scraping every 6 hours
6. ✅ Run comprehensive scraping daily at 2 AM

## Manual Scraping Trigger

You can also manually trigger a scraping job via API:

```bash
# Using curl (requires ADMIN_API_KEY in .env)
curl -X POST http://localhost:3000/api/stores/scrape \
  -H "X-API-Key: YOUR_ADMIN_API_KEY"
```

Or from the frontend, you can add a button that calls this endpoint.

## Check Scraping Status

```bash
# Check status
curl http://localhost:3000/api/stores/scrape/status
```

## What Gets Scraped

The continuous scraping system uses multiple sources:

1. **Reddit** - Shopify-related subreddits
2. **Shopify Marketplace** - App store listings
3. **Search Engines** - Google, Bing searches
4. **Social Media** - Product Hunt, Indie Hackers, Medium
5. **Common Crawl** - Internet archive
6. **Shopify Fingerprints** - New domain detection
7. **Social Media Advanced** - TikTok, Instagram, Pinterest, Google Ads
8. **CDN Patterns** - Shopify CDN monitoring
9. **Google Index** - Recent Shopify store indexing
10. **Massive Scraper** - Certificate Transparency, Shodan, Censys

## Requirements

- ✅ MongoDB connection configured in `server/.env`
- ✅ Backend server running on port 3000
- ✅ Optional: API keys for enhanced scraping (see `server/env.template`)

## Troubleshooting

### Scraping not starting
- Check MongoDB connection in `server/.env`
- Verify server logs for connection errors
- Check if port 3000 is available

### No stores found
- Check API keys in `.env` (optional but recommended)
- Review server logs for scraping progress
- Verify scrapers have proper API access

### Slow scraping
- This is normal - scraping runs continuously in background
- First scrape may take longer
- Subsequent scrapes are faster (deduplication)


