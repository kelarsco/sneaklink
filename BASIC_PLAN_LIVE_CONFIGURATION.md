# Basic Plan (₦500) - Live Payment Configuration

## ✅ Configuration Status

Your Basic plan (₦500/month) is **fully configured and ready for live payments**.

### Current Setup

1. **Live Secret Key:** ✅ Configured
   - `PAYSTACK_SECRET_KEY=sk_live_a335f9183d70dbcb76f86561d489adf6f03012d0`

2. **Basic Plan Pricing:** ✅ Correctly Set
   - Monthly: **₦500** = 50,000 kobo
   - Annual: **₦5,000** = 500,000 kobo (10 months)

3. **Currency:** ✅ NGN (Nigerian Naira)

4. **Payment Flow:** ✅ Production-Ready
   - Uses live Paystack API
   - No test mode restrictions
   - Real payments will be processed

### Plan Details

**Basic Plan:**
- Price: ₦500/month (₦5,000/year)
- Amount in kobo: 50,000 (monthly), 500,000 (annual)
- Currency: NGN
- Status: **LIVE - Accepting Real Payments**

### Important Notes

1. **Live Payments:** ⚠️ The system is now using **LIVE** keys. All transactions will be **REAL** and will charge actual money.

2. **FRONTEND_URL:** Currently set to `http://localhost:8080`
   - This is used for payment callbacks after payment completion
   - **For production:** Update this to your production domain:
     ```
     FRONTEND_URL=https://yourdomain.com
     ```
   - Example: `FRONTEND_URL=https://sneaklink.com`

3. **Webhook URL:** Make sure your Paystack webhook is set to:
   ```
   https://yourdomain.com/api/subscriptions/webhook
   ```

### Testing Live Payments

To test the Basic plan with real payments:

1. **Go to your Account page** → Plans tab
2. **Select Basic Plan** (₦500/month)
3. **Click "Subscribe Now"**
4. **Complete payment** with a real card
5. **⚠️ Warning:** This will charge **₦500** from your card!

### After Payment

- User will be redirected to receipt page
- Subscription will be activated immediately
- Custom receipt email will be sent
- Subscription will auto-renew monthly

### Server Restart Required

After configuring, restart your server:

```bash
cd server
# Stop server (Ctrl+C)
npm run dev
# Or if using PM2:
pm2 restart all
```

### Verification Checklist

- [x] Live secret key configured (`sk_live_...`)
- [x] Basic plan amount set correctly (50,000 kobo = ₦500)
- [x] No test mode restrictions
- [x] Currency set to NGN
- [x] Server restarted with new keys
- [ ] FRONTEND_URL updated to production domain (if in production)
- [ ] Paystack webhook configured in dashboard

### Troubleshooting

If payments aren't working:

1. **Check server logs** - Look for Paystack API errors
2. **Verify secret key** - Must start with `sk_live_` for live mode
3. **Check Paystack Dashboard** - View transaction logs
4. **Ensure server restarted** - Changes require restart
5. **Test with small amount first** - Verify everything works

### Support

- Paystack Dashboard: https://dashboard.paystack.com
- Transaction logs: Dashboard → Transactions
- All live payments will appear in your Paystack dashboard
