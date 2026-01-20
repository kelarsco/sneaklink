# Fix 404 Payment Verification Error

## Error Details

**Error:** `Request failed with status code 404`
**Endpoint:** `/api/subscriptions/verify`
**Cause:** The backend route is not being found or the server needs to be restarted

## Root Cause

The 404 error occurs because:
1. **Server needs restart** - After updating the `.env` file with live keys, the server must be restarted
2. **Route not loaded** - If the server wasn't restarted, the subscription routes might not be properly loaded
3. **Server crash** - If there was an error loading the routes, the server might have crashed silently

## Solution

### Step 1: Verify Server is Running

Check if your server is running:
```powershell
# Check if port 3000 is in use
netstat -ano | findstr :3000
```

### Step 2: Restart Your Server

**IMPORTANT:** You MUST restart the server for the live keys to take effect AND for routes to load properly.

```powershell
# 1. Stop the server (Press Ctrl+C in the terminal running the server)
# OR kill the process:
Get-Process node | Stop-Process -Force

# 2. Navigate to server directory
cd server

# 3. Start the server
npm run dev
```

### Step 3: Verify Server Started Correctly

After restarting, check your server console for:
- ✅ No errors about missing routes
- ✅ Message like "Server running on port 3000"
- ✅ No warnings about PAYSTACK_SECRET_KEY

### Step 4: Test the Endpoint Directly

You can test if the endpoint exists by making a direct request (replace `YOUR_TOKEN` with a valid auth token):

```powershell
# Test the endpoint
curl -X POST http://localhost:3000/api/subscriptions/verify `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer YOUR_TOKEN" `
  -d '{\"reference\":\"test\",\"billingCycle\":\"monthly\"}'
```

If you get a 404, the route isn't loaded. If you get a 400 (bad request) or 401 (unauthorized), the route IS working.

## Verification Checklist

- [ ] Server restarted after updating `.env`
- [ ] No errors in server console on startup
- [ ] Server running on port 3000
- [ ] Live secret key is in `.env`: `sk_live_a335f9183d70dbcb76f86561d489adf6f03012d0`
- [ ] Route `/api/subscriptions/verify` should be accessible

## Common Issues

### Issue 1: Server Not Restarted
**Symptom:** 404 error persists
**Fix:** Stop and restart the server completely

### Issue 2: Route File Error
**Symptom:** Server crashes or doesn't start
**Fix:** Check server console for syntax errors in `server/routes/subscriptions.js`

### Issue 3: Port Conflict
**Symptom:** Server can't start on port 3000
**Fix:** Kill the process using port 3000 or change PORT in `.env`

## After Fixing

Once the server is restarted:
1. ✅ The 404 error should disappear
2. ✅ Payment verification should work
3. ✅ Live payments will be processed
4. ✅ No more "TEST" badge in Paystack modal

## Quick Fix Command

```powershell
# Kill all Node processes and restart
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
cd C:\Users\USER\sneaklink\server
npm run dev
```

Wait 10 seconds for server to start, then try payment again.
