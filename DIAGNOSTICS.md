# Troubleshooting: Why Links Aren't Generating

## Quick Checks

1. **Is the server running?**
   ```bash
   cd server
   npm run dev
   ```
   You should see:
   - "MongoDB Connected: ..."
   - "Server running on port 3000"
   - "🚀 Starting automatic scraping job..." (after 5 seconds)

2. **Check the console output**
   - Look for error messages
   - Check if scrapers are finding URLs
   - See how many stores are being saved vs skipped

3. **Check database**
   - Verify MongoDB connection is working
   - Check if any stores exist in the database

## Common Issues

### Issue 1: No URLs Found
**Symptoms:** Console shows "Found 0 unique potential Shopify store URLs"

**Possible causes:**
- Scrapers aren't finding URLs from sources
- Pre-filtering is too strict
- Network/API issues

**Solution:**
- Check if Reddit API is accessible
- Verify ScrapingAPI key if using search engines
- Check Facebook token if using Ads Library
- Common Crawl might be slow or rate-limited

### Issue 2: URLs Found But All Rejected
**Symptoms:** Console shows "Found X URLs" but "0 saved, X skipped"

**Possible causes:**
- Strict Shopify validation rejecting all URLs
- All stores are password protected
- All stores are inactive
- Missing name/productCount validation

**Solution:**
- Check console logs for rejection reasons
- Look for patterns: "❌ REJECTED: Not a Shopify store"
- The validation is strict - only confirmed Shopify stores pass

### Issue 3: Server Not Starting
**Symptoms:** No console output, server crashes

**Possible causes:**
- MongoDB connection failed
- Missing environment variables
- Port already in use

**Solution:**
- Check `.env` file has correct MongoDB URI
- Verify MongoDB Atlas allows your IP
- Check if port 3000 is available

## Manual Testing

1. **Test a single store manually:**
   ```bash
   curl -X POST http://localhost:3000/api/stores \
     -H "Content-Type: application/json" \
     -d '{"url": "https://example.myshopify.com", "source": "Manual"}'
   ```

2. **Check scraping status:**
   ```bash
   curl http://localhost:3000/api/stores/scrape/status
   ```

3. **Manually trigger scraping:**
   ```bash
   curl -X POST http://localhost:3000/api/stores/scrape
   ```

## Expected Behavior

When working correctly, you should see:
1. Server starts and connects to MongoDB
2. After 5 seconds: "🚀 Starting automatic scraping job..."
3. Scrapers run and find URLs
4. URLs are processed and validated
5. Valid stores are saved to database
6. Console shows: "✅ SAVED: Store Name (Country) - X products"

## Debugging Steps

1. **Check server logs** - Look for error messages
2. **Verify scrapers** - Check if they're finding URLs
3. **Test validation** - Try adding a known Shopify store manually
4. **Check database** - Verify stores are being saved
5. **Review filters** - Make sure pre-filtering isn't too strict

## Getting Help

If links still aren't generating:
1. Share the console output from the server
2. Check the "scrape/status" endpoint response
3. Verify MongoDB has stores: Check database directly
4. Test with a known Shopify store URL manually
