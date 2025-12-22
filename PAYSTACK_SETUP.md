# Paystack Integration Setup Guide

This guide will help you set up Paystack recurring payments for SneakLink subscriptions.

## Prerequisites

1. Paystack account (sign up at https://paystack.com)
2. Test API keys (provided) or Live API keys from Paystack dashboard

## Environment Variables

Add these to your `server/.env` file:

```env
# Paystack Configuration
PAYSTACK_SECRET_KEY=sk_test_1f7578f21019555e468612df87e17130e04322e4
PAYSTACK_PUBLIC_KEY=pk_test_7c66ce151f6e9911ce02376ad4edcd6c135234be

# Frontend URL (for payment callbacks)
FRONTEND_URL=http://localhost:8080
```

## Installation

1. Install Paystack SDK:
```bash
cd server
npm install paystack
```

2. The SDK is already added to `package.json`, so just run:
```bash
npm install
```

## Subscription Plans

The following plans are configured:

- **Starter**: $49/month (₦4,900)
- **Pro**: $79/month (₦7,900)
- **Enterprise**: $199/month (₦19,900)

## Payment Flow

1. User selects a plan on `/account?tab=plans`
2. User is redirected to `/payment?plan={planId}`
3. Payment page initializes Paystack transaction
4. User completes payment on Paystack
5. User is redirected back with `?reference={transactionRef}`
6. Backend verifies payment and creates subscription
7. Subscription is set up for automatic monthly renewal

## Webhook Setup

To handle recurring payments and subscription events, set up a webhook in your Paystack dashboard:

1. Go to Paystack Dashboard → Settings → Webhooks
2. Add webhook URL: `https://yourdomain.com/api/subscriptions/webhook`
3. Select events to listen for:
   - `invoice.success` - Successful recurring payment
   - `invoice.failed` - Failed recurring payment
   - `subscription.disable` - Subscription cancelled
   - `subscription.create` - Subscription created

## Testing

### Test Cards

Use these test cards from Paystack:

**Successful Payment:**
- Card Number: `4084084084084081`
- CVV: `408`
- Expiry: Any future date (e.g., `12/25`)
- PIN: `0000`

**Failed Payment:**
- Card Number: `5060666666666666666`
- CVV: `123`
- Expiry: Any future date

### Testing Steps

1. Start your server:
```bash
cd server
npm run dev
```

2. Start your frontend:
```bash
npm run dev
```

3. Log in to your account
4. Go to `/account?tab=plans`
5. Select a plan and click "Subscribe"
6. Use test card details above
7. Complete payment
8. Verify subscription is created in database

## Database Models

### Subscription Model

The `Subscription` model tracks:
- User ID
- Plan type
- Paystack customer code
- Paystack subscription code
- Authorization code
- Status (active, cancelled, expired, pending)
- Next payment date

### User Model Updates

The `User` model now includes:
- `paystackCustomerCode` - Paystack customer identifier
- Updated subscription fields for Paystack integration

## API Endpoints

### POST `/api/subscriptions/initialize`
Initialize a subscription payment.

**Request:**
```json
{
  "plan": "starter",
  "email": "[email protected]"
}
```

**Response:**
```json
{
  "authorization_url": "https://paystack.com/pay/...",
  "access_code": "...",
  "reference": "..."
}
```

### POST `/api/subscriptions/verify`
Verify payment and create subscription.

**Request:**
```json
{
  "reference": "transaction_reference"
}
```

**Response:**
```json
{
  "success": true,
  "subscription": {
    "plan": "starter",
    "status": "active",
    "nextPaymentDate": "2024-02-19T00:00:00.000Z"
  }
}
```

### POST `/api/subscriptions/cancel`
Cancel an active subscription.

### GET `/api/subscriptions/current`
Get current subscription details.

### POST `/api/subscriptions/webhook`
Paystack webhook endpoint (handles recurring payments automatically).

## Going Live

1. Replace test keys with live keys in `.env`:
   - Get live keys from Paystack Dashboard → Settings → API Keys & Webhooks
   - Update `PAYSTACK_SECRET_KEY` and `PAYSTACK_PUBLIC_KEY`

2. Update webhook URL in Paystack dashboard to production URL

3. Test with real payment (small amount recommended)

4. Monitor webhook events in Paystack dashboard

## Troubleshooting

### Payment not initializing
- Check that `PAYSTACK_SECRET_KEY` is set correctly
- Verify user is authenticated
- Check server logs for errors

### Subscription not creating
- Verify payment was successful
- Check that authorization code was captured
- Review webhook logs in Paystack dashboard

### Webhook not receiving events
- Verify webhook URL is accessible
- Check webhook signature verification
- Ensure webhook is enabled in Paystack dashboard

## Support

For Paystack-specific issues, refer to:
- [Paystack Documentation](https://paystack.com/docs)
- [Paystack API Reference](https://paystack.com/docs/api)
- [Paystack Support](https://paystack.com/contact)
