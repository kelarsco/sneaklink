# Paystack Exchange Rate Configuration

## Current Exchange Rate

The subscription amounts are configured using the exchange rate:
**$1 USD = ₦1,500 NGN**

This rate is used in:
- `server/routes/subscriptions.js` (lines 50-62 and 162-174)

## How to Update Exchange Rate

1. **Check Current Rate:**
   - Check Paystack dashboard for current USD/NGN rate
   - Or use current market rate (typically ranges from ₦1,400 - ₦1,600 per $1)

2. **Update in Code:**
   - Open `server/routes/subscriptions.js`
   - Find the `monthlyPlans` and `annualPlans` objects
   - Update amounts using formula: `USD Price × Exchange Rate × 100 = kobo`

3. **Example Calculation:**
   - If rate is $1 = ₦1,500:
     - Starter Monthly: $49 × 1,500 × 100 = 7,350,000 kobo
     - Starter Annual: $490 × 1,500 × 100 = 73,500,000 kobo

## Pricing Structure

### Monthly Plans
- **Starter**: $49/month
- **Pro**: $79/month
- **Enterprise**: $199/month

### Annual Plans (2 months free)
- **Starter**: $490/year (10 months price)
- **Pro**: $790/year (10 months price)
- **Enterprise**: $1,990/year (10 months price)

## Paystack Currency

Paystack processes payments in **NGN (Nigerian Naira)** and uses **kobo** as the smallest unit:
- 1 NGN = 100 kobo
- All amounts must be in kobo (multiply NGN amount by 100)

## Important Notes

1. **Exchange Rate Fluctuation**: Update rates regularly as USD/NGN fluctuates
2. **Paystack Settlement**: Paystack can settle in USD or NGN - check your account settings
3. **International Cards**: Paystack charges 3.9% + ₦100 for international cards
4. **Test Mode**: Test amounts can be smaller, but use realistic rates for testing

## Testing

For testing, you can use smaller amounts, but ensure the exchange rate calculation is correct:
- Test with smaller kobo amounts
- Verify calculations match expected USD prices
- Check Paystack dashboard for actual conversion
