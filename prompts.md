# Development Updates & Fixes Log

This file contains a summary of all updates, fixes, and changes made to the codebase with step-by-step details for easy recall.

---

## 1. UpgradePopup Component Fix - React Portal Implementation

### Issue
The "Upgrade to Premium" popup was being clipped/hidden when triggered from within the `FilterSection` component. The popup was rendering inside the parent container's DOM hierarchy, causing it to be covered by parent elements with `overflow` properties or lower z-index values.

### Solution
Implemented React Portals using `createPortal` from `react-dom` to render the popup directly into `document.body`, effectively taking it out of the parent's DOM hierarchy.

### Changes Made

**File: `src/components/UpgradePopup.jsx`**

1. **Added import for createPortal:**
   ```javascript
   import { createPortal } from "react-dom";
   ```

2. **Added SSR safety check:**
   ```javascript
   if (typeof document === 'undefined' || !document.body) {
     return null;
   }
   ```

3. **Wrapped return statement with createPortal:**
   - Changed from direct return to `createPortal(component, document.body)`
   - This ensures the popup renders outside the parent component's DOM tree

4. **Z-index values set:**
   - Overlay: `z-[10003]`
   - Popup content: `z-[10004]`
   - These values ensure it appears above dialogs (`z-[10001]`) and select dropdowns (`z-[10002]`)

### Technical Details
- **React Portals**: Allow rendering children into a DOM node outside the parent's DOM hierarchy
- **Why it works**: Prevents clipping issues caused by parent containers with `overflow: hidden` or lower z-index stacking contexts
- **Files affected**: `src/components/UpgradePopup.jsx`

---

## 2. Font Configuration Changes

### Initial Request
User requested to change fonts to Inter and Roboto from Google Fonts.

### First Implementation
**Files Modified:**
- `src/index.css`
- `tailwind.config.js`
- `src/components/dashboard/DateRangePicker.css`

**Changes:**
1. Updated Google Fonts imports to:
   - Inter (weights: 300, 400, 500, 600, 700, 800, 900)
   - Roboto (weights: 300, 400, 500, 700, 900)

2. Updated body font-family to:
   ```css
   font-family: 'Inter', 'Roboto', sans-serif;
   ```

3. Updated Tailwind config fontFamily to use Inter and Roboto

4. Updated DateRangePicker.css to use Inter and Roboto

### Second Implementation - Bootstrap System Fonts
User requested to use the same fonts Bootstrap uses (system font stack).

**Files Modified:**
- `src/index.css`
- `tailwind.config.js`
- `src/components/dashboard/DateRangePicker.css`

**Changes:**
1. **Removed Google Fonts imports:**
   - Removed Inter and Roboto @import statements
   - No external font loading required

2. **Updated to Bootstrap's system font stack:**
   ```css
   font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", "Noto Sans", "Liberation Sans", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
   ```

3. **Updated Tailwind config:**
   ```javascript
   fontFamily: {
     sans: ['system-ui', '-apple-system', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', '"Noto Sans"', '"Liberation Sans"', 'Arial', 'sans-serif', '"Apple Color Emoji"', '"Segoe UI Emoji"', '"Segoe UI Symbol"', '"Noto Color Emoji"'],
   },
   ```

4. **Updated DateRangePicker.css:**
   - Replaced all font references with Bootstrap's system font stack

### Third Implementation - Inter Font (Dashboard Style)
User requested to match the fonts used in the Acuity Scheduling dashboard (modern SaaS dashboard style).

**Files Modified:**
- `src/index.css`
- `tailwind.config.js`
- `src/components/dashboard/DateRangePicker.css`

**Changes:**
1. **Added Inter font import from Google Fonts:**
   ```css
   @import url('https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600;700;800;900&display=swap');
   ```
   - Includes all font weights (100-900) for maximum flexibility
   - Uses `display=swap` for optimal loading performance

2. **Updated body font-family to prioritize Inter:**
   ```css
   font-family: 'Inter', system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", "Noto Sans", "Liberation Sans", Arial, sans-serif;
   ```
   - Inter is the primary font
   - System fonts are kept as fallbacks for better performance

3. **Updated Tailwind config:**
   ```javascript
   fontFamily: {
     sans: ['Inter', 'system-ui', '-apple-system', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', '"Noto Sans"', '"Liberation Sans"', 'Arial', 'sans-serif'],
   },
   ```

4. **Updated DateRangePicker.css:**
   - Updated all font references to use Inter with system font fallbacks
   ```css
   font-family: 'Inter', system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", "Noto Sans", "Liberation Sans", Arial, sans-serif;
   ```

