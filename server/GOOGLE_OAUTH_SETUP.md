# Google OAuth Setup Guide

This guide will help you set up Google OAuth authentication for SneakLink.

## Step 1: Create Google Cloud Project

1. **Go to Google Cloud Console:**
   - Visit: https://console.cloud.google.com/

2. **Create a New Project:**
   - Click "Select a project" → "New Project"
   - Enter project name: "SneakLink" (or your preferred name)
   - Click "Create"

3. **Select Your Project:**
   - Make sure your new project is selected in the top bar

## Step 2: Enable Google+ API

1. **Navigate to APIs & Services:**
   - Go to: https://console.cloud.google.com/apis/library

2. **Enable Google+ API:**
   - Search for "Google+ API"
   - Click on it and click "Enable"

   **OR** (Recommended - Newer API)
   - Search for "Google Identity Services API"
   - Click on it and click "Enable"

## Step 3: Create OAuth 2.0 Credentials

1. **Go to Credentials:**
   - Navigate to: https://console.cloud.google.com/apis/credentials

2. **Create OAuth Client ID:**
   - Click "Create Credentials" → "OAuth client ID"
   - If prompted, configure OAuth consent screen first (see Step 4)

3. **Configure OAuth Client:**
   - **Application type:** Web application
   - **Name:** SneakLink (or your preferred name)
   - **Authorized JavaScript origins:**
     - `http://localhost:8080` (development)
     - `http://localhost:5173` (Vite dev server)
     - `https://yourdomain.com` (production - replace with your domain)
   - **Authorized redirect URIs:**
     - `http://localhost:8080/auth/google/callback` (development)
     - `http://localhost:5173/auth/google/callback` (Vite dev server)
     - `https://yourdomain.com/auth/google/callback` (production)

4. **Click "Create"**

5. **Copy Your Credentials:**
   - You'll see a popup with:
     - **Client ID** (looks like: `123456789-abcdefghijklmnop.apps.googleusercontent.com`)
     - **Client Secret** (looks like: `GOCSPX-abcdefghijklmnopqrstuvwxyz`)
   - **SAVE THESE** - you'll need them for your `.env` file

## Step 4: Configure OAuth Consent Screen (If Not Done)

1. **Go to OAuth Consent Screen:**
   - Navigate to: https://console.cloud.google.com/apis/credentials/consent

2. **Choose User Type:**
   - **External** (for public apps) or **Internal** (for Google Workspace only)
   - Click "Create"

3. **Fill in App Information:**
   - **App name:** SneakLink
   - **User support email:** Your email
   - **Developer contact information:** Your email
   - Click "Save and Continue"

4. **Scopes (Optional):**
   - Click "Add or Remove Scopes"
   - Add: `email`, `profile`, `openid`
   - Click "Update" → "Save and Continue"

5. **Test Users (For External Apps):**
   - Add test users if your app is in testing mode
   - Click "Save and Continue"

6. **Summary:**
   - Review and click "Back to Dashboard"

## Step 5: Configure Environment Variables

### Backend (.env file in `server/` directory):

```env
# Google OAuth Credentials
GOOGLE_CLIENT_ID=your_client_id_from_step_3
GOOGLE_CLIENT_SECRET=your_client_secret_from_step_3
GOOGLE_REDIRECT_URI=http://localhost:8080/auth/google/callback

# JWT Secret (generate a secure random string)
JWT_SECRET=your_secure_random_jwt_secret_here
```

**Generate JWT Secret:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Frontend (.env file in root directory):

Create a `.env` file in the root of your project (same level as `package.json`):

```env
VITE_GOOGLE_CLIENT_ID=your_client_id_from_step_3
VITE_API_URL=http://localhost:3000/api
```

**Note:** Frontend environment variables must start with `VITE_` to be accessible in the browser.

## Step 6: Install Dependencies

### Backend:
```bash
cd server
npm install google-auth-library jsonwebtoken
```

### Frontend:
No additional dependencies needed - uses Google Identity Services (loaded dynamically)

## Step 7: Test the Integration

1. **Start Backend Server:**
   ```bash
   cd server
   npm run dev
   ```

2. **Start Frontend:**
   ```bash
   npm run dev
   ```

3. **Test Login:**
   - Navigate to: `http://localhost:8080/login`
   - Click "Continue with Google"
   - You should see Google sign-in popup
   - After signing in, you'll be redirected to the dashboard

## Troubleshooting

### Error: "Google OAuth not configured"
- Make sure `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set in `server/.env`
- Restart your backend server after adding environment variables

### Error: "redirect_uri_mismatch"
- Check that your redirect URI in `.env` matches exactly what's in Google Console
- Make sure you've added the redirect URI in Google Cloud Console
- Check for trailing slashes - they must match exactly

### Error: "Invalid client"
- Verify your Client ID is correct
- Make sure you copied the full Client ID (not truncated)

### Error: "Token verification failed"
- Check that `JWT_SECRET` is set in `server/.env`
- Make sure the frontend `VITE_GOOGLE_CLIENT_ID` matches the backend `GOOGLE_CLIENT_ID`

### Google Sign-In Popup Not Appearing
- Check browser console for errors
- Make sure `VITE_GOOGLE_CLIENT_ID` is set in frontend `.env`
- Verify the Google Identity Services script is loading (check Network tab)

## Production Deployment

When deploying to production:

1. **Update Google Cloud Console:**
   - Add your production domain to "Authorized JavaScript origins"
   - Add your production callback URL to "Authorized redirect URIs"

2. **Update Environment Variables:**
   - Backend: Update `GOOGLE_REDIRECT_URI` to production URL
   - Frontend: Update `VITE_API_URL` to production API URL

3. **OAuth Consent Screen:**
   - Submit your app for verification (if using external user type)
   - This is required for production use

## Security Notes

- **Never commit `.env` files to git**
- **Use different Client IDs for development and production**
- **Keep your Client Secret secure** - never expose it in frontend code
- **Use strong JWT secrets** - generate with crypto.randomBytes(64)
- **Enable HTTPS in production** - OAuth requires secure connections

## API Endpoints

The following endpoints are available:

- `GET /api/auth/google/url` - Get Google OAuth URL (server-side flow)
- `POST /api/auth/google/callback` - Handle OAuth callback with code
- `POST /api/auth/google/verify` - Verify Google ID token (client-side flow)
- `GET /api/auth/me` - Get current user (requires Bearer token)

## Next Steps

After setting up Google OAuth:

1. ✅ Test login flow
2. ✅ Implement protected routes (check for auth token)
3. ✅ Add logout functionality
4. ✅ Store user preferences/settings
5. ✅ Add user profile page

## Support

If you encounter issues:
1. Check Google Cloud Console for error messages
2. Review server logs for backend errors
3. Check browser console for frontend errors
4. Verify all environment variables are set correctly

