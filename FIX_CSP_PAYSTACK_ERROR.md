# Fix CSP Paystack Error

## Error Message

```
The source list for Content Security Policy directive 'script-src-elem' contains a source with an invalid path: '/v2.22/fingerprint?MerchantId=...'. The query component, including the '?', will be ignored.
```

## Root Cause

Paystack loads fingerprint scripts from paths like `/v2.22/fingerprint?MerchantId=...`, but:

1. **CSP doesn't support query strings** - Query parameters in CSP source lists are ignored
2. **Missing `scriptSrcElem` directive** - Modern browsers need both `script-src` and `script-src-elem`
3. **Paystack domains not fully allowed** - Need to allow `*.paystack.co` wildcard

## Solution Applied

Updated the CSP configuration in `server/server.js` to:

1. **Added `scriptSrcElem` directive** - For `<script>` elements specifically
2. **Added Paystack wildcard domains** - `https://*.paystack.co` to allow all Paystack subdomains
3. **Added Paystack base domain** - `https://paystack.com` for direct Paystack resources
4. **Updated `connectSrc`** - Allow API calls to Paystack
5. **Updated `frameSrc`** - Allow Paystack payment iframes

## What Changed

### Before:
```javascript
scriptSrc: ["'self'", "https://accounts.google.com", "https://js.paystack.co"],
```

### After:
```javascript
scriptSrc: [
  "'self'", 
  "https://accounts.google.com", 
  "https://js.paystack.co",
  "https://*.paystack.co",
  "https://paystack.com"
],
scriptSrcElem: [
  "'self'",
  "https://accounts.google.com",
  "https://js.paystack.co",
  "https://*.paystack.co",
  "https://paystack.com"
],
connectSrc: [
  "'self'", 
  "https://accounts.google.com", 
  "https://oauth2.googleapis.com",
  "https://api.paystack.co",
  "https://*.paystack.co"
],
frameSrc: [
  "'self'", 
  "https://accounts.google.com",
  "https://*.paystack.co",
  "https://paystack.com"
],
```

## Why This Fixes It

1. **Wildcard domain** (`https://*.paystack.co`) allows scripts from any Paystack subdomain
2. **scriptSrcElem** handles `<script>` tags separately from inline scripts
3. **connectSrc** allows API calls to Paystack for payment processing
4. **frameSrc** allows Paystack payment modal iframes

## Next Steps

1. **Restart your server**:
   ```bash
   cd server
   npm run dev
   ```

2. **Clear browser cache** (or use incognito mode):
   - CSP headers are cached by browsers
   - Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)

3. **Test payment flow**:
   - The CSP warnings should disappear
   - Paystack payment modal should load correctly
   - Fingerprint scripts should load without errors

## Verification

After restarting:

1. ✅ CSP warnings should disappear from console
2. ✅ Paystack payment modal loads correctly
3. ✅ No errors about fingerprint scripts
4. ✅ Payment verification works

## Note About Query Strings

The warning about query strings being ignored is expected and harmless. CSP ignores query parameters in source lists, but allowing the base path `/v2.22/fingerprint` with wildcard domain `https://*.paystack.co` ensures the script can load from any Paystack subdomain.

## Security Considerations

✅ **Still Secure:**
- Only allows Paystack domains (not arbitrary scripts)
- Uses specific domains, not `'unsafe-inline'` or `*`
- Maintains protection against XSS attacks

⚠️ **Trade-off:**
- Allows scripts from `*.paystack.co` - necessary for Paystack integration
- This is standard practice for payment gateway integrations
