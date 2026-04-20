# Switch Paystack to Live Mode - Final Steps

## ⚠️ CRITICAL: Server Restart Required

Your `.env` file has been updated with the live secret key, but **the server MUST be restarted** for the changes to take effect.

### Current Configuration

✅ **Live Secret Key in `.env`:** `sk_live_a335f9183d70dbcb76f86561d489adf6f03012d0`

### Why You're Still Seeing Test Mode

Node.js reads environment variables **only once** when the server starts. Even though the `.env` file has the live key, your running server is still using the old test key that was loaded when it started.

### Solution: Restart Your Server

**Option 1: Using npm (Development)**
```bash
# 1. Stop the server (Press Ctrl+C in the terminal where server is running)

# 2. Start the server again
cd server
npm run dev
```

**Option 2: Using PM2 (Production)**
```bash
# Restart all PM2 processes
pm2 restart all

# Or restart specific app
pm2 restart sneaklink-server
```

**Option 3: Kill and Restart (Windows)**
```powershell
# Find the Node process
Get-Process node

# Kill it (replace PID with actual process ID)
Stop-Process -Id <PID> -Force

# Start server again
cd server
npm run dev
```

### Verification After Restart

After restarting, check your server console. You should see:
- ✅ No warnings about missing `PAYSTACK_SECRET_KEY`
- ✅ Server starts successfully
- ✅ Payment initialization will use live mode

### Test Live Payment

1. **Restart your server** (follow steps above)
2. **Wait 5-10 seconds** for server to fully start
3. **Go to your payment page** → Select Basic Plan (₦500)
4. **Click "Subscribe Now"**
5. **You should now see LIVE payment interface** (no "TEST" badge)

### Important Notes

- ⚠️ **Live payments charge REAL money** - Be careful when testing!
- ✅ The live key is correctly configured in `.env`
- ✅ All plan amounts are set correctly:
  - Basic: ₦500 (50,000 kobo)
  - Starter: $49 (7,350,000 kobo)
  - Pro: $79 (11,850,000 kobo)
  - Enterprise: $199 (29,850,000 kobo)

### Troubleshooting

**Still seeing TEST mode after restart?**

1. **Verify the key in `.env`:**
   ```powershell
   cd server
   Get-Content .env | Select-String "PAYSTACK_SECRET_KEY"
   ```
   Should show: `PAYSTACK_SECRET_KEY=sk_live_a335f9183d70dbcb76f86561d489adf6f03012d0`

2. **Check server console logs:**
   - Look for any errors about missing keys
   - Verify the server actually restarted (check startup timestamp)

3. **Clear browser cache:**
   - The payment modal URL might be cached
   - Try in incognito/private mode

4. **Verify Paystack Dashboard:**
   - Go to https://dashboard.paystack.com
   - Check Settings → API Keys & Webhooks
   - Ensure you're viewing LIVE keys (not test keys)

### After Successful Switch

Once you see the live payment interface (no "TEST" badge):
- ✅ All payments will be REAL transactions
- ✅ Money will be charged from cards
- ✅ Transactions will appear in Paystack Dashboard → Transactions
- ✅ Webhooks will work with live events

### Need Help?

If you're still seeing test mode after restarting:
1. Double-check `.env` file has the live key
2. Ensure server actually restarted (kill process completely)
3. Check Paystack Dashboard to verify live keys are active
4. Try a fresh browser session (incognito mode)
