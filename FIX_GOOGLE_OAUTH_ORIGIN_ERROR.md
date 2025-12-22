# Fix Google OAuth "Origin Not Allowed" Error

## Error Message
```
[GSI_LOGGER]: The given origin is not allowed for the given client ID
```

## Solution

This error occurs when your frontend origin is not registered in Google Cloud Console. Follow these steps:

### 1. Go to Google Cloud Console
- Visit: https://console.cloud.google.com/
- Select your project
- Navigate to **APIs & Services** > **Credentials**

### 2. Find Your OAuth 2.0 Client ID
- Look for the OAuth 2.0 Client ID that matches your `VITE_GOOGLE_CLIENT_ID`
- Click on it to edit

### 3. Add Authorized JavaScript Origins
Add these origins (based on your Vite config):
- `http://localhost:8080` (default Vite dev server)
- `http://127.0.0.1:8080`
- `http://localhost:5173` (alternative Vite port)
- `http://127.0.0.1:5173`
- Your production URL (if applicable)

### 4. Add Authorized Redirect URIs
Add these redirect URIs:
- `http://localhost:8080`
- `http://127.0.0.1:8080`
- `http://localhost:5173`
- `http://127.0.0.1:5173`
- Your production URL (if applicable)

### 5. Save Changes
- Click **Save**
- Wait 1-2 minutes for changes to propagate

### 6. Clear Browser Cache
- Clear your browser cache or use an incognito/private window
- Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)

### 7. Restart Your Dev Server
- Stop your frontend dev server
- Restart it: `npm run dev`

## Common Issues

### Issue: Still getting the error after adding origins
**Solution:**
- Make sure you're using the correct Client ID (check your `.env` file)
- Ensure there are no typos in the origin URLs
- Wait a few minutes for Google's changes to propagate
- Try a different browser or incognito mode

### Issue: Timeout errors
**Solution:**
- Make sure your backend server is running: `cd server && npm start`
- Check that the server is accessible at `http://localhost:3000`
- Verify the `/health` endpoint works: `http://localhost:3000/health`

## Testing

After fixing, test the login:
1. Go to your login page
2. Click "Sign in with Google"
3. You should see the Google sign-in popup without errors
4. After signing in, you should be redirected to the dashboard

## Environment Variables

Make sure your `.env` file (in the root directory) has:
```
VITE_GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
VITE_API_URL=http://localhost:3000/api
```

## Need More Help?

Check the existing documentation:
- `GOOGLE_OAUTH_TROUBLESHOOTING.md`
- `GOOGLE_OAUTH_QUICK_START.md`