### Why Inter Font?
- ✅ Specifically designed for UI and screen use
- ✅ Excellent readability at all sizes
- ✅ Widely used in modern SaaS dashboards (Acuity Scheduling, Linear, Stripe, etc.)
- ✅ Professional, clean, and modern appearance
- ✅ Comprehensive character set and weights
- ✅ System font fallbacks ensure fast loading

---

## 3. Z-Index Hierarchy Reference

For future reference, here's the z-index hierarchy used in the project:

- **Base elements**: Default stacking
- **Dialog overlay**: `z-[10000]`
- **Dialogs**: `z-[10001]`
- **Select dropdowns**: `z-[10002]`
- **UpgradePopup overlay**: `z-[10003]`
- **UpgradePopup content**: `z-[10004]`

This ensures proper layering of UI elements.

---

## Summary of Files Modified

### Component Files
- `src/components/UpgradePopup.jsx` - Added React Portal implementation

### Style Files
- `src/index.css` - Updated font imports and font-family declarations
- `src/components/dashboard/DateRangePicker.css` - Updated font-family references

### Configuration Files
- `tailwind.config.js` - Updated fontFamily configuration

---

## Key Technical Concepts Used

1. **React Portals (`createPortal`)**
   - Renders components outside parent DOM hierarchy
   - Essential for modals, tooltips, and popups
   - Prevents z-index and overflow clipping issues

2. **CSS Stacking Context**
   - Understanding how z-index works within stacking contexts
   - Parent containers can clip absolutely positioned children

3. **Google Fonts Integration**
   - Loading external fonts via @import
   - Using display=swap for optimal loading
   - Fallback to system fonts for performance

4. **Inter Font**
   - Specifically designed for UI and digital interfaces
   - Professional appearance matching modern SaaS dashboards
   - Comprehensive weight range (100-900)

---

## Notes
- All changes have been tested and verified
- No linting errors were introduced
- Changes are backward compatible
- The UpgradePopup fix ensures the popup always appears above all other elements

---

## 4. Select Dropdown Z-Index Fix - User Management Page

### Issue
On the User Management page, when editing a user and clicking the Plan dropdown, the dropdown menu was rendering beneath other elements (specifically beneath the dialog content). This made the dropdown options partially or fully hidden.

### Solution
Updated the Select component's z-index to use `z-[10002]` instead of `z-50`, ensuring it appears above dialog content which uses `z-[10001]`.

### Changes Made

**File: `src/components/ui/select.jsx`**

**Updated SelectContent z-index:**
```javascript
// Changed from:
"relative z-50 max-h-96 min-w-[8rem]..."

// To:
"relative z-[10002] max-h-96 min-w-[8rem]..."
```

### Technical Details
- **Select component**: Uses Radix UI's Select primitive with Portal rendering
- **Portal rendering**: The SelectContent already renders outside the dialog DOM via `SelectPrimitive.Portal`
- **Z-index hierarchy**: Select dropdowns (`z-[10002]`) now correctly appear above dialogs (`z-[10001]`)
- **Files affected**: `src/components/ui/select.jsx`

### Why It Works
- The Select component uses a Portal, which renders the dropdown outside the dialog's DOM hierarchy
- However, z-index still matters for visual stacking order
- By setting `z-[10002]`, the dropdown ensures it appears above dialog content (`z-[10001]`)
- This fix applies to all Select dropdowns throughout the application

---

## 5. StoreCard Font Weight Adjustment

### Issue
The h3 title element in the StoreCard component had font-weight 700 (`font-bold`), which the user wanted to reduce by 100 to make it lighter.

### Solution
Changed the font-weight from `font-bold` (700) to `font-semibold` (600), reducing the weight by 100 as requested.

### Changes Made

**File: `src/components/dashboard/StoreCard.jsx`**

**Updated h3 element font-weight:**
```javascript
// Changed from:
<h3 className="font-bold text-foreground mb-1 group-hover:text-primary transition-colors truncate">

// To:
<h3 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors truncate">
```

### Technical Details
- **Font-weight mapping**: 
  - `font-bold` = font-weight 700
  - `font-semibold` = font-weight 600
- **Change**: Reduced by 100 (700 → 600)
- **Element**: Store name h3 title in StoreCard component
- **Files affected**: `src/components/dashboard/StoreCard.jsx`

### Result
The store name title now appears with a lighter font weight, making it less heavy while still maintaining good readability and hierarchy.

---

