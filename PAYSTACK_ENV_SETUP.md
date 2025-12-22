# Paystack Environment Variable Setup

## ⚠️ Error: 401 Unauthorized

If you're seeing this error, it means the `PAYSTACK_SECRET_KEY` is not set in your server's `.env` file.

## Quick Fix

1. **Navigate to your server directory:**
   ```bash
   cd server
   ```

2. **Open or create `.env` file:**
   - If `.env` doesn't exist, copy from template:
     ```bash
     cp env.template .env
     ```

3. **Add Paystack Secret Key:**
   Open `.env` and add this line (or update if it exists):
   ```env
   PAYSTACK_SECRET_KEY=sk_test_1f7578f21019555e468612df87e17130e04322e4
   ```

4. **Restart your server:**
   - Stop the server (Ctrl+C)
   - Start it again:
     ```bash
     npm run dev
     ```

## Your Test Keys

Based on your previous setup, use these test keys:

- **Public Key (Test):** `pk_test_7c66ce151f6e9911ce02376ad4edcd6c135234be`
- **Secret Key (Test):** `sk_test_1f7578f21019555e468612df87e17130e04322e4`

## Verify Setup

After adding the key and restarting, you should see:
- ✅ No warning about missing PAYSTACK_SECRET_KEY in server console
- ✅ Payment initialization should work without 401 errors

## For Production

When going live, replace test keys with live keys from:
https://dashboard.paystack.com/#/settings/developer

- **Public Key (Live):** `pk_live_...`
- **Secret Key (Live):** `sk_live_...`

## Troubleshooting

### Still getting 401 error?
1. Check that `.env` file is in the `server/` directory
2. Verify the key starts with `sk_test_` (for test) or `sk_live_` (for production)
3. Make sure there are no extra spaces or quotes around the key
4. Restart the server after adding the key
5. Check server console for error messages

### Key format
The key should look like:
```
PAYSTACK_SECRET_KEY=sk_test_1f7578f21019555e468612df87e17130e04322e4
```

**NOT:**
```
PAYSTACK_SECRET_KEY="sk_test_1f7578f21019555e468612df87e17130e04322e4"  ❌ (no quotes)
PAYSTACK_SECRET_KEY = sk_test_...  ❌ (no spaces around =)
```
