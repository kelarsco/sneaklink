# Disable Paystack Email Receipts

To prevent Paystack from sending its own receipt emails to subscribers, you need to configure both:

## 1. Code Configuration (Already Done)

The code already disables email receipts in transaction initialization:
- `send_email: false` is set in `/api/subscriptions/initialize` endpoint
- Custom receipt emails are sent via `sendSubscriptionReceipt()` function

## 2. Paystack Dashboard Configuration (Required)

You must also disable email receipts in your Paystack Dashboard:

### Steps:
1. Log in to your Paystack Dashboard
2. Go to **Settings** > **Preferences**
3. Find **"Email receipts to customers"** option
4. **Uncheck** this option to disable automatic email receipts
5. Save changes

### Additional Settings:
- **Settings** > **Email Notifications**: Review and disable any subscription-related email notifications if needed
- Note: Some subscription emails (like "subscription is now active") may still be sent by Paystack. Contact Paystack Support if you need these completely disabled.

## 3. What This Does

- ✅ Prevents Paystack from sending transaction receipt emails
- ✅ Your custom receipt email (matching your UI design) will be sent instead
- ✅ Users receive only one receipt email (your custom one)

## 4. Testing

After disabling in the dashboard:
1. Complete a test subscription payment
2. Check the subscriber's email
3. Verify only your custom receipt email is received
4. Confirm no Paystack default receipt emails are sent

## Note

If you still receive Paystack emails after these changes:
- Wait a few minutes for dashboard changes to propagate
- Clear browser cache and test again
- Contact Paystack Support if subscription activation emails persist
