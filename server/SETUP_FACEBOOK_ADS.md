# Facebook Ads Library Setup Guide

This guide will help you set up the Facebook Ads Library integration to scrape Shopify stores from Facebook ads.

## Step 1: Create Your .env File

1. Copy the template file:
   ```bash
   cp env.template .env
   ```

2. Open `.env` and add your Facebook credentials:
   ```env
   FACEBOOK_ACCESS_TOKEN=EAAQHqBCjLT4BQNMOwwOsYZBmOV0FtWEHAJBWjNjLZBsAqaRWgpeo8UXOQLEB5cZASQInpVzFtLAJiyP1svdHMaO9XWZCz4I49nZChUGb5QBUfYu1EZCNxscShhc1IZCy71n1L08GrshYReRCUYpsWSIODjYPZBNZBr5955FjSWQKGJuiRTTidSXus1pEgaZANrsU1If7t9tKoZCqT2GZAHY8uShQBolUEQFj4LHuFo7QFxHkvCLD5fqOv9Rc8DAcV8P7TOCK43onAzUF58i22e9hppx5Qvu1
   FACEBOOK_APP_ID=1134318321872190
   FACEBOOK_APP_SECRET=9d9c8681659536780c867f0cce107405
   ```

**⚠️ IMPORTANT:** Never commit your `.env` file to git! It contains sensitive credentials.

## Step 2: Test Your Token

Run the test script to verify your token is working:

```bash
npm run test:facebook
```

This will:
- ✅ Verify your token is valid
- ✅ Get your Facebook user info
- ✅ Test the Ads Library API with a "shopify" search
- ✅ Show sample ad data

If the test passes, you're ready to go!

## Step 3: Start Scraping

The Facebook Ads Library scraper is automatically integrated into the continuous scraping service. It will run when:

1. **Automatic scraping** (if enabled):
   - The server automatically starts scraping when it starts
   - Check your server logs for: `📢 Scraping Facebook Ads Library for Shopify stores...`

2. **Manual scraping**:
   - The scraper is part of the `scrapeSocialMediaForStores()` function
   - It searches for ads with keywords: "shopify", "online store", "shop now", "new store"
   - Results are filtered to only include Shopify stores
   - Stores are saved to your MongoDB database

## How It Works

The Facebook Ads Library scraper:

1. **Searches** Facebook Ads Library for active ads matching Shopify-related keywords
2. **Extracts** website URLs from ad data
3. **Filters** results to only include Shopify stores (using fingerprint detection)
4. **Saves** discovered stores to your database with metadata:
   - Source: `facebook_ads_library`
   - Platform: `facebook`
   - Page name, ad snapshot URL, search term used

## Configuration

### Search Parameters

The scraper uses these default parameters:
- **Search Terms**: `shopify`, `online store`, `shop now`, `new store`
- **Ad Status**: `ACTIVE` (only active ads)
- **Countries**: `US` (United States)
- **Fields**: `ad_snapshot_url`, `website_url`, `page_name`
- **Limit**: 100 ads per search term

### Rate Limiting

- 3 second delay between search queries
- Respects Facebook API rate limits

## Troubleshooting

### Token Expired (Error 190)
- Your access token has expired
- Generate a new token at: https://developers.facebook.com/tools/explorer/
- Update `FACEBOOK_ACCESS_TOKEN` in your `.env` file

### Missing Permissions (Error 10)
- Your app needs the `ads_read` permission
- Go to your Facebook App settings and add the permission
- Regenerate your token

### No Results Found
- This is normal - not all ads contain Shopify stores
- The scraper filters results to only include Shopify stores
- Try different search terms or countries if needed

### API Rate Limits
- Facebook has rate limits on API calls
- The scraper includes delays to respect these limits
- If you hit rate limits, wait a few minutes and try again

## Monitoring

Check your server logs for:
- `📢 Scraping Facebook Ads Library for Shopify stores...`
- `Searching Facebook Ads Library for: "shopify"...`
- `Received X ads for term "shopify"`
- `Found X stores from Facebook Ads Library`

Check your MongoDB database for stores with:
- `source: "facebook_ads_library"`
- `platform: "facebook"`

## Next Steps

1. ✅ Set up your `.env` file with credentials
2. ✅ Test your token: `npm run test:facebook`
3. ✅ Start your server: `npm run dev` or `npm start`
4. ✅ Monitor logs and database for new stores
5. ✅ Adjust search terms or countries as needed

## API Documentation

- Facebook Ads Library API: https://www.facebook.com/ads/library/api/
- Graph API Reference: https://developers.facebook.com/docs/graph-api
- Token Generator: https://developers.facebook.com/tools/explorer/