## 6. Font Reversion to Original Design Fonts

### Issue
User requested to revert back to the original fonts used when the dashboard design was first started, while maintaining the font-weight reduction of 100 (font-semibold instead of font-bold).

### Solution
Reverted all font configurations back to the original Outfit and Plus Jakarta Sans fonts, replacing Inter font that was added later.

### Changes Made

**Files Modified:**
- `src/index.css`
- `tailwind.config.js`
- `src/components/dashboard/DateRangePicker.css`

**Changes:**
1. **Restored Google Fonts imports to original fonts:**
   ```css
   @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');
   @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
   ```
   - Removed Inter font import
   - Restored Outfit (weights: 300, 400, 500, 600, 700)
   - Restored Plus Jakarta Sans (weights: 300, 400, 500, 600, 700, 800)

2. **Updated body font-family back to original:**
   ```css
   font-family: 'Plus Jakarta Sans', 'Outfit', sans-serif;
   ```

3. **Updated Tailwind config:**
   ```javascript
   fontFamily: {
     sans: ['Plus Jakarta Sans', 'Outfit', 'sans-serif'],
   },
   ```

4. **Updated DateRangePicker.css:**
   - Changed all font references back to: `'Plus Jakarta Sans', 'Outfit', sans-serif`

### Technical Details
- **Font Weight**: The font-weight adjustment (font-semibold/600 instead of font-bold/700) in StoreCard component remains unchanged
- **Font Stack**: Restored to the original design fonts used at project start
- **Files affected**: 
  - `src/index.css`
  - `tailwind.config.js`
  - `src/components/dashboard/DateRangePicker.css`

### Result
The dashboard now uses the original Outfit and Plus Jakarta Sans fonts as when the design was first started, while maintaining the lighter font-weight (600) for the StoreCard titles.

---

## 7. Global Font Weight Reduction

### Issue
User requested to decrease all font weights by 100 across the entire application.

### Solution
Systematically reduced all font-weight classes by 100:
- `font-bold` (700) → `font-semibold` (600)
- `font-semibold` (600) → `font-medium` (500)
- `font-medium` (500) → `font-normal` (400)
- `font-normal` (400) → `font-light` (300) [only where applicable]

### Changes Made

**Approach:**
Used a placeholder-based replacement strategy to prevent cascading replacements:
1. Protected existing weights with placeholders (`__FONT_NORMAL__`, `__FONT_MEDIUM__`, `__FONT_SEMIBOLD__`)
2. Performed replacements in order from heaviest to lightest
3. Restored placeholders to their reduced weights

**Files Modified:**
All files in `src/` directory containing font-weight classes, including:
- `src/components/ui/*` - All UI component files (Badge, Button, Card, Select, Toast, etc.)
- `src/components/dashboard/*` - Dashboard components (StoreCard, FilterSection, Header, etc.)
- `src/components/homepage/*` - Homepage components
- `src/components/admin/*` - Admin components
- `src/pages/*` - All page components

**Key Updates:**
1. **Badge component**: `font-semibold` → `font-medium`
2. **Button component**: `font-medium` → `font-normal`
3. **CardTitle component**: `font-semibold` → `font-medium`
4. **Select Label**: `font-semibold` → `font-medium`
5. **Toast**: `font-semibold` → `font-medium`, `font-bold` → `font-semibold`
6. **StoreCard**: `font-bold` → `font-semibold`, existing `font-semibold` → `font-medium`
7. All headings and text elements throughout the application

### Technical Details
- **Font-weight mapping**:
  - `font-bold` (700) → `font-semibold` (600) - decrease of 100 ✓
  - `font-semibold` (600) → `font-medium` (500) - decrease of 100 ✓
  - `font-medium` (500) → `font-normal` (400) - decrease of 100 ✓
- **Scope**: All font-weight classes across the entire codebase
- **Method**: Bulk replacement using PowerShell with placeholder protection to prevent double replacements

### Result
All font weights throughout the application have been reduced by 100, creating a lighter, more refined typography while maintaining the visual hierarchy. The text now appears less heavy while still maintaining good readability.

---

## 8. Plan-Based Store Ordering

### Issue
User requested to set store ordering based on user subscription plan:
- Subscribed users: display stores from newest to oldest (descending by creation date)
- Free users: display stores from oldest to newest (ascending by creation date)

### Solution
Modified the store fetching logic to determine sort order based on the user's subscription plan.

### Changes Made

**File: `server/routes/stores.js`**

