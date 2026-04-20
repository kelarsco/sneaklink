# Paystack Live Keys Configuration

## ✅ Configuration Complete

Your Paystack live API keys have been successfully configured in `server/.env`.

### Current Configuration

- **Secret Key (Live):** `sk_live_a335f9183d70dbcb76f86561d489adf6f03012d0` ✅
- **Public Key (Live):** `pk_live_76ab589a821b14dd063046dab7716e3596eb8d5c` (noted for reference)

### What Was Changed

1. **Updated `server/.env`:**
   - Replaced test secret key with live secret key
   - The `PAYSTACK_SECRET_KEY` now points to your live account

2. **Updated `server/env.template`:**
   - Template now shows live key format for reference

### Important Notes

- **Public Key:** The public key (`pk_live_...`) is currently **not used** in the codebase because all Paystack interactions are handled server-side. The frontend makes API calls to your backend, which then communicates with Paystack using the secret key.

- **Secret Key:** This is the only key needed for the current implementation. It's used for:
  - Transaction initialization
  - Payment verification
  - Subscription management
  - Webhook verification

### Next Steps

1. **Restart Your Server:**
   ```bash
   cd server
   # Stop the current server (Ctrl+C if running)
   npm run dev
   # Or if using PM2:
   pm2 restart all
   ```

2. **Verify Configuration:**
   - Check server console - you should see no warnings about missing `PAYSTACK_SECRET_KEY`
   - The key should now be loaded from the `.env` file

3. **Test Live Payments:**
   - Go to your payment page
   - Select a plan (Basic ₦500, Starter $49, Pro $79, or Enterprise $199)
   - Complete a test transaction with a real card
   - ⚠️ **Warning:** Live keys process REAL payments. Make sure you're ready before testing!

4. **Update Webhook URL (if not already done):**
   - Go to Paystack Dashboard → Settings → Webhooks
   - Ensure webhook URL is set to your production domain:
     ```
     https://yourdomain.com/api/subscriptions/webhook
     ```
   - Select events:
     - ✅ `invoice.success` - Successful recurring payment
     - ✅ `invoice.failed` - Failed recurring payment
     - ✅ `subscription.disable` - Subscription cancelled
     - ✅ `subscription.create` - Subscription created

### Security Reminders

- ✅ `.env` file should be in `.gitignore` (already configured)
- ✅ Never commit live API keys to version control
- ✅ Keep your secret key secure and private
- ✅ Rotate keys if they are ever exposed

### Available Plans

Your system now accepts live payments for:

- **Basic Plan:** ₦500/month (₦5,000/year)
- **Starter Plan:** $49/month ($490/year)
- **Pro Plan:** $79/month ($790/year)
- **Enterprise Plan:** $199/month ($1,990/year)

### Troubleshooting

If payments aren't working:

1. **Check server logs** for Paystack API errors
2. **Verify `.env` file** is in the `server/` directory
3. **Ensure server was restarted** after updating `.env`
4. **Check Paystack Dashboard** for transaction logs
5. **Verify webhook URL** is correctly configured in Paystack dashboard

### Support

- Paystack Dashboard: https://dashboard.paystack.com
- Paystack Documentation: https://paystack.com/docs
- Check transaction logs in Paystack Dashboard for detailed error messages
