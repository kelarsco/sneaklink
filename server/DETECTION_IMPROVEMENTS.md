# Country and Theme Detection Improvements

## Summary

Enhanced the country and theme detection functions to improve accuracy and ensure detected values match filter options exactly.

## Changes Made

### 1. Theme Detection (`server/utils/themeDetector.js`)

**Added 6 detection methods:**

1. **Shopify Theme API** (Most Reliable)
   - Checks `/meta.json` endpoint for theme information
   - This is Shopify's official way to get theme data

2. **Shopify.theme Object**
   - Extracts theme name from `Shopify.theme` JavaScript object
   - Checks for patterns like `Shopify.theme = { name: "dawn" }`

3. **Link Tags (CSS/JS Files)**
   - Checks `<link>` and `<script>` tags for theme references
   - Looks for patterns like `/themes/dawn/`, `/theme/dawn/`, `theme-dawn`

4. **HTML Content**
   - Searches HTML for theme indicators
   - Checks data attributes like `data-theme="dawn"`

5. **Class Names**
   - Checks `body`, `html` class names and IDs for theme references
   - Looks for patterns like `theme-dawn`, `dawn-theme`

6. **Liquid Template Markers**
   - Checks Shopify Liquid comment blocks for theme information

**Theme Normalization:**
- All theme names are normalized to match filter options exactly
- "palo alto" → "Palo Alto"
- "dawn" → "Dawn"
- "impulse" → "Impulse"

### 2. Country Detection (`server/utils/countryDetector.js`)

**Added 6 detection methods:**

1. **Shopify.shop Object** (Most Reliable)
   - Extracts country code from `Shopify.shop` JavaScript object
   - Converts country codes (US, CA, GB, etc.) to full country names

2. **Currency Codes**
   - Detects currency (USD, CAD, GBP, EUR, etc.)
   - Maps to countries with special handling for EUR (multiple countries)

3. **Language Codes**
   - Checks HTML lang attributes
   - Maps language codes to countries (en-US → United States, de → Germany)

4. **Shipping Indicators**
   - Searches for shipping-related text
   - Looks for phrases like "shipping to US", "Canada shipping", etc.

5. **Phone Codes**
   - Detects phone number country codes (+1, +44, +49, etc.)
   - Maps to countries

6. **Address/City Names**
   - Checks for city names in content
   - Maps cities to countries (London → United Kingdom, Berlin → Germany)

**URL Fallback:**
- Checks TLDs (.co.uk → United Kingdom, .de → Germany)
- Checks subdomains (us.example.com → United States)

### 3. Logging (`server/services/storeProcessor.js`)

**Added debug logging:**
- Logs detected country and theme during processing
- Shows final values before saving to database
- Helps identify when detection fails

## Filter Matching

**Important:** Detected values must match filter options exactly (case-sensitive):

- ✅ "United States" matches filter
- ❌ "united states" does NOT match filter
- ✅ "Dawn" matches filter
- ❌ "dawn" does NOT match filter

The detection functions now normalize all values to match filter format exactly.

## Supported Countries

All countries from the filter options are supported:
- **European:** Albania, Andorra, Austria, Belarus, Belgium, Bosnia and Herzegovina, Bulgaria, Croatia, Cyprus, Czech Republic, Denmark, Estonia, Finland, France, Germany, Greece, Hungary, Iceland, Ireland, Italy, Kosovo, Latvia, Liechtenstein, Lithuania, Luxembourg, Malta, Moldova, Monaco, Montenegro, Netherlands, North Macedonia, Norway, Poland, Portugal, Romania, Russia, San Marino, Serbia, Slovakia, Slovenia, Spain, Sweden, Switzerland, Ukraine, United Kingdom, Vatican City

- **American:** United States, Canada, Mexico, Brazil, Argentina, Chile, Colombia, Peru, Venezuela, Ecuador, Bolivia, Paraguay, Uruguay, Guyana, Suriname, Costa Rica, Panama, Cuba, Dominican Republic, Puerto Rico, Jamaica, Trinidad and Tobago, Bahamas, Barbados, Belize, El Salvador, Guatemala, Haiti, Honduras, Nicaragua, Australia

## Supported Themes

All themes from the filter options are supported:

**Free Themes:** Dawn, Refresh, Sense, Craft, Studio, Taste, Origin, Debut, Brooklyn, Minimal, Supply, Venture, Simple

**Paid Themes:** Impulse, Motion, Prestige, Empire, Expanse, Warehouse, Enterprise, Symmetry, Modular, Palo Alto, Loft, Blockshop, Flow, Avenue, Broadcast, Pipeline, Envy, Streamline, Fashionopolism, District, Venue, Editorial, Focal, Chronicle, Galleria

## Troubleshooting

### If stores show "Unknown" for country or theme:

1. **Check logs** - The enhanced logging will show what was detected
2. **Verify HTML** - The store might not have theme/country information in HTML
3. **Custom themes** - Stores using custom themes not in our list will show "Unknown"
4. **API availability** - If ScrapingAPI is not configured, detection may be less accurate

### If filters don't work:

1. **Check database** - Verify stores have country/theme values saved
2. **Check exact match** - Values must match filter options exactly (case-sensitive)
3. **Check API route** - Verify `/api/stores` route is filtering correctly

## Testing

To test detection:

1. Process a new store URL
2. Check console logs for detection results
3. Verify database has correct country/theme values
4. Test filters in the frontend

## Next Steps

If detection is still not working:

1. Check if ScrapingAPI is configured (improves HTML fetching)
2. Review logs to see what's being detected
3. Manually check a few store URLs to verify they have theme/country info
4. Consider adding more detection patterns if needed

---

**Last Updated:** 2025-01-12