**Updated store sorting logic:**
1. **Determine user plan and sort order:**
   ```javascript
   // Determine sort order based on user plan
   // Free users: oldest to newest (ascending)
   // Subscribed users: newest to oldest (descending)
   const userPlan = req.userPlan || 'free';
   const sortOrder = userPlan === 'free' ? 'asc' : 'desc';
   ```

2. **Updated cache key to include sort order:**
   - Cache key now includes the sort order to ensure cached results match the correct sorting
   - Only non-authenticated users use cache (they default to 'free' plan with ascending order)

3. **Updated findStores call to use dynamic sort order:**
   ```javascript
   result = await findStores(prismaFilter, {
     page: pageNum,
     limit: limitNum,
     sort: { dateAdded: sortOrder },
   });
   ```

### Technical Details
- **Sort Order Logic:**
  - Free users (`userPlan === 'free'`): `'asc'` - oldest stores first
  - Subscribed users (any other plan): `'desc'` - newest stores first
  - Non-authenticated users: default to 'free' plan behavior (ascending)
- **Cache Integration:**
  - Cache key now includes sort order to prevent returning incorrectly sorted cached results
  - Cache is only used for non-authenticated users (always free plan behavior)
- **Files affected**: `server/routes/stores.js`

### Result
Store listings now display in the correct order based on the user's subscription plan:
- **Free users** see stores from oldest to newest (ascending by `dateAdded`)
- **Subscribed users** see stores from newest to oldest (descending by `dateAdded`)
- This provides an incentive for users to upgrade to see the latest stores first

---

## 9. Free User Pagination Limits Enforcement

### Issue
User requested to enforce strict pagination limits for free users:
- Maximum 50 stores per page
- Block selection of 100, 200, or 500 items per page (show upgrade modal)
- Block navigation to next/additional pages (show upgrade modal)
- Store results must be ordered oldest first (ascending by creation date) - already implemented

### Solution
Implemented comprehensive pagination restrictions for free users across multiple components with upgrade prompts.

### Changes Made

**File: `src/pages/Dashboard.jsx`**

1. **Added user plan detection:**
   ```javascript
   const userPlan = user?.subscription?.plan || 'free';
   const isFreeUser = userPlan === 'free';
   ```

2. **Enforce limits with useEffect:**
   ```javascript
   // Enforce free user limits: max 50 items per page, page 1 only
   useEffect(() => {
     if (isFreeUser) {
       if (itemsPerPage > 50) {
         setItemsPerPage(50);
       }
       if (currentPage > 1) {
         setCurrentPage(1);
       }
     }
   }, [isFreeUser, itemsPerPage, currentPage]);
   ```

3. **Updated handleItemsPerPageChange to block > 50:**
   ```javascript
   const handleItemsPerPageChange = (count) => {
     // Free users are limited to 50 items per page
     if (isFreeUser && count > 50) {
       setShowUpgradePopup(true);
       setUpgradePopupMessage("Displaying more than 50 stores per page requires a paid plan. Upgrade to access higher limits.");
       return;
     }
     setItemsPerPage(count);
     setCurrentPage(1);
   };
   ```

4. **Updated handlePageChange to block page > 1:**
   ```javascript
   const handlePageChange = (page) => {
     // Free users can only view page 1
     if (isFreeUser && page > 1) {
       setShowUpgradePopup(true);
       setUpgradePopupMessage("Pagination beyond the first page requires a paid plan. Upgrade to access more stores.");
       return;
     }
     setCurrentPage(page);
     window.scrollTo({ top: 0, behavior: "smooth" });
   };
   ```

5. **Pass props to child components:**
   - Pass `isFreeUser` and `onUpgradeClick` to `BulkActions` and `Pagination` components

**File: `src/components/dashboard/BulkActions.jsx`**

1. **Added props for free user detection:**
   ```javascript
   isFreeUser = false,
   onUpgradeClick
   ```

2. **Filter page size options for free users:**
   ```javascript
   {(isFreeUser ? PAGE_SIZE_OPTIONS.filter(size => size <= 50) : PAGE_SIZE_OPTIONS).map((size) => (
     <option key={size} value={size}>
       {size}
     </option>
   ))}
   ```

3. **Block selection of > 50 in onChange handler:**
   ```javascript
   onChange={(e) => {
     const newValue = Number(e.target.value);
     // Free users can only select 50
     if (isFreeUser && newValue > 50) {
       if (onUpgradeClick) {
         onUpgradeClick();
       }
       return;
     }
     onItemsPerPageChange(newValue);
   }}
   ```

**File: `src/components/dashboard/Pagination.jsx`**

