# How to Generate a Valid Facebook Access Token

## Quick Steps

### Option 1: Using Facebook Graph API Explorer (Easiest)

1. **Go to Graph API Explorer:**
   - Visit: https://developers.facebook.com/tools/explorer/

2. **Select Your App:**
   - In the top right, click the dropdown next to "Meta App"
   - Select your app: **1134318321872190** (or create a new app if needed)

3. **Generate User Token:**
   - Click "Generate Access Token" button
   - Select permissions:
     - ✅ `ads_read` (required for Ads Library)
     - ✅ `public_profile` (usually included by default)
   - Click "Generate Access Token"
   - **Copy the token** that appears

4. **Extend Token (Optional but Recommended):**
   - The token you get is usually short-lived (1-2 hours)
   - To get a long-lived token (60 days), use this URL:
   ```
   https://graph.facebook.com/v24.0/oauth/access_token?grant_type=fb_exchange_token&client_id=YOUR_APP_ID&client_secret=YOUR_APP_SECRET&fb_exchange_token=YOUR_SHORT_LIVED_TOKEN
   ```
   - Replace:
     - `YOUR_APP_ID` with: `1134318321872190`
     - `YOUR_APP_SECRET` with: `9d9c8681659536780c867f0cce107405`
     - `YOUR_SHORT_LIVED_TOKEN` with the token from step 3
   - This will return a long-lived token

### Option 2: Using Your App Settings

1. **Go to App Dashboard:**
   - Visit: https://developers.facebook.com/apps/
   - Select your app (ID: 1134318321872190)

2. **Add Marketing API Product:**
   - Go to "Add Product" → "Marketing API"
   - Click "Set Up"

3. **Generate Token:**
   - Go to "Tools" → "Graph API Explorer"
   - Select your app
   - Add permission: `ads_read`
   - Generate token

### Option 3: Programmatic Token Exchange (For Long-Lived Tokens)

Run this command (replace YOUR_SHORT_TOKEN with token from Graph Explorer):

```bash
curl "https://graph.facebook.com/v24.0/oauth/access_token?grant_type=fb_exchange_token&client_id=1134318321872190&client_secret=9d9c8681659536780c867f0cce107405&fb_exchange_token=YOUR_SHORT_TOKEN"
```

Or use this Node.js script:

```javascript
// exchange-token.js
const axios = require('axios');

const SHORT_TOKEN = 'YOUR_SHORT_LIVED_TOKEN_HERE';
const APP_ID = '1134318321872190';
const APP_SECRET = '9d9c8681659536780c867f0cce107405';

axios.get('https://graph.facebook.com/v24.0/oauth/access_token', {
  params: {
    grant_type: 'fb_exchange_token',
    client_id: APP_ID,
    client_secret: APP_SECRET,
    fb_exchange_token: SHORT_TOKEN
  }
})
.then(response => {
  console.log('✅ Long-lived token:', response.data.access_token);
  console.log('   Expires in:', response.data.expires_in, 'seconds');
})
.catch(error => {
  console.error('❌ Error:', error.response?.data || error.message);
});
```

## Update Your .env File

Once you have a valid token, update your `server/.env` file:

```env
FACEBOOK_ACCESS_TOKEN=YOUR_NEW_TOKEN_HERE
FACEBOOK_APP_ID=1134318321872190
FACEBOOK_APP_SECRET=9d9c8681659536780c867f0cce107405
```

## Test Your Token

After updating `.env`, test it:

```bash
cd server
npm run test:facebook
```

## Important Notes

⚠️ **Token Expiration:**
- Short-lived tokens: 1-2 hours
- Long-lived tokens: ~60 days
- You'll need to regenerate periodically

⚠️ **Permissions Required:**
- `ads_read` - Required to access Ads Library API
- Make sure your app has this permission enabled

⚠️ **App Review:**
- For production use, you may need to submit your app for review
- For development/testing, you can use tokens without review

## Troubleshooting

**Error 190: Token could not be decrypted**
- Token is invalid or expired
- Generate a new token using steps above

**Error 10: Missing permissions**
- Add `ads_read` permission in Graph API Explorer
- Regenerate token after adding permission

**Error 200: Requires extended permission**
- Your app needs to be reviewed for Ads Library access
- For testing, use a token from Graph API Explorer

## Quick Reference

- **Graph API Explorer:** https://developers.facebook.com/tools/explorer/
- **App Dashboard:** https://developers.facebook.com/apps/
- **Your App ID:** 1134318321872190
- **Your App Secret:** 9d9c8681659536780c867f0cce107405


