# Google OAuth Quick Start Guide

## What You Need to Provide

To make Google OAuth work, you need to provide **3 pieces of information** from Google Cloud Console:

### 1. Google Client ID
- Format: `123456789-abcdefghijklmnop.apps.googleusercontent.com`
- Where to get it: Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client ID

### 2. Google Client Secret  
- Format: `GOCSPX-abcdefghijklmnopqrstuvwxyz`
- Where to get it: Same place as Client ID (shown when you create the OAuth client)

### 3. JWT Secret (Generate this yourself)
- Format: Any secure random string (64+ characters recommended)
- Generate with: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`

## Quick Setup Steps

### Step 1: Get Google Credentials

1. Go to: https://console.cloud.google.com/apis/credentials
2. Click "Create Credentials" → "OAuth client ID"
3. Configure:
   - **Type:** Web application
   - **Authorized redirect URIs:** `http://localhost:8080/auth/google/callback`
4. Copy the **Client ID** and **Client Secret**

### Step 2: Add to Backend `.env`

In `server/.env` file, add:

```env
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:8080/auth/google/callback
JWT_SECRET=your_generated_jwt_secret_here
```

### Step 3: Add to Frontend `.env`

In root `.env` file (create if doesn't exist), add:

```env
VITE_GOOGLE_CLIENT_ID=your_client_id_here
VITE_API_URL=http://localhost:3000/api
```

### Step 4: Install Dependencies

```bash
cd server
npm install google-auth-library jsonwebtoken
```

### Step 5: Restart Servers

```bash
# Backend
cd server
npm run dev

# Frontend (in another terminal)
npm run dev
```

### Step 6: Test

1. Go to: http://localhost:8080/login
2. Click "Continue with Google"
3. Sign in with your Google account
4. You should be redirected to the dashboard

## That's It! 🎉

For detailed setup instructions, see: `server/GOOGLE_OAUTH_SETUP.md`