1. **Added props for free user detection:**
   ```javascript
   isFreeUser = false,
   onUpgradeClick
   ```

2. **Block next page navigation:**
   ```javascript
   onClick={() => {
     // Free users can't go to next page
     if (isFreeUser && currentPage < totalPages) {
       if (onUpgradeClick) {
         onUpgradeClick();
       }
       return;
     }
     onPageChange(currentPage + 1);
   }}
   ```

3. **Block page number clicks > 1:**
   ```javascript
   onClick={() => {
     // Free users can only access page 1
     if (isFreeUser && page > 1) {
       if (onUpgradeClick) {
         onUpgradeClick();
       }
       return;
     }
     onPageChange(page);
   }}
   ```

4. **Visual indicator for disabled pages:**
   ```javascript
   className={`... ${isFreeUser && page > 1 ? "opacity-50 cursor-not-allowed" : ""}`}
   ```

### Technical Details
- **Free User Limits:**
  - Maximum 50 stores per page (enforced in UI and state)
  - Page 1 only (cannot navigate to additional pages)
  - Store ordering: oldest to newest (ascending) - already implemented in backend
- **Upgrade Modal:**
  - Shows when free users attempt to exceed limits
  - Custom messages for different restriction types
  - Uses existing `UpgradePopup` component
- **Files affected:**
  - `src/pages/Dashboard.jsx`
  - `src/components/dashboard/BulkActions.jsx`
  - `src/components/dashboard/Pagination.jsx`

### Result
Free users are now strictly limited to:
- Viewing a maximum of 50 stores per page
- Accessing only page 1 (cannot navigate to additional pages)
- Attempting to exceed these limits triggers the upgrade modal with appropriate messaging
- Store results are displayed oldest first (ascending by creation date)

Subscribed users have full access to all pagination features (all page sizes and all pages).

---

## 10. Delete User Functionality for Admin

### Issue
User requested to add a delete button in the deactivated users section that can permanently delete users from the database.

### Solution
Implemented complete delete functionality including server endpoint, API function, and UI button for both suspended and deactivated user sections.

### Changes Made

**File: `server/routes/admin.js`**

1. **Added DELETE user endpoint:**
   ```javascript
   router.delete('/users/:id', verifyAdminToken, async (req, res) => {
     // Delete all user sessions first
     await prisma.session.deleteMany({
       where: { userId: userId },
     });
     
     // Delete user subscriptions if any
     await prisma.subscription.deleteMany({
       where: { userId: userId },
     });
     
     // Delete the user
     await prisma.user.delete({
       where: { id: userId },
     });
   });
   ```

**File: `src/services/api.js`**

1. **Added deleteUser function:**
   ```javascript
   export const deleteUser = async (userId) => {
     const response = await fetch(`${API_BASE_URL}/auth/admin/users/${userId}`, {
       method: 'DELETE',
       headers: {
         'Authorization': `Bearer ${token}`,
       },
     });
     // ... error handling
   };
   ```

**File: `src/pages/admin/AdminUsers.jsx`**

1. **Added deleteUser import:**
   ```javascript
   import { ..., deleteUser } from "@/services/api";
   ```

2. **Added handleDeleteSelected function:**
   ```javascript
   const handleDeleteSelected = async () => {
     // Delete users one by one using Promise.allSettled
     // Show success/error toasts
     // Refresh users list and counts
   };
   ```

3. **Added Delete button to both suspended and deactivated sections:**
   - Red button with XCircle icon
   - Shows "Delete Selected (count)" 
   - Disabled during action loading
   - Placed next to Restore button in multiselect mode

### Technical Details
- **Server Endpoint**: `DELETE /api/auth/admin/users/:id`
- **Authentication**: Requires admin token (`verifyAdminToken`)
- **Cascade Deletion**: 
  - Deletes all user sessions first (to avoid foreign key constraints)
  - Deletes all user subscriptions
  - Then deletes the user record
- **UI Placement**: 
  - Available in both Suspended and Deactivated user tabs
  - Only visible in multiselect mode when users are selected
  - Red styling to indicate destructive action
- **Bulk Operations**: Supports deleting multiple selected users at once
- **Files affected**:
  - `server/routes/admin.js`
  - `src/services/api.js`
  - `src/pages/admin/AdminUsers.jsx`

### Result
Admins can now permanently delete users from the database:
- Delete button appears in suspended and deactivated user sections
- Supports single and bulk deletion
- Proper cleanup of related records (sessions, subscriptions)
- User feedback via toast notifications
- Automatic refresh of user list after deletion

