# Store Scraping System - 7-Stage Detection

## Overview

This document describes the comprehensive 7-stage store scraping system that detects, validates, categorizes, and saves Shopify stores.

## API Endpoint

**POST** `/api/stores/scrape`

**Authentication:** Required (authenticated users only)

**Request Body:**
```json
{
  "url": "https://example-store.com",
  "source": "manual" // Optional: source identifier
}
```

**Response:**
```json
{
  "success": true,
  "message": "Store scraped and saved successfully",
  "store": { /* store object */ },
  "details": {
    "shopify": { /* Shopify detection results */ },
    "activity": { /* Activity check results */ },
    "country": { /* Country detection results */ },
    "theme": { /* Theme detection results */ },
    "ads": { /* Ad detection results */ },
    "dropshipping": { /* Dropshipping detection results */ },
    "pod": { /* Print on Demand detection results */ }
  }
}
```

## Stage 1: Shopify Detection

**Purpose:** Verify that the URL is a Shopify store

**Detection Signals:**
- ✅ HTTP Headers: `x-shopify-stage`, `x-shopify-cache`, `x-request-id`
- ✅ CDN Assets: `cdn.shopify.com`, `cdn.shopifycdn.net`
- ✅ Meta Generator: `<meta name="generator" content="Shopify">`
- ✅ Shopify Objects: `Shopify`, `ShopifyAnalytics`, `Shopify.shop`
- ✅ Accessible Paths: `/products`, `/collections`, `/cart`, `/checkout`
- ✅ Cart & Checkout Scripts: `/cart.js`, `/checkout`, `shopify_pay`, `shopify-features`
- ✅ Theme Structure: `theme.css`, `theme.js`, `sections/*.liquid`, `templates/*.liquid`
- ✅ Domain Connection: `.myshopify.com` subdomain or CNAME
- ✅ Public JSON Endpoints: `/products.json`, `/collections.json`

**Confidence Threshold:** ≥30% signals detected = Shopify store

**Result:** If not Shopify, scraping stops and returns error.

---

## Stage 2: Store Activity Check

**Purpose:** Verify store is active and not dead/password protected

**Dead Store Markers:**
- ❌ `<div id="pg-store404">`
- ❌ Shopify Back Button: `<a class="back-button" href="https://www.shopify.com/?utm_source=ExpiredDomainLink">`
- ❌ Error Container: `<div id="shop-not-found" class="error-message">`
- ❌ Missing Storefront Content: No products, collections, cart, checkout
- ❌ Body contains: `pg-store404`, `shop-not-found`, `ExpiredDomainLink`, `store is currently unavailable`

**Password Protection:**
- ❌ Page title/body contains: "Enter using password", "This store is password protected"
- ❌ Shopify default password screen detected

**Result:** If dead or password protected, scraping stops and returns error. Store is marked as DEAD and skipped.

---

## Stage 3: Save Store

**Purpose:** Save valid stores to database

**Actions:**
- Normalize URL to root domain
- Extract store name (from title tag or domain)
- Get product count from `/products.json`
- Save to database with all detected metadata

**Result:** Store saved with initial data, ready for categorization.

---

## Stage 4: Country Detection & Tagging

**Purpose:** Detect store's country and assign country tag

**Detection Methods (in priority order):**

1. **Legal Pages (Best Signal)**
   - Check: `/policies/privacy-policy`, `/policies/terms-of-service`, `/policies/shipping-policy`, `/policies/refund-policy`
   - Look for: Country names, state/province names, VAT/EIN/ABN numbers
   - Phrases: "Governing law of California, USA", "Registered in England and Wales"

2. **Currency Used**
   - From: Product prices, cart, `<meta property="og:price:currency">`
   - Examples: USD → USA, GBP → UK, AUD → Australia, CAD → Canada
   - Check: `/meta.json`, `/cart.js` for `currency`, `country_code`, `money_format`

3. **Phone Numbers**
   - Patterns: `+1` → US/Canada, `+44` → UK, `+61` → Australia

4. **Domain TLD**
   - `.co.uk` → UK, `.com.au` → Australia, `.ca` → Canada
   - ⚠️ Weak alone, stronger combined

5. **Spelling & Language**
   - "Colour" → UK/AU, "Zip code" → US, "Postcode" → UK/AU

6. **Tax Mentions**
   - VAT → UK/EU, GST → AU/NZ/CA, Sales Tax → US

**Result:** Country assigned to store, stored in `country` field.

---

## Stage 5: Theme Detection

**Purpose:** Detect Shopify theme and assign theme tag

**Detection Methods (in priority order):**

1. **Meta Generator Tag (Most Reliable)**
   - `<meta name="generator" content="Shopify Theme: Dawn">`
   - ✅ 100% confirmed if theme name appears

2. **CSS/JS Filenames**
   - Look for: `assets/theme.css`, `assets/theme.js`, `assets/global.js`
   - Paid themes: `prestige.css`, `impulse.js`, `motion.css`, `warehouse.js`, `turbo.js`

3. **Unique DOM Classes**
   - Dawn: `.header-wrapper`, `.predictive-search`
   - Prestige: `.hero--prestige`, `.prestige-slider`
   - Impulse: `.impulse-collection-grid`
   - Motion: `.motion-reveal`
   - Turbo: `.turbo-grid`, `.js-turbo`

