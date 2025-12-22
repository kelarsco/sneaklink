# Update Themes and Countries Migration Script

This script updates existing stores in the database with improved theme and country detection.

## What it does

1. **Theme Updates:**
   - Finds all stores with "Unknown" theme
   - Re-detects themes using the improved `themeDetector.js`
   - If theme cannot be detected, assigns a random free theme (Dawn, Refresh, Sense, Craft, Studio, Taste, Origin, Debut, Brooklyn, Minimal, Supply, Venture, Simple)
   - Ensures all stores have valid theme names that work with filters

2. **Country Updates:**
   - Finds all stores with "Unknown" country
   - Re-detects countries using the improved `countryDetector.js`
   - If country cannot be detected, defaults to "United States"
   - Ensures all stores have valid country names

## Usage

### Command Line

```bash
# Update both themes and countries (default)
npm run update-themes

# Update only themes
npm run update-themes-only

# Update only countries
npm run update-countries-only

# Or run directly with node
node server/scripts/updateThemesAndCountries.js

# With options
node server/scripts/updateThemesAndCountries.js --theme-only
node server/scripts/updateThemesAndCountries.js --country-only
node server/scripts/updateThemesAndCountries.js --limit=10  # Test with 10 stores
```

### API Endpoint

You can also trigger the update via API (requires admin authentication):

```bash
POST /api/stores/update-themes-countries
Authorization: Bearer <admin_token>

Body (optional):
{
  "themeOnly": false,
  "countryOnly": false,
  "limit": 10  // Optional: limit number of stores to process
}
```

## Options

- `--theme-only`: Only update themes, skip country detection
- `--country-only`: Only update countries, skip theme detection
- `--limit=N`: Process only N stores (useful for testing)

## How it works

1. Connects to MongoDB using `MONGODB_URI` from `.env`
2. Finds all stores that need updating (those with "Unknown" theme/country)
3. Processes stores in batches of 10 to avoid overwhelming the system
4. For each store:
   - Calls `detectTheme()` to get improved theme detection
   - Calls `detectCountry()` to get improved country detection
   - Updates the database with new values
5. Provides detailed progress logs and summary statistics

## Rate Limiting

- Processes stores in batches of 10
- 2 second delay between batches
- This prevents overwhelming the system or external APIs

## Example Output

```
🔌 Connecting to MongoDB...
✅ Connected to MongoDB

📊 Found 150 stores to update
🔄 Processing 150 stores...

📦 Processing batch 1/15 (10 stores)...
   🎨 Detecting theme for: https://example.myshopify.com
      ✅ Theme: Dawn (free)
   🌍 Detecting country for: https://example.myshopify.com
      ✅ Country: United States
   ...

================================================================================
✨ Migration Summary
================================================================================
🎨 Themes:
   - Updated: 150 stores
   - Errors: 0 stores
🌍 Countries:
   - Updated: 150 stores
   - Errors: 0 stores
   - Skipped: 0 stores (already had valid values)
   - Total processed: 150 stores

🔍 Verifying migration...
✅ All stores now have valid themes
✅ All stores now have valid countries

🔌 Disconnected from MongoDB
✅ Migration completed successfully!
```

## Notes

- The script is safe to run multiple times - it only updates stores that need updating
- Stores with valid themes/countries are skipped
- If theme detection fails, a random free theme is assigned (no "Unknown" themes)
- If country detection fails, defaults to "United States" (no "Unknown" countries)
- The script processes stores sequentially in batches to avoid rate limiting

## Troubleshooting

**Error: MONGODB_URI is not set**
- Make sure you have a `.env` file in the `server/` directory
- Ensure `MONGODB_URI` is set correctly

**Script takes too long**
- Use `--limit=N` to test with a smaller number first
- The script processes stores in batches with delays to avoid rate limiting

**Some stores still show "Unknown"**
- Check the error logs to see which stores failed
- Those stores may be inactive or unreachable
- The script will assign fallback values (random free theme, "United States" country)

## Related Files

- `server/utils/themeDetector.js` - Theme detection logic
- `server/utils/countryDetector.js` - Country detection logic
- `server/models/Store.js` - Store model schema
