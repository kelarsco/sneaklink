# Google OAuth Troubleshooting Guide

## Current Error: "Can't continue with google.com. Something went wrong"

This error typically occurs when Google OAuth is not properly configured in Google Cloud Console. Follow these steps to diagnose and fix:

## Step 1: Verify Backend is Running

1. **Check if backend server is running:**
   ```bash
   cd server
   npm run dev
   ```

2. **Test the backend endpoint:**
   Open your browser and visit:
   ```
   http://localhost:3000/api/auth/google/url
   ```
   
   **Expected:** JSON response with `authUrl`
   **If error:** Check server console for error messages

## Step 2: Check Google Cloud Console Configuration

### A. Verify Authorized JavaScript Origins

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to: **APIs & Services** → **Credentials**
3. Click on your OAuth 2.0 Client ID
4. Under **Authorized JavaScript origins**, make sure you have:
   ```
   http://localhost:8080
   http://localhost:5173
   ```
   (Add both - Vite might use port 5173)

### B. Verify Authorized Redirect URIs

Under **Authorized redirect URIs**, add:
```
http://localhost:8080/auth/google/callback
http://localhost:5173/auth/google/callback
```

**Important:** 
- No trailing slashes
- Must match exactly (including `http://` not `https://`)
- Case-sensitive

### C. Check OAuth Consent Screen

1. Go to: **APIs & Services** → **OAuth consent screen**
2. Make sure:
   - App is in **Testing** mode (for development)
   - Your email is added as a **Test user** (if using External app type)
   - App name and support email are filled in

## Step 3: Verify Environment Variables

### Frontend (.env in root):
```env
VITE_GOOGLE_CLIENT_ID=897917467114-eabq6cjm1hq5vdjopr0j73onrfnsn20n.apps.googleusercontent.com
VITE_API_URL=http://localhost:3000/api
```

### Backend (server/.env):
```env
GOOGLE_CLIENT_ID=897917467114-eabq6cjm1hq5vdjopr0j73onrfnsn20n.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
GOOGLE_REDIRECT_URI=http://localhost:8080/auth/google/callback
JWT_SECRET=796cfbc9294e2ac014bb123384123b33f8ae431f1ceb090a46ad1390970d08dedd8faa27d3335981dadc2550f5e4fd398325067e6dccc0dd4b2e04f5ea737bbe
```

**Important:**
- Frontend and backend must use the **SAME** Client ID
- Restart both servers after changing `.env` files

## Step 4: Test the Setup

### Test 1: Check Browser Console

1. Open login page: `http://localhost:8080/login`
2. Open browser DevTools (F12)
3. Go to **Console** tab
4. Click "Continue with Google"
5. Look for errors - common ones:
   - `"Invalid origin"` → JavaScript origins not configured
   - `"redirect_uri_mismatch"` → Redirect URI not configured
   - `"Network error"` → Backend not running

### Test 2: Test Backend Endpoint

Open browser console and run:
```javascript
fetch('http://localhost:3000/api/auth/google/verify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ idToken: 'test' })
})
.then(r => r.json())
.then(console.log)
.catch(console.error)
```

**Expected:** Error about invalid token (this is OK - means endpoint is working)
**If error:** Backend not running or not configured

### Test 3: Check Network Tab

1. Open DevTools → **Network** tab
2. Click "Continue with Google"
3. Look for:
   - Request to `accounts.google.com` → Should be 200 OK
   - Request to `/api/auth/google/verify` → Should exist
   - Any red/failed requests

## Step 5: Common Fixes

### Fix 1: Add Missing JavaScript Origins

1. Go to Google Cloud Console → Credentials
2. Edit your OAuth Client ID
3. Add to **Authorized JavaScript origins**:
   ```
   http://localhost:8080
   http://localhost:5173
   http://127.0.0.1:8080
   http://127.0.0.1:5173
   ```
4. Click **Save**
5. **Wait 5-10 minutes** for changes to propagate
6. Clear browser cache and try again

### Fix 2: Add Test User (If App is in Testing Mode)

1. Go to OAuth Consent Screen
2. Scroll to **Test users**
3. Click **+ ADD USERS**
4. Add your Google account email
5. Save and try login again

### Fix 3: Check Client ID Match

Make sure:
- Frontend `.env`: `VITE_GOOGLE_CLIENT_ID` matches
- Backend `server/.env`: `GOOGLE_CLIENT_ID` matches
- Google Console: The Client ID shown matches

### Fix 4: Restart Servers

After changing `.env` files:
```bash
# Stop both servers (Ctrl+C)
# Then restart:

# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend
npm run dev
```

## Step 6: Debug Mode

Add this to your browser console to see what's happening:

```javascript
// Check if Google script loaded
console.log('Google loaded:', typeof window.google !== 'undefined');

// Check client ID
console.log('Client ID:', import.meta.env.VITE_GOOGLE_CLIENT_ID);

// Monitor Google sign-in events
window.addEventListener('message', (e) => {
  if (e.data.type === 'google-oauth') {
    console.log('Google OAuth event:', e.data);
  }
});
```

## Still Not Working?

1. **Check Google Cloud Console for errors:**
   - Go to APIs & Services → Dashboard
   - Look for any error messages or warnings

2. **Verify the exact error in browser console:**
   - Open DevTools → Console
   - Look for the exact error message
   - Share the error for further debugging

3. **Test with a different browser:**
   - Sometimes browser extensions block OAuth
   - Try incognito/private mode

4. **Check if port is correct:**
   - Your app might be running on a different port
   - Check the URL in browser address bar
   - Add that exact URL to Google Console

## Quick Checklist

- [ ] Backend server is running (`npm run dev` in server folder)
- [ ] Frontend server is running (`npm run dev` in root)
- [ ] `http://localhost:8080` is in Authorized JavaScript origins
- [ ] `http://localhost:5173` is in Authorized JavaScript origins (if using Vite default port)
- [ ] OAuth consent screen is configured
- [ ] Your email is added as test user (if app is in testing mode)
- [ ] Frontend and backend `.env` files have matching Client IDs
- [ ] Both servers restarted after `.env` changes
- [ ] Browser cache cleared (Ctrl+Shift+R)

## Next Steps After Fixing

Once login works:
1. Test the full flow: Login → Dashboard → Logout
2. Check that user data is saved in MongoDB
3. Verify JWT token is stored in localStorage
4. Test protected routes