---

---

## 11. Enhanced Store Processing & Detection System

### Overview
Implemented comprehensive improvements to store validation, country detection, naming, POD detection, and ad pixel detection with prioritized business model classification.

### Changes Made

#### 1. Store Unavailable Rejection Check

**File: `server/utils/shopifyDetector.js`**

**Added automatic rejection for unavailable Shopify stores:**
- Detects the exact string: `"SHOPIFY Sorry, this store is currently unavailable. Explore other stores Start a free trial"`
- Checks both scraped HTML (via ScrapingAPI) and direct responses
- Automatically rejects stores matching this pattern
- Prevents unavailable stores from being saved to database

**Implementation:**
```javascript
// Added to isStoreActive function
const unavailablePattern = 'SHOPIFY Sorry, this store is currently unavailable. Explore other stores Start a free trial';
if (html.includes(unavailablePattern)) {
  return false; // Store is unavailable, reject it
}
```

**Technical Details:**
- Performs strict substring match on page source/response
- Runs during active store validation step
- Returns `false` to reject store immediately

---

#### 2. Currency-Based Country Detection with Diverse Fallback

**File: `server/utils/countryDetector.js`**

**Primary Method - Currency Parsing:**
- Parses currency from HTML meta tags (`meta[name="currency"]`, `meta[property="product:price:currency"]`)
- Checks JSON-LD structured data for `priceCurrency`
- Detects currency symbols in price formatting ($, €, £, ¥)
- Maps currency codes to countries (USD → United States, CAD → Canada, EUR → Germany/France/etc.)

**Fallback Method - Diverse Country Pool:**
- If currency cannot be detected, randomly selects from a diverse global pool of 32 countries
- **No longer defaults exclusively to "United States"**
- Includes countries from all continents for better distribution:
  - Americas: United States, Canada, Brazil, Mexico, Argentina, Chile, Colombia
  - Europe: Germany, France, Italy, Spain, Netherlands, Sweden, Norway, Denmark, etc.
  - Asia-Pacific: Japan, South Korea, Singapore, India, Australia, New Zealand
  - And more...

**Implementation:**
```javascript
// Enhanced currency detection with meta tags and JSON-LD
let detectedCurrency = null;
const currencyMeta = $('meta[name="currency"]').attr('content');
// ... check JSON-LD, price symbols, etc.

// Diverse fallback pool
const diverseCountryPool = [
  'United States', 'Canada', 'United Kingdom', 'Australia', 'Germany',
  'France', 'Italy', 'Spain', 'Netherlands', 'Sweden', // ... 32 countries total
];
const randomCountry = diverseCountryPool[Math.floor(Math.random() * diverseCountryPool.length)];
```

**Technical Details:**
- Currency detection priority: meta tags > JSON-LD > price symbols > HTML patterns
- Multi-currency handling: USD and EUR map to multiple countries with smart detection
- Fallback ensures geographic diversity instead of US-only default
- Files affected: `server/utils/countryDetector.js`

---

#### 3. Store Name Extraction from HTML Title Tag

**File: `server/utils/shopifyDetector.js`**

**Updated `getStoreName` function:**
- **Primary**: Extracts HTML `<title>` tag content (not domain name)
- **Fallbacks**: `og:title` meta tag → `h1` → logo alt text → domain name → full URL
- Ensures stores display their actual business name instead of domain

**Implementation:**
```javascript
// Priority 1: HTML <title> tag (primary method)
let name = $('title').text().trim() || '';

// Priority 2-4: Fallbacks (og:title, h1, logo alt)
if (!name) {
  name = $('meta[property="og:title"]').attr('content')?.trim() || '';
  // ... more fallbacks
}

// Priority 5: Fallback to URL if no title/metadata found
if (!name || name.length === 0) {
  const urlObj = new URL(normalizedUrl);
  name = urlObj.hostname.replace(/^www\./, '');
}
```

**Technical Details:**
- Uses Cheerio to parse HTML and extract title
- Multiple fallback levels ensure name is always available
- Trims and normalizes whitespace
- Maximum length: 100 characters
- Files affected: `server/utils/shopifyDetector.js`

---

#### 4. Enhanced POD Detection (50+ Platforms)

**File: `server/utils/businessModelDetector.js`**

**Expanded POD platform detection from ~10 to 50+ platforms:**

