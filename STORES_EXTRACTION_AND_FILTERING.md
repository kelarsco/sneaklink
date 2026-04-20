# Current Process: Extracting Stores & Filtering Them

## 1. Extracting stores (how stores get into the database)

### A. Automatic scraping (scheduled)

- **Trigger:** Every **20 minutes** (cron in `server/server.js`), plus an **initial run 30 seconds** after server start.
- **Service:** `server/services/shopifyStoreScraper.js` → `runShopifyStoreScraping()`.
- **Sources:**
  1. **Reddit** – Subreddits (e.g. r/shopify, r/ecommerce, r/dropshipping). Extracts URLs from posts; keeps only **`.myshopify.com`** domains and skips big brands.
  2. **Global search** – If `GOOGLE_CSE_API_KEY`, `SERPAPI_KEY`, or `SERPER_API_KEY` is set: runs queries like `site:myshopify.com` and collects result URLs (`.myshopify.com` only, big brands excluded).
  3. **WHOISXML** – If `WHOISXML_API_KEY` is set: uses Certificate Transparency (or verification) to find `.myshopify.com` domains (when implemented).
- **Per-URL pipeline:** Each discovered URL is passed to **`scrapeStore()`** in `server/services/storeScraperService.js`, which runs the **7-stage detection**:
  1. **Stage 1 – Shopify detection** (headers, CDN, meta generator, paths, cart/checkout scripts, etc.).
  2. **Stage 2 – Activity check** (reject dead / 404 / password-protected).
  3. **Stage 3 – Save** (only if 1 and 2 pass).
  4. **Stage 4 – Country** (legal pages, currency, TLD, etc.).
  5. **Stage 5 – Theme** (meta, CSS/JS, DOM classes, fallbacks).
  6. **Stage 6 – Ads** (Facebook, TikTok, Google pixels).
  7. **Stage 7 – Business model** (POD vs Dropshipping; “Currently Running Ads” tag).
- **Result:** Only stores that pass stages 1–2 are **saved**; stages 4–7 set **country**, **theme**, **tags** (e.g. Print on Demand, Dropshipping, Currently Running Ads).

### B. Manual single-store add

- **Endpoint:** `POST /api/stores` (auth required).
- **Body:** `{ url, source }`.
- **Flow:** Uses **discovery service** (`saveDiscoveredStore` in `server/services/discoveryService.js`) to save the URL; later the **verification/classification pipeline** can run (depending on your setup). Manual adds may also go through the same 7-stage pipeline if you trigger it (e.g. via a scrape endpoint that calls `scrapeStore(url)`).

### C. Manual single-store scrape (full 7-stage)

- **Endpoint:** `POST /api/stores/scrape` (auth + plan that allows scraping).
- **Body:** `{ url, source }`.
- **Flow:** Calls **`scrapeStore(url)`** directly → full 7-stage detection and save (same as automatic scraping per URL).

---

## 2. Filtering stores (how the list is built for the UI)

### A. API: `GET /api/stores`

- **Route:** `server/routes/stores.js` (GET `/`).
- **Middleware:** `optionalAuth`, `trackDevice`, `validatePagination`, `validateFilters`, **`checkFilterQueryUsage`**.

### B. Visibility (who can see which stores)

- **Logic:** `server/utils/visibilityRules.js` → **`buildVisibilityFilter()`**.
- **Default (non-admin):** A store is included only if it matches one of:
  - **New system:** `verified === true` and `storeStatus === 'active'`, or  
  - **Old system:** `shopifyStatus` in `['confirmed','probable']`, `isShopify === true`, `isActive === true`, or  
  - **Pending:** `storeStatus === 'pending'` and `isActive === true` (and possibly other pending rules).
- **Excluded:** `storeStatus` in `dead`, `inactive_shopify`, `blocked`; `healthStatus` in `nonexistent`, `password_protected` (unless admin overrides).
- **Admin overrides (query):** `includeProtected`, `includeInactive`, `includeUnverified` (only if admin).

So **extraction** fills the DB; **visibility** decides which of those rows can appear in the list at all.

### C. User-facing filters (query params)

Applied **on top of** the visibility filter (all in `server/routes/stores.js`):

| Query param | Effect | Backend field |
|-------------|--------|----------------|
| `countries` | Match any of the given countries | `country` `in` list |
| `themes`    | Match any of the given themes     | `theme` `in` list |
| `tags`      | Match any of the given tags      | `tags` `hasSome` list |
| `dateFrom`  | Store added on or after date     | `dateAdded` `gte` |
| `dateTo`    | Store added on or before date    | `dateAdded` `lte` |
| `page`      | Page number                      | Pagination |
| `limit`     | Page size (default 50)           | Pagination |

- **Validation:** `validateFilters` (in `server/middleware/validator.js`) sanitizes and normalizes these (e.g. date format, array params).
- **Plan rule:** **Filtering is a paid feature.** `checkFilterQueryUsage` (in `server/middleware/usageTracking.js`):
  - If **no** filter params are sent → request is allowed (unfiltered list; free users can see it).
  - If **any** filter is sent → user must be **logged in** and on a plan that **allows filters** (`canUseFilters`); otherwise 403. Filter usage is also counted for monthly limits.

### D. Sort

- **Free plan:** `dateAdded` **asc** (oldest first).
- **Paid plan:** `dateAdded` **desc** (newest first).

### E. Execution and response

- **DB layer:** `findStores(prismaFilter, { page, limit, sort })` in `server/utils/prismaHelpers.js` runs the combined **visibility + filter** conditions and pagination.
- **Cache:** Unauthenticated (free) requests can be served from **query cache** (`getCachedSearchResults` / `cacheSearchResults` in `server/utils/queryCache.js`) to reduce DB load.
- **Response:** `{ stores, pagination: { page, limit, total, totalPages }, plan? }`. Theme fallback is applied so every store has a display theme (e.g. random free theme if missing).

---

## 3. Frontend: how filters are sent

- **Client:** `src/services/api.js` → **`fetchStores(filters, page, limit)`**.
- **Params sent:** `countries`, `themes`, `tags`, `dateRange.from` → `dateFrom`, `dateRange.to` → `dateTo`, `filterCount` (for usage), plus `page` and `limit`.
- **Auth:** Sends `Authorization: Bearer <authToken>` when available (needed for filtered requests).
- **UI:** Dashboard (and any store list) calls `fetchStores` with the user-selected filters; the backend applies visibility + filters and returns the list.

---

## 4. End-to-end summary

| Step | What happens |
|------|-----------------------------|
| **Extraction** | Reddit / global search / WHOISXML find `.myshopify.com` URLs → `scrapeStore()` runs 7-stage detection → only valid, active Shopify stores are saved with country, theme, tags. |
| **Visibility** | Every `GET /api/stores` applies `buildVisibilityFilter()` so only verified/pending active stores (and not dead/password-protected/etc.) are considered. |
| **Filtering** | Optional: user sends `countries`, `themes`, `tags`, `dateFrom`, `dateTo`. Allowed only for logged-in users on a plan with `canUseFilters`; usage is tracked. |
| **Sort** | Free: oldest first. Paid: newest first. |
| **Response** | Paginated list of stores that passed visibility and (if any) user filters, with theme fallback and optional cache for unfiltered free requests. |

So: **extraction** = how stores get into the DB (scraping + 7-stage pipeline); **filtering** = visibility rules + optional country/theme/tags/date filters and plan checks when returning that list to the user.
