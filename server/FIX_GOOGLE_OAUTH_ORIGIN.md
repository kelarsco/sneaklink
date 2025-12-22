# 🔧 Fix Google OAuth "Origin Not Allowed" Error

## The Problem

The error `The given origin is not allowed for the given client ID` means your frontend URL is not configured in Google Cloud Console.

## Solution

### Step 1: Get Your Frontend URL

Check what URL your frontend is running on:
- Development: Usually `http://localhost:8080` or `http://localhost:5173`
- Check your browser's address bar when the error occurs

### Step 2: Add Origin to Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to **APIs & Services** → **Credentials**
4. Find your OAuth 2.0 Client ID (the one ending in `.apps.googleusercontent.com`)
5. Click **Edit** (pencil icon)
6. Under **Authorized JavaScript origins**, click **+ ADD URI**
7. Add your frontend URL:
   - `http://localhost:8080` (if using port 8080)
   - `http://localhost:5173` (if using Vite default port)
   - `http://127.0.0.1:8080` (alternative localhost)
   - Add ALL variations you might use
8. Under **Authorized redirect URIs**, add:
   - `http://localhost:8080/auth/google/callback`
   - `http://localhost:5173/auth/google/callback`
   - (Add all variations)
9. Click **SAVE**

### Step 3: Wait for Changes to Propagate

- Changes can take **1-5 minutes** to propagate
- Clear your browser cache
- Try again

### Step 4: Verify Environment Variables

Check your `.env` files:

**Frontend `.env` (root directory):**
```env
VITE_GOOGLE_CLIENT_ID=897917467114-eabq6cjm1hq5vdjopr0j73onrfnsn20n.apps.googleusercontent.com
VITE_API_URL=http://localhost:3000/api
```

**Backend `.env` (server directory):**
```env
GOOGLE_CLIENT_ID=897917467114-eabq6cjm1hq5vdjopr0j73onrfnsn20n.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here
FRONTEND_URL=http://localhost:8080
```

### Step 5: Restart Both Servers

```cmd
# Terminal 1: Backend
cd server
npm run dev

# Terminal 2: Frontend
npm run dev
```

### Step 6: Test Again

1. Clear browser cache (Ctrl+Shift+Delete)
2. Go to login page
3. Click "Sign in with Google"
4. Should work now!

---

## Common Issues

### "ERR_CONNECTION_REFUSED"

This means the backend server is not running or not accessible.

**Fix:**
1. Make sure backend is running: `cd server && npm run dev`
2. Check backend is on port 3000
3. Verify `VITE_API_URL` in frontend `.env` matches backend URL

### "Cross-Origin-Opener-Policy" Error

This is usually a browser security warning, not a blocking error. It should still work.

**Fix:**
- Ignore this warning if login still works
- Or add to backend CORS config (already done in `server.js`)

---

## Quick Checklist

- [ ] Added frontend URL to Google Cloud Console "Authorized JavaScript origins"
- [ ] Added redirect URI to Google Cloud Console "Authorized redirect URIs"
- [ ] Waited 1-5 minutes for changes to propagate
- [ ] Cleared browser cache
- [ ] Verified `VITE_GOOGLE_CLIENT_ID` in frontend `.env`
- [ ] Verified `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in backend `.env`
- [ ] Backend server is running on port 3000
- [ ] Frontend server is running
- [ ] `VITE_API_URL` matches backend URL

---

**After completing these steps, Google OAuth should work!** ✅