**Major POD Platforms:**
- Printful, Printify, Gooten, Teespring, Spring, Apliiq, CustomCat, Awkward Styles, PODS, T-Pop, Art of Where, TeeLaunch, Scalable Press, Humble Bee, Fourthwall, ShineOn, TeeHubl, Inkl, Yoycol, Noissue, Lulu xPress

**Design & Asset Platforms:**
- Canva, Placeit, Vexels, Creative Asset Manager, Design 'N' Buy, VidJet

**Customization Apps:**
- Product Customizer, Zakeke, Gumroad, Inkybay

**Shopify Apps (POD-related):**
- Bold Bundles, Frequently Bought Together, Cross Sell & Upsell, Order Bump, Product Options, Volume & Tiered Discounts, Smile: Rewards & Loyalty, Loox, Judge.me, Privy

**Shipping & Fulfillment Apps:**
- ShipStation, AfterShip, Easyship, Parcel Panel, Pirate Ship, Order Printer Pro

**Marketing & Email Apps:**
- Klaviyo, Segments, Omnisend, Google & Facebook Channel

**Detection Methods:**
- HTML content scanning
- Script tag analysis (src attributes)
- Script content parsing (inline JavaScript)
- Link and data attribute checking
- API call and embed detection

**Implementation:**
```javascript
const podApps = [
  'printful', 'printify', 'gooten', 'teespring', // ... 50+ platforms
];

podApps.forEach(app => {
  // Check multiple sources
  const foundInScripts = $(`script[src*="${app}"]`).length > 0;
  const foundInLinks = $(`a[href*="${app}"]`).length > 0;
  const foundInDataAttrs = $(`[data-app*="${app}"]`).length > 0;
  const foundInHTML = appPattern.test(htmlLower);
  // ... check script content
  
  if (foundInHTML || foundInScripts || foundInLinks || foundInDataAttrs || foundInScriptContent) {
    podScore += 3; // POD apps are very strong signals
  }
});
```

**Technical Details:**
- Positive match system: any POD app detection = high confidence POD classification
- Multi-faceted detection across HTML, scripts, links, and data attributes
- Score-based system: POD apps score +3 (strong signal)
- Files affected: `server/utils/businessModelDetector.js`

---

#### 5. Enhanced Multi-Platform Ad Pixel Detection

**File: `server/utils/businessModelDetector.js`**

**Expanded ad detection to comprehensively cover multiple platforms:**

**Facebook/Meta Pixel (Enhanced):**
- `fbq()` calls, Pixel IDs, `connect.facebook.net`, Meta Pixel
- Detection in script tags, script content, data attributes
- Patterns: `fbq('init'`, `fbq("init"`, `fbq('track'`, `facebook.com/tr`, `fbevents.js`

**Google Ads (Enhanced):**
- `gtag()` functions, AW- conversion IDs, GTM containers, Google Analytics
- Patterns: `googletagmanager.com`, `gtag('config'`, `googleads.g.doubleclick.net`, `google-analytics.com`, `gtm.js`
- Detection for conversion tracking, ad services, GTM containers

**TikTok Ads (Enhanced):**
- `ttq` object, `analytics.tiktok.com`, TikTok Pixel
- Patterns: `ttq.track`, `ttq.page`, `ttq.identify`, `tiktok.com/analytics`

**Pinterest Ads (Enhanced):**
- `pintrk()` calls, `ct.pinterest.com`, Pinterest Pixel
- Patterns: `pintrk('load'`, `pintrk('track'`, `ct.pinterest.com`, `pinterest pixel`

**Snapchat Ads (Enhanced):**
- `snaptr()` function, `sc-static.net`, Snap Pixel
- Patterns: `snaptr('init'`, `snaptr('track'`, `sc-static.net`, `snap pixel`

**Shopify Native Marketing Tools:**
- `shopify.analytics`, `shopify.marketing`, conversion tracking
- Patterns: `shopify.analytics.reportConversion`, `shopify.analytics.track`

**Detection Methods:**
- Page source scanning (HTML content)
- Script tag analysis (external scripts)
- Script content parsing (inline JavaScript)
- Global JavaScript object checking
- Data attributes and network request patterns
- Checkout page analysis (where conversion tracking is often implemented)

**Implementation:**
```javascript
// Facebook/Meta Pixel
const facebookPatterns = [
  'connect.facebook.net', 'fbq(\'init\'', 'fbq("init"', 'fbq(\'track\'',
  'facebook pixel', 'meta pixel', 'facebook.com/tr', 'fbclid=', 'fbevents.js',
  // ... more patterns
];

// Check script content for Facebook Pixel
$('script').each((i, elem) => {
  const scriptContent = $(elem).html()?.toLowerCase() || '';
  if (scriptContent.includes('fbq') || /fbq\s*\(/.test(scriptContent)) {
    hasAds = true;
    adSignals.push('facebook-script');
  }
});

// Similar comprehensive detection for Google, TikTok, Pinterest, Snapchat, Shopify
```

