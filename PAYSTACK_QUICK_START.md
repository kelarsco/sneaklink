# Paystack Integration - Quick Start Guide

## ✅ Setup Complete!

All Paystack integration code has been implemented. Here's what you need to do:

## 1. Add Environment Variables

Add to `server/.env`:

```env
PAYSTACK_SECRET_KEY=sk_test_1f7578f21019555e468612df87e17130e04322e4
PAYSTACK_PUBLIC_KEY=pk_test_7c66ce151f6e9911ce02376ad4edcd6c135234be
FRONTEND_URL=http://localhost:8080
```

## 2. Install Dependencies

```bash
cd server
npm install
```

(Already done - axios is used for Paystack API calls)

## 3. Test the Integration

1. **Start your server:**
   ```bash
   cd server
   npm run dev
   ```

2. **Start your frontend:**
   ```bash
   npm run dev
   ```

3. **Test the flow:**
   - Log in to your account
   - Go to `/account?tab=plans`
   - Select a plan (Starter $49, Pro $79, or Enterprise $199)
   - Click "Subscribe Now"
   - You'll be redirected to the payment page
   - Use Paystack test card: `4084084084084081`, CVV: `408`, Expiry: `12/25`, PIN: `0000`
   - Complete payment
   - Subscription will be created automatically

## 4. Currency Conversion (Important!)

**Current Setup:** Uses NGN amounts in kobo.

The amounts are currently set as:
- Starter: 490,000 kobo (₦4,900)
- Pro: 790,000 kobo (₦7,900)
- Enterprise: 1,990,000 kobo (₦19,900)

**For USD Pricing:**
If you want to charge in USD, you need to:
1. Convert USD to NGN based on current exchange rate
2. Update amounts in `server/routes/subscriptions.js` (lines 50-52 and 162-164)

Example conversion (if $1 = ₦1,000):
- Starter: $49 = ₦49,000 = 4,900,000 kobo
- Pro: $79 = ₦79,000 = 7,900,000 kobo
- Enterprise: $199 = ₦199,000 = 19,900,000 kobo

## 5. Webhook Setup (For Recurring Payments)

1. Go to [Paystack Dashboard](https://dashboard.paystack.com)
2. Navigate to Settings → Webhooks
3. Add webhook URL: `https://yourdomain.com/api/subscriptions/webhook`
4. Select events:
   - ✅ `invoice.success` - Successful recurring payment
   - ✅ `invoice.failed` - Failed recurring payment
   - ✅ `subscription.disable` - Subscription cancelled
   - ✅ `subscription.create` - Subscription created

## 6. Going Live

1. **Get Live Keys:**
   - Go to Paystack Dashboard → Settings → API Keys & Webhooks
   - Copy your live secret key and public key

2. **Update `.env`:**
   ```env
   PAYSTACK_SECRET_KEY=sk_live_...
   PAYSTACK_PUBLIC_KEY=pk_live_...
   FRONTEND_URL=https://yourdomain.com
   ```

3. **Update Currency Amounts:**
   - Update amounts in `server/routes/subscriptions.js` based on exchange rate

4. **Test with Real Payment:**
   - Use a small test amount first
   - Verify subscription is created
   - Check webhook events in Paystack dashboard

## 📁 Files Created/Modified

### Backend
- ✅ `server/models/Subscription.js` - Subscription tracking model
- ✅ `server/routes/subscriptions.js` - All subscription endpoints
- ✅ `server/models/User.js` - Added `paystackCustomerCode` field
- ✅ `server/server.js` - Added subscription routes
- ✅ `server/package.json` - Uses axios (already installed)

### Frontend
- ✅ `src/pages/Payment.jsx` - Beautiful payment page
- ✅ `src/pages/Account.jsx` - Updated with Paystack pricing
- ✅ `src/services/api.js` - Subscription API functions
- ✅ `src/App.jsx` - Added `/payment` route
- ✅ `index.html` - Added Paystack script

## 🎨 Payment Page Features

The payment page (`/payment`) includes:
- ✅ Glass-morphism design matching your theme
- ✅ Plan summary with pricing
- ✅ Feature list
- ✅ Secure Paystack integration
- ✅ Payment verification
- ✅ Error handling
- ✅ Loading states
- ✅ Success/error feedback

## 🔄 How It Works

1. User selects plan → Redirected to `/payment?plan={planId}`
2. Payment page initializes Paystack transaction
3. User redirected to Paystack payment page
4. User completes payment
5. Redirected back with `?reference={ref}`
6. Backend verifies payment
7. Subscription created on Paystack
8. User subscription updated in database
9. Monthly recurring payments handled via webhooks

## 📝 Test Cards

**Successful Payment:**
- Card: `4084084084084081`
- CVV: `408`
- Expiry: `12/25` (any future date)
- PIN: `0000`

**Failed Payment:**
- Card: `5060666666666666666`
- CVV: `123`
- Expiry: Any future date

## ⚠️ Important Notes

1. **Currency:** Currently configured for NGN. Update amounts for USD if needed.
2. **Webhooks:** Essential for recurring payments. Must be set up in production.
3. **Test Mode:** Using test keys. Replace with live keys for production.
4. **Exchange Rate:** Implement dynamic conversion or use fixed rate for USD customers.

## 🆘 Troubleshooting

**Payment not initializing:**
- Check `PAYSTACK_SECRET_KEY` in `.env`
- Verify user is authenticated
- Check server logs

**Subscription not creating:**
- Verify payment was successful
- Check authorization code was captured
- Review webhook logs

**Webhook not working:**
- Verify webhook URL is accessible
- Check signature verification
- Ensure webhook is enabled in Paystack dashboard

## 📚 Documentation

- [Paystack API Docs](https://paystack.com/docs/api)
- [Paystack Recurring Charges](https://paystack.com/docs/payments/recurring-charges/)
- See `PAYSTACK_SETUP.md` for detailed setup
- See `PAYSTACK_INTEGRATION_SUMMARY.md` for complete overview
