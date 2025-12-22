# Paystack Integration - Complete Setup

## ✅ What's Been Implemented

### Backend
1. **Paystack SDK installed** - Added to `server/package.json`
2. **Subscription Model** - Created `server/models/Subscription.js` to track subscriptions
3. **Subscription Routes** - Created `server/routes/subscriptions.js` with:
   - `POST /api/subscriptions/initialize` - Initialize payment
   - `POST /api/subscriptions/verify` - Verify payment and create subscription
   - `POST /api/subscriptions/webhook` - Handle recurring payments
   - `POST /api/subscriptions/cancel` - Cancel subscription
   - `GET /api/subscriptions/current` - Get current subscription
4. **User Model Updated** - Added `paystackCustomerCode` field
5. **Server Routes** - Added subscription routes to `server/server.js`

### Frontend
1. **Payment Page** - Created `src/pages/Payment.jsx` with:
   - Plan selection and summary
   - Payment initialization
   - Payment verification
   - Error handling
   - Beautiful UI matching your theme
2. **Account Page Updated** - Updated `src/pages/Account.jsx`:
   - Removed annual billing (monthly only)
   - Updated pricing: Starter ($49), Pro ($79), Enterprise ($199)
   - Updated plan features
   - Links to payment page
3. **API Service** - Added subscription functions to `src/services/api.js`:
   - `initializeSubscription()`
   - `verifySubscription()`
   - `cancelSubscription()`
   - `getCurrentSubscription()`
4. **Paystack Script** - Added to `index.html`
5. **Routes** - Added `/payment` route to `src/App.jsx`

## 📋 Next Steps

### 1. Install Dependencies
```bash
cd server
npm install
```

### 2. Environment Variables
Add to `server/.env`:
```env
PAYSTACK_SECRET_KEY=sk_test_1f7578f21019555e468612df87e17130e04322e4
PAYSTACK_PUBLIC_KEY=pk_test_7c66ce151f6e9911ce02376ad4edcd6c135234be
FRONTEND_URL=http://localhost:8080
```

### 3. Currency Conversion (Important!)
**Current Implementation:** Uses NGN amounts directly in kobo.

**For Production:**
- You need to convert USD to NGN based on current exchange rate
- Example: If $1 = ₦1,000 NGN:
  - Starter: $49 = ₦49,000 = 4,900,000 kobo
  - Pro: $79 = ₦79,000 = 7,900,000 kobo
  - Enterprise: $199 = ₦199,000 = 19,900,000 kobo

**Update in `server/routes/subscriptions.js`:**
```javascript
const validPlans = {
  starter: 4900000,    // Update based on exchange rate
  pro: 7900000,
  enterprise: 19900000,
};
```

### 4. Webhook Setup
1. Go to Paystack Dashboard → Settings → Webhooks
2. Add webhook URL: `https://yourdomain.com/api/subscriptions/webhook`
3. Select events:
   - `invoice.success`
   - `invoice.failed`
   - `subscription.disable`
   - `subscription.create`

### 5. Testing
Use Paystack test cards:
- **Success:** `4084084084084081`, CVV: `408`, Expiry: `12/25`, PIN: `0000`
- **Failure:** `5060666666666666666`

## 🎨 Payment Page Features

The payment page (`/payment`) includes:
- ✅ Beautiful glass-morphism design matching your theme
- ✅ Plan summary with pricing
- ✅ Feature list for selected plan
- ✅ Secure Paystack payment flow
- ✅ Payment verification
- ✅ Error handling
- ✅ Loading states
- ✅ Success/error feedback

## 🔄 Payment Flow

1. User selects plan on `/account?tab=plans`
2. Clicks "Subscribe Now"
3. Redirected to `/payment?plan={planId}`
4. Payment page initializes Paystack transaction
5. User redirected to Paystack payment page
6. User completes payment
7. Redirected back to `/payment?reference={ref}`
8. Backend verifies payment
9. Subscription created
10. User redirected to account page

## 📝 Important Notes

1. **Currency:** Currently set for NGN. Update amounts based on your target market.
2. **Exchange Rate:** Implement dynamic conversion or use fixed rate for USD customers.
3. **Webhooks:** Essential for recurring payments. Set up in production.
4. **Test Mode:** Currently using test keys. Replace with live keys for production.
5. **Plan Creation:** Plans are created automatically on first subscription. You can also pre-create them in Paystack dashboard.

## 🚀 Going Live Checklist

- [ ] Replace test keys with live keys
- [ ] Update currency amounts (USD to NGN conversion)
- [ ] Set up webhook URL in Paystack dashboard
- [ ] Test with real payment (small amount)
- [ ] Monitor webhook events
- [ ] Update `FRONTEND_URL` to production URL
- [ ] Test subscription cancellation
- [ ] Test recurring payment (wait for next billing cycle)

## 📚 Documentation

See `PAYSTACK_SETUP.md` for detailed setup instructions.
