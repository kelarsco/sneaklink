# Update All Stores with New Detection Features

This script re-runs all enhanced detection features on existing stores in the database.

## Features Updated

The script updates stores with:
1. **Store Unavailable Check** - Deactivates stores showing "SHOPIFY Sorry, this store is currently unavailable" message
2. **Currency-Based Country Detection** - Updates countries using currency parsing from HTML meta tags, JSON-LD, and price formatting
3. **HTML Title-Based Store Names** - Extracts and updates store names from HTML `<title>` tags
4. **Enhanced POD Detection** - Detects 50+ POD platforms (Printful, Printify, Gooten, etc.)
5. **Multi-Platform Ad Detection** - Detects Facebook, Google, TikTok, Pinterest, Snapchat, and Shopify marketing pixels
6. **Updated Business Model Classification** - Prioritized logic: POD → Ads → Dropshipping

## Usage

### Basic Usage
```bash
node server/scripts/updateAllStoresWithNewDetection.js
```

### Test with Limited Stores
```bash
# Process only 10 stores for testing
node server/scripts/updateAllStoresWithNewDetection.js --limit=10
```

### Dry Run (Preview Changes)
```bash
# See what would be updated without making changes
node server/scripts/updateAllStoresWithNewDetection.js --dry-run
```

### Resume from Specific Point
```bash
# Skip first 100 stores (e.g., if script was interrupted)
node server/scripts/updateAllStoresWithNewDetection.js --skip=100
```

### Custom Batch Size
```bash
# Process 5 stores per batch (default: 10)
node server/scripts/updateAllStoresWithNewDetection.js --batch-size=5
```

### Combined Options
```bash
# Dry run with limited stores and custom batch size
node server/scripts/updateAllStoresWithNewDetection.js --dry-run --limit=50 --batch-size=5
```

## Options

- `--limit=N` - Process only N stores (useful for testing)
- `--skip=N` - Skip first N stores (useful for resuming after interruption)
- `--batch-size=N` - Process N stores per batch (default: 10, recommended: 5-10)
- `--dry-run` - Preview changes without saving to database

## What Gets Updated

The script updates the following fields for each store:

- **name** - Extracted from HTML `<title>` tag
- **country** - Detected from currency, meta tags, and HTML content
- **businessModel** - Classified as POD, Dropshipping, or Unknown
- **tags** - Updated based on business model and ads detection
- **theme** - Shopify theme detection
- **hasFacebookAds** - Multi-platform ad pixel detection
- **productCount** - Product count verification
- **isActive** - Set to false if store is unavailable/password protected

## Rate Limiting

The script includes built-in rate limiting:
- Processes stores in batches (default: 10 stores per batch)
- 3 second delay between batches
- Parallel processing within batches

This helps avoid overwhelming the detection APIs and prevents rate limit errors.

## Output

The script provides detailed progress information:

- Per-store updates showing what changed
- Batch progress summary
- Final summary with statistics:
  - Total stores processed
  - Number updated
  - Number deactivated
  - Number skipped (no changes)
  - Number of errors
  - Breakdown by field updated

## Recommendations

1. **Test First**: Always run with `--dry-run --limit=10` first to preview changes
2. **Monitor Progress**: The script logs detailed progress - monitor for errors
3. **Resume Capability**: If interrupted, use `--skip=N` to resume where you left off
4. **Time Estimate**: Processing takes ~30-60 seconds per store (due to API calls and rate limiting)
   - 100 stores ≈ 50-100 minutes
   - 1000 stores ≈ 8-17 hours

## Example Output

```
🔌 Connecting to database...
✅ Connected to database

📊 Found 1000 active stores in database
🔄 Processing 1000 stores...
   Batch size: 10 stores
   Delay between batches: 3000ms

================================================================================
📦 Processing batch 1/100 (10 stores)
================================================================================

🔄 Processing: https://example-store.myshopify.com
   📝 Name: "Example Store" → "Example Store - Premium Products"
   🌍 Country: "United States" → "Canada"
   🏷️  Business Model: "Unknown" → "Print on Demand"
   🏷️  Tags: [Currently Running Ads] → [Print on Demand, Currently Running Ads]
   📢 Facebook Ads: false → true
   ✅ Store updated

...

✨ Update Summary
================================================================================
📊 Total stores: 1000
✅ Updated: 750
❌ Deactivated: 25
⏭️  Skipped: 200
❌ Errors: 25

📝 Update Breakdown:
   - Names updated: 500
   - Countries updated: 600
   - Business models updated: 400
   - Tags updated: 450
   - Themes updated: 300
   - Facebook ads updated: 200
   - Product counts updated: 150
```

## Troubleshooting

**Script stops due to rate limits:**
- Reduce batch size: `--batch-size=5`
- Increase delay (modify DELAY_BETWEEN_BATCHES in script)

**Out of memory errors:**
- Process in smaller chunks using `--limit` and `--skip`
- Reduce batch size

**Many stores deactivated:**
- This is normal if stores have become unavailable
- Check logs to see reasons for deactivation

## Notes

- The script processes stores ordered by `lastScraped` (oldest first)
- Stores that fail validation checks are deactivated, not deleted
- The script safely handles errors and continues processing
- All changes are logged for auditing