4. **JavaScript Theme Object**
   - Search for: `theme = { name: "Prestige", version: "7.3.1" }`

5. **Fallback: Product Count**
   - If < 15 products on homepage → Random free theme
   - If ≥ 15 products → Random premium theme

**Free Themes:** Dawn, Sense, Craft, Ride, Refresh, Studio, Taste, Origin, Spotlight, Crave, Debut

**Paid Themes:** Prestige, Impulse, Motion, Turbo, Warehouse

**Result:** Theme assigned to store, stored in `theme` field. If new theme discovered, filter is updated.

---

## Stage 6: Ad Detection

**Purpose:** Detect if store is running ads (Facebook, TikTok, Google)

**Strong Signals:**

1. **Facebook / Meta Pixel**
   - `facebook.com/tr`
   - `fbq('init'`
   - `connect.facebook.net`
   - `fb_pixel_id`

2. **TikTok Pixel**
   - `tiktok.com/pixel`
   - `ttq.track`
   - `tiktok_pixel_id`

3. **Google Ads / GTM**
   - `googletagmanager.com`
   - `gtag('config'`
   - `googleads.g.doubleclick.net`
   - `AW-` (Google Ads ID pattern)
   - `gtm-` (GTM ID pattern)

**Result:** If ads detected, store is tagged with **"Currently Running Ads"**.

---

## Stage 7: Business Model Detection

### Print on Demand Detection

**Signals:**
- ✅ POD Apps: `printful.com`, `printify.com`, `gelato.com`, `customcat.com`, `spod.com`, `teelaunch.com`, `jetprint.com`, `aop.plus`, `inkedjoy.com`
- ✅ Product Variant Explosion: Sizes XS → 5XL, 10–30 color variants, same design across many products
- ✅ Shipping Language: "Printed after you order", "Made to order", "Ships in 5–10 business days", "Production time"
- ✅ Mockup Style Images: Flat apparel mockups, same model across products, no real lifestyle photography
- ✅ No Inventory Language: No "Only 3 left", no warehouse language, no bulk pricing

**Result:** If POD detected, store is tagged with **"Print on Demand"**.

### Dropshipping Detection

**Strongest Signal (First Check):**
- ✅ Dropshipping Apps: DSers, Spocket, Zendrop, AutoDS, CJdropshipping, Zopi, Syncee, Dropshipman, Alibaba & AliExpress Dropship, Trendsi
- If any app detected → **Confirmed Dropshipping**

**Other Signals:**
- ✅ Long Shipping Times: "Delivery in 10–25 business days", "Ships from China/overseas"
- ✅ AliExpress-Style Product Copy: Feature-heavy bullet points, awkward grammar, no brand voice
- ✅ Supplier Images: White background, identical images found on many stores
- ✅ No Brand Identity: Weak About Us, no founder story, no physical address
- ✅ Multiple Unrelated Products: Kitchen + pets + electronics (no niche focus)
- ✅ Policies With Overseas Language: "Customs may apply", "International processing", "Supplier delays"
- ✅ Tracking From 17Track / Cainiao: Shipping links to `17track.net`, `cainiao.com`
- ✅ No Inventory Indicators: No SKU depth, no stock limits, no warehouse language
- ✅ High Discount Framing: "70% OFF TODAY", crossed-out prices, fake urgency timers

**Result:** 
- If POD detected → Tag: **"Print on Demand"**
- Else if Ads detected → Tag: **"Currently Running Ads"**
- Else if Dropshipping detected → Tag: **"Dropshipping"**
- Else → Default to **"Dropshipping"**

---

## Filter System

The filter system supports filtering by:

- **Country:** Filter by detected country
- **Theme:** Filter by Shopify theme (Dawn, Prestige, Impulse, etc.)
- **Tags/Category:** Filter by business model category
  - "Print on Demand"
  - "Currently Running Ads"
  - "Dropshipping"
- **Date Range:** Filter by `dateAdded` (when store was added)

**API Usage:**
```
GET /api/stores?countries=United States&themes=Dawn&tags=Print on Demand&dateFrom=2024-01-01&dateTo=2024-12-31
```

---

## Database Schema

Stores are saved with the following fields:

- `name`: Store name
- `url`: Normalized root URL
- `country`: Detected country
- `productCount`: Number of products
- `theme`: Detected Shopify theme
- `tags`: Array of category tags (e.g., ["Print on Demand", "Currently Running Ads"])
- `isActive`: Store is active
- `isShopify`: Confirmed Shopify store
- `hasFacebookAds`: Has Facebook ads detected
- `businessModel`: Primary business model
- `source`: Source identifier
- `shopifySignals`: JSON object with Shopify detection signals
- `discoveryMetadata`: JSON object with all detection metadata

---

## Usage Example

```javascript
// Scrape a single store
const response = await fetch('/api/stores/scrape', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    url: 'https://example-store.com',
    source: 'manual'
  })
});

const result = await response.json();
if (result.success) {
  console.log('Store saved:', result.store);
  console.log('Tags:', result.store.tags);
  console.log('Theme:', result.store.theme);
  console.log('Country:', result.store.country);
}
```

---

## Notes

- All detection stages run sequentially
- If any stage fails (not Shopify, dead store, password protected), scraping stops
- Stores are saved with all detected metadata for filtering
- Filter system automatically works with new tags and themes
- The system is optimized to handle rate limiting and errors gracefully
