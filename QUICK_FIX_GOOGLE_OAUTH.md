# Quick Fix for Google OAuth "Something went wrong" Error

## The Problem
You're seeing: **"Can't continue with google.com. Something went wrong"**

This is almost always caused by **missing Authorized JavaScript origins** in Google Cloud Console.

## The Fix (5 minutes)

### Step 1: Go to Google Cloud Console
1. Visit: https://console.cloud.google.com/apis/credentials
2. Click on your OAuth 2.0 Client ID (the one starting with `897917467114-...`)

### Step 2: Add Authorized JavaScript Origins
In the **Authorized JavaScript origins** section, click **+ ADD URI** and add:
```
http://localhost:8080
http://localhost:5173
http://127.0.0.1:8080
http://127.0.0.1:5173
```

**Important:** 
- Use `http://` not `https://`
- No trailing slashes
- Add all 4 URLs to be safe

### Step 3: Add Authorized Redirect URIs (if not already there)
In the **Authorized redirect URIs** section, add:
```
http://localhost:8080/auth/google/callback
http://localhost:5173/auth/google/callback
```

### Step 4: Save and Wait
1. Click **SAVE**
2. **Wait 5-10 minutes** for Google to propagate changes
3. Clear your browser cache (Ctrl+Shift+R or Cmd+Shift+R)

### Step 5: Test Again
1. Make sure backend is running: `cd server && npm run dev`
2. Make sure frontend is running: `npm run dev`
3. Go to: http://localhost:8080/login
4. Click "Continue with Google"

## Still Not Working?

### Check OAuth Consent Screen
1. Go to: https://console.cloud.google.com/apis/credentials/consent
2. If your app is in **Testing** mode:
   - Scroll to **Test users**
   - Click **+ ADD USERS**
   - Add your Google account email
   - Save

### Verify Environment Variables Match
Check that both files have the **SAME** Client ID:

**Frontend `.env` (root folder):**
```env
VITE_GOOGLE_CLIENT_ID=897917467114-eabq6cjm1hq5vdjopr0j73onrfnsn20n.apps.googleusercontent.com
```

**Backend `server/.env`:**
```env
GOOGLE_CLIENT_ID=897917467114-eabq6cjm1hq5vdjopr0j73onrfnsn20n.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
```

### Check Browser Console
1. Open DevTools (F12)
2. Go to **Console** tab
3. Click "Continue with Google"
4. Look for specific error messages
5. Share the exact error if still not working

### Restart Servers
After any `.env` changes:
```bash
# Stop both servers (Ctrl+C)
# Then restart:

# Terminal 1
cd server
npm run dev

# Terminal 2  
npm run dev
```

## Common Errors and Solutions

| Error | Solution |
|-------|----------|
| "Invalid origin" | Add `http://localhost:8080` to JavaScript origins |
| "redirect_uri_mismatch" | Add redirect URI to Google Console |
| "Access blocked" | Add your email as test user in OAuth consent screen |
| Network error | Backend not running - start with `cd server && npm run dev` |

## Need More Help?

See `GOOGLE_OAUTH_TROUBLESHOOTING.md` for detailed troubleshooting.
