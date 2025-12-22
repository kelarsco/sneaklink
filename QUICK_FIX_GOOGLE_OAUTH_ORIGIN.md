# Quick Fix: Google OAuth "Origin Not Allowed" Error

## The Error
```
[GSI_LOGGER]: The given origin is not allowed for the given client ID
```

## Quick Fix (5 minutes)

### Step 1: Go to Google Cloud Console
1. Visit: https://console.cloud.google.com/
2. Select your project
3. Go to **APIs & Services** → **Credentials**

### Step 2: Edit Your OAuth 2.0 Client ID
1. Find the OAuth 2.0 Client ID that matches: `897917467114-eabq6cjm1hq5vdjopr0j73onrfnsn20n.apps.googleusercontent.com`
2. Click on it to edit

### Step 3: Add Authorized JavaScript Origins
Click **"+ ADD URI"** and add these EXACT URLs (one at a time):
- `http://localhost:8080`
- `http://127.0.0.1:8080`
- `http://localhost:5173` (if using Vite default port)
- `http://127.0.0.1:5173`

### Step 4: Add Authorized Redirect URIs
Click **"+ ADD URI"** and add:
- `http://localhost:8080`
- `http://127.0.0.1:8080`
- `http://localhost:8080/auth/google/callback`
- `http://127.0.0.1:8080/auth/google/callback`

### Step 5: Save and Wait
1. Click **SAVE** at the bottom
2. **Wait 2-3 minutes** for Google to propagate changes
3. Clear your browser cache or use incognito mode
4. Restart your dev server

## Verify It's Fixed
1. Open your app in browser
2. Click "Sign in with Google"
3. You should see the Google sign-in popup WITHOUT the origin error

## Still Not Working?

### Check Your Environment Variables
Make sure your `.env` file (in root directory) has:
```env
VITE_GOOGLE_CLIENT_ID=897917467114-eabq6cjm1hq5vdjopr0j73onrfnsn20n.apps.googleusercontent.com
VITE_API_URL=http://localhost:3000/api
```

### Check Backend Server
Make sure your backend is running:
```bash
cd server
npm run dev
```

The server should be running on `http://localhost:3000`

### Clear Browser Cache
- Press `Ctrl+Shift+Delete` (Windows) or `Cmd+Shift+Delete` (Mac)
- Select "Cached images and files"
- Click "Clear data"
- Or use an incognito/private window

## Common Mistakes
❌ **Don't add** `https://localhost:8080` (wrong protocol)
❌ **Don't add** trailing slashes like `http://localhost:8080/`
❌ **Don't add** your backend URL (`http://localhost:3000`) - backend doesn't need it!
✅ **Do add** exactly `http://localhost:8080` (no trailing slash)
✅ **Do wait** 2-3 minutes after saving in Google Console

## Important: Backend vs Frontend

**You only need to add your FRONTEND URL to Google's authorized origins:**
- ✅ `http://localhost:8080` (your frontend)
- ❌ `http://localhost:3000` (your backend - NOT needed!)

**Why?**
- Frontend (browser) → Google OAuth: Needs authorized origin
- Backend → Google API: Uses client ID/secret (server-to-server, no origin needed)

See `GOOGLE_OAUTH_BACKEND_EXPLAINED.md` for detailed explanation.

## Need More Help?
See `FIX_GOOGLE_OAUTH_ORIGIN_ERROR.md` for detailed troubleshooting.
