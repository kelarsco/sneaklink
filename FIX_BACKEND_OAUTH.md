# Fix Backend "Google OAuth not configured" Error

## The Problem
Your test shows: **"❌ Backend error: Google OAuth not configured"**

This means the backend server cannot read `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` from `server/.env`.

## Quick Fix

### Step 1: Verify server/.env File Has Google Credentials

Open `server/.env` and make sure it has these lines:

```env
GOOGLE_CLIENT_ID=897917467114-eabq6cjm1hq5vdjopr0j73onrfnsn20n.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
GOOGLE_REDIRECT_URI=http://localhost:8080/auth/google/callback
JWT_SECRET=796cfbc9294e2ac014bb123384123b33f8ae431f1ceb090a46ad1390970d08dedd8faa27d3335981dadc2550f5e4fd398325067e6dccc0dd4b2e04f5ea737bbe
```

### Step 2: If Missing, Add Them

If the Google credentials are missing from `server/.env`, add them:

1. Open `server/.env` in a text editor
2. Add these lines (if not present):
   ```env
   GOOGLE_CLIENT_ID=897917467114-eabq6cjm1hq5vdjopr0j73onrfnsn20n.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=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
   GOOGLE_REDIRECT_URI=http://localhost:8080/auth/google/callback
   JWT_SECRET=796cfbc9294e2ac014bb123384123b33f8ae431f1ceb090a46ad1390970d08dedd8faa27d3335981dadc2550f5e4fd398325067e6dccc0dd4b2e04f5ea737bbe
   ```

### Step 3: Restart Backend Server

**IMPORTANT:** After adding/updating `.env` file, you MUST restart the server:

1. Stop the backend server (press `Ctrl+C` in the terminal running it)
2. Start it again:
   ```bash
   cd server
   npm run dev
   ```

### Step 4: Test Again

1. Open `test-oauth-setup.html` in your browser
2. Click "Test Backend API" button
3. Should now show: **✅ Backend is working!**

## Verify It's Working

After restarting, check the server console. You should see:
- `✅ MongoDB Connected successfully!`
- No errors about missing environment variables

## Common Issues

### Issue 1: Server Not Restarted
**Symptom:** Added credentials but still getting "not configured"  
**Fix:** Restart the server after changing `.env`

### Issue 2: Wrong File Location
**Symptom:** Credentials in wrong `.env` file  
**Fix:** Make sure credentials are in `server/.env` (not root `.env`)

### Issue 3: File Encoding
**Symptom:** Credentials there but not reading  
**Fix:** Make sure `.env` file is saved as UTF-8 (not UTF-16 or other)

### Issue 4: Extra Spaces/Quotes
**Symptom:** Credentials look correct but not working  
**Fix:** Make sure no quotes or extra spaces:
   ```env
   # ✅ CORRECT
   GOOGLE_CLIENT_ID=897917467114-eabq6cjm1hq5vdjopr0j73onrfnsn20n.apps.googleusercontent.com
   
   # ❌ WRONG (has quotes)
   GOOGLE_CLIENT_ID="897917467114-eabq6cjm1hq5vdjopr0j73onrfnsn20n.apps.googleusercontent.com"
   
   # ❌ WRONG (has spaces)
   GOOGLE_CLIENT_ID = 897917467114-eabq6cjm1hq5vdjopr0j73onrfnsn20n.apps.googleusercontent.com
   ```

## Test Script

You can also test if the backend can read the credentials:

```bash
cd server
node -e "require('dotenv').config(); console.log('Client ID:', process.env.GOOGLE_CLIENT_ID ? 'Found' : 'NOT FOUND'); console.log('Client Secret:', process.env.GOOGLE_CLIENT_SECRET ? 'Found' : 'NOT FOUND');"
```

Should output:
```
Client ID: Found
Client Secret: Found
```

## Still Not Working?

1. Check server console for any error messages
2. Verify `.env` file is in `server/` directory (not root)
3. Make sure no typos in variable names
4. Try copying from `server/env.template` as reference