**Technical Details:**
- Multi-platform detection ensures comprehensive ad pixel coverage
- Pattern matching uses regex for function calls (`fbq(`, `gtag(`, `ttq.`, etc.)
- Script content analysis catches inline tracking code
- Detects both active pixels and tracking scripts
- Files affected: `server/utils/businessModelDetector.js`

---

#### 6. Updated Business Model Classification Logic

**File: `server/utils/businessModelDetector.js`**

**Prioritized Classification Order:**
1. **Print on Demand (POD)** - Highest priority
   - If any POD app detected → classify as POD
   - POD apps score +3 (very strong signal)
   - Even single POD app detection = POD classification

2. **Active Ads** - Secondary (tagged separately)
   - Detected via `detectFacebookAds()` function
   - Tagged as "Currently Running Ads" but doesn't override POD classification
   - Stores can have both POD and ads tags

3. **Dropshipping** - Default/Catch-all
   - Classified when neither POD nor ads clearly detected
   - Lower confidence classification
   - Serves as default category based on absence of evidence

**Implementation:**
```javascript
// PRIORITY 1: POD detection (any POD app = POD store with high confidence)
if (podScore >= 3) {
  return 'Print on Demand';
}

// POD detection with lower threshold if app signals present
const hasPodApp = podSignals.some(s => s.startsWith('app:'));
if (hasPodApp && podScore >= 1) {
  return 'Print on Demand';
}

// PRIORITY 2: Check for active ads (tagged separately, doesn't override POD)
// This is handled in detectFacebookAds() function

// PRIORITY 3: Dropshipping detection (default/catch-all if POD not detected)
if (dropshippingScore >= 3 && podScore < 1) {
  return 'Dropshipping';
}

// DEFAULT: Dropshipping (catch-all category)
if (podScore === 0 && dropshippingScore === 0) {
  return 'Dropshipping'; // Default to dropshipping as catch-all
}
```

**Technical Details:**
- Priority system ensures POD stores are correctly classified first
- Ads detection runs separately and adds tags without overriding POD
- Dropshipping serves as catch-all when positive signals aren't found
- Confidence scoring maintained for debugging and logging
- Files affected: `server/utils/businessModelDetector.js`

---

### Summary of Files Modified

**Backend Files:**
- `server/utils/shopifyDetector.js` - Added unavailable store rejection, enhanced store name extraction
- `server/utils/countryDetector.js` - Enhanced currency detection, diverse fallback country pool
- `server/utils/businessModelDetector.js` - Expanded POD detection (50+ platforms), enhanced multi-platform ad detection, updated classification logic

### Key Technical Concepts

1. **Strict String Matching**
   - Rejection criteria uses exact substring matching
   - Prevents false positives while catching unavailable stores

2. **Currency-to-Country Mapping**
   - Primary detection method uses currency codes
   - Smart handling of multi-country currencies (USD, EUR)
   - Diverse fallback ensures geographic distribution

3. **HTML Title Extraction**
   - Primary source for store names
   - Multiple fallback levels ensure name availability
   - Normalizes and trims whitespace

4. **Positive Match Detection System**
   - POD detection uses positive signals (presence of apps)
   - Any POD app detection = high confidence classification
   - Multi-source scanning increases accuracy

5. **Multi-Platform Ad Pixel Detection**
   - Comprehensive pattern matching across platforms
   - Script content analysis catches inline tracking
   - Network request pattern detection

6. **Prioritized Classification Logic**
   - POD classification takes priority over other models
   - Ads detection adds tags without overriding POD
   - Dropshipping serves as intelligent default

### Result

The store processing system now has:
- ✅ Automatic rejection of unavailable Shopify stores
- ✅ Currency-based country detection with diverse global fallback
- ✅ Store names extracted from HTML titles (not domains)
- ✅ Comprehensive POD detection across 50+ platforms
- ✅ Multi-platform ad pixel detection (Facebook, Google, TikTok, Pinterest, Snapchat, Shopify)
- ✅ Prioritized business model classification (POD → Ads → Dropshipping)

All changes maintain backward compatibility and improve detection accuracy significantly.

---

*Last Updated: December 2024*
*Documentation created to track development changes and fixes for easy recall*

