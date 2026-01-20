# Verify Route Setup - Debugging Guide

## ✅ Route Configuration Verified

The `/api/subscriptions/verify` endpoint is correctly configured:

1. **Route Definition:** `router.post('/verify', authenticate, async (req, res) => {...})`
2. **Mount Point:** `app.use('/api/subscriptions', subscriptionRoutes)`
3. **Full Path:** `/api/subscriptions/verify` ✅
4. **Export:** `export default router;` ✅

## 🔍 Debugging Steps

### Step 1: Test Route is Accessible

After restarting your server, test the health check endpoint:

```bash
# Test if subscriptions routes are loaded
curl http://localhost:3000/api/subscriptions/test
```

**Expected Response:**
```json
{
  "status": "ok",
  "message": "Subscriptions routes are loaded",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

If you get a 404 here, the routes aren't loading. If you get a 200, routes are working.

### Step 2: Check Server Console

After starting your server, you should see:

```
✅ Subscription routes loaded: /api/subscriptions/*
✅ Routes registered:
   - POST /api/subscriptions/initialize
   - POST /api/subscriptions/verify
   - GET  /api/subscriptions/test (health check)
```

If you don't see these messages, there's an error loading the routes.

### Step 3: Test Verify Endpoint

```bash
# Replace YOUR_TOKEN with a valid JWT token
curl -X POST http://localhost:3000/api/subscriptions/verify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"reference":"test_ref","billingCycle":"monthly"}'
```

**If you get 404:**
- Routes aren't loaded - check server console for errors
- Server wasn't restarted after code changes
- Route file has syntax errors

**If you get 401:**
- Authentication issue - but route EXISTS (this is good!)

**If you get 400:**
- Route exists and auth works! Just missing required data

## 🚨 Common Issues

### Issue 1: Route Returns 404

**Cause:** Server not restarted or routes not loading

**Fix:**
1. Stop server completely
2. Check console for errors
3. Restart server
4. Verify console shows "✅ Routes registered"

### Issue 2: Routes Not Loading

**Cause:** Syntax error in route file or import issue

**Fix:**
```bash
# Check for syntax errors
cd server
node -c routes/subscriptions.js

# If no errors, check imports
node -e "import('./routes/subscriptions.js').then(() => console.log('OK')).catch(e => console.error(e))"
```

### Issue 3: Port Mismatch

**Frontend calls:** `http://localhost:3000/api/subscriptions/verify`

**Check backend port:**
```bash
# Check what port server is running on
netstat -ano | findstr :3000
```

If server is on a different port, either:
- Update `PORT` in `server/.env`
- Or update `VITE_API_URL` in frontend `.env`

## ✅ Verification Checklist

After restarting server:

- [ ] Server starts without errors
- [ ] Console shows "✅ Subscription routes loaded"
- [ ] Console shows "✅ Routes registered" with verify endpoint
- [ ] `GET /api/subscriptions/test` returns 200 OK
- [ ] `POST /api/subscriptions/verify` returns 401 (not 404) without auth token
- [ ] Server is running on port 3000 (or port matches frontend config)

## 📝 Server Restart Command

```bash
# Windows PowerShell
cd server
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
npm run dev

# Wait 10 seconds, then test:
# http://localhost:3000/api/subscriptions/test
```

## 🎯 Success Indicators

When everything is working:

1. ✅ Server console shows route registration messages
2. ✅ `GET /api/subscriptions/test` returns 200
3. ✅ `POST /api/subscriptions/verify` returns 401 (with no token) or 400 (with invalid data)
4. ✅ NO MORE 404 errors in browser console
