# Continuous Scraping System

## Overview

The SneakLink continuous scraping system is designed to automatically discover and collect Shopify stores from across the entire internet. The system runs continuously without manual intervention, automatically scheduling the next scrape after each job completes.

## Features

✅ **Automatic Continuous Operation** - Runs automatically every 30 minutes  
✅ **Massive Scale** - Scrapes from 10+ sources simultaneously  
✅ **Internet-Wide Coverage** - Uses Certificate Transparency, Common Crawl, DNS databases, and more  
✅ **Smart Deduplication** - Prevents duplicate stores in database  
✅ **Batch Processing** - Processes stores in batches for efficiency  
✅ **Error Recovery** - Automatic retry logic for failed requests  
✅ **Statistics Tracking** - Comprehensive stats on scraping performance  
✅ **Rate Limiting** - Built-in rate limiting to respect API limits  

## How It Works

### Automatic Scheduling

The system runs on multiple schedules:

1. **Continuous Scraping**: Every 30 minutes
   - Quick updates from all sources
   - Fast processing for new stores

2. **Deep Scraping**: Every 6 hours
   - Comprehensive coverage
   - More thorough searches

3. **Daily Comprehensive**: Once per day at 2 AM
   - Full internet-wide scan
   - Maximum coverage

4. **Initial Scrape**: 5 seconds after server startup
   - Immediate start when server launches

### Scraping Sources

The system scrapes from multiple sources:

#### Standard Sources
- **Reddit** - Shopify-related subreddits
- **Shopify Marketplace** - Official Shopify app marketplace
- **Search Engines** - Google, Bing searches (via APIs)
- **Social Media** - GitHub, Product Hunt, Indie Hackers, Medium
- **Common Crawl** - Web archive with millions of pages
- **Free APIs** - Various free API services

#### Massive Scale Sources
- **Certificate Transparency** - SSL certificate logs (finds all myshopify.com subdomains)
- **GitHub (Massive)** - Extensive code repository searches
- **Shodan** - Internet-connected device search (if API key provided)
- **Censys** - Internet-wide search engine (if API key provided)

### Processing Pipeline

1. **Collection Phase**: Scrapes from all enabled sources in parallel
2. **Deduplication Phase**: Removes duplicate URLs
3. **Validation Phase**: Checks if store already exists in database
4. **Processing Phase**: Validates Shopify store, checks password protection, gets store details
5. **Storage Phase**: Saves valid stores to database

### Configuration

Edit `server/services/continuousScrapingService.js` to configure:

```javascript
const SCRAPING_CONFIG = {
  AUTO_SCRAPE_INTERVAL: 30,        // Minutes between auto scrapes
  BATCH_SIZE: 50,                  // Stores processed per batch
  MAX_CONCURRENT: 10,              // Max concurrent processing
  MAX_RETRIES: 3,                  // Retry attempts for failed stores
  DELAY_BETWEEN_SOURCES: 2000,     // Delay between source scrapes (ms)
  DELAY_BETWEEN_STORES: 500,       // Delay between store processing (ms)
  COUNTRIES: [...],                // Countries to scrape
  ENABLED_SOURCES: {               // Enable/disable sources
    reddit: true,
    marketplace: true,
    searchEngines: true,
    socialMedia: true,
    commonCrawl: true,
    freeAPIs: true,
    massive: true,
  },
};
```

## API Endpoints

### Get Scraping Status
```
GET /api/stores/scrape/status
```

Returns:
- Current scraping status
- Last scrape time
- Total stores scraped/saved
- Statistics and configuration

### Manually Trigger Scrape
```
POST /api/stores/scrape
```

Manually triggers a continuous scraping job (runs in background).

## Environment Variables

Add these to your `.env` file for enhanced scraping:

```env
# Required
MONGODB_URI=your_mongodb_connection_string
PORT=3000

# Optional - Enhanced Scraping
SCRAPING_API_KEY=your_scraping_api_key          # For search engine scraping
GITHUB_TOKEN=your_github_token                  # For GitHub API (higher rate limits)
SHODAN_API_KEY=your_shodan_api_key              # For Shodan searches
CENSYS_API_ID=your_censys_api_id                # For Censys searches
CENSYS_SECRET=your_censys_secret                # For Censys searches
```

## Monitoring

The system logs comprehensive information:

- Job start/end times
- Stores found per source
- Processing progress
- Success/failure statistics
- Error messages

Check server logs to monitor scraping activity.

## Performance

### Expected Results

- **Per 30-minute scrape**: 50-500 stores (depending on sources)
- **Per 6-hour deep scrape**: 500-2000 stores
- **Per daily comprehensive**: 1000-5000+ stores

### Optimization Tips

1. **Enable API Keys**: More sources = more stores
2. **Adjust Batch Size**: Larger batches = faster but more memory
3. **Country Selection**: More countries = more stores but slower
4. **Source Selection**: Enable only needed sources for faster scrapes

## Troubleshooting

### No Stores Found

- Check API keys are set correctly
- Verify network connectivity
- Check source-specific error messages in logs
- Some sources may be rate-limited

### Slow Processing

- Reduce `BATCH_SIZE` if memory issues
- Increase `DELAY_BETWEEN_STORES` to reduce load
- Disable unnecessary sources

### Database Errors

- Verify MongoDB connection
- Check database permissions
- Ensure sufficient disk space

## Stopping/Starting

The system runs automatically. To stop:

1. Stop the server (Ctrl+C or `pm2 stop`)
2. The system will resume when server restarts

To manually trigger a scrape:
```bash
curl -X POST http://localhost:3000/api/stores/scrape
```

## Next Steps

The system will continue running automatically. Each scrape will:
1. Find new Shopify stores
2. Validate and process them
3. Save to database
4. Schedule the next automatic scrape

No manual intervention needed! 🚀

