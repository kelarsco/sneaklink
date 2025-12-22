# How Google OAuth Works with Your Backend

## Quick Answer

**NO, you do NOT need to add your backend URL to Google's authorized JavaScript origins.**

Here's why and how it works:

## The OAuth Flow

### Step 1: Frontend (Browser) → Google
```
User clicks "Sign in with Google"
  ↓
Browser (localhost:8080) → Google OAuth Service
  ↓
Google shows login popup
  ↓
User signs in
  ↓
Google returns ID token to browser
```

**This is where "Authorized JavaScript Origins" matters:**
- Your frontend URL (`http://localhost:8080`) must be in Google's authorized origins
- This allows your browser to communicate with Google's OAuth service
- **Backend is NOT involved at this step**

### Step 2: Frontend → Your Backend
```
Browser receives ID token from Google
  ↓
Frontend sends ID token to: POST http://localhost:3000/api/auth/google/verify
  ↓
Backend receives the ID token
```

**This is a normal API call:**
- Your backend at `localhost:3000` doesn't need to be in Google's authorized origins
- It's just your frontend calling your own backend API
- Like any other API call (fetching stores, etc.)

### Step 3: Backend → Google (Server-to-Server)
```
Backend receives ID token
  ↓
Backend uses GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
  ↓
Backend calls Google's API: verifyIdToken()
  ↓
Google verifies the token and returns user data
```

**This is server-to-server communication:**
- Your backend makes direct API calls to Google's servers
- Uses `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` from your `.env` file
- **No browser involved, so no "authorized origins" needed**
- Google trusts your backend because you have the client secret

### Step 4: Backend → Your Database
```
Backend receives user data from Google
  ↓
Backend checks if user exists in PostgreSQL
  ↓
If new user: Creates user in database
If existing: Updates last login
  ↓
Backend creates session and JWT token
  ↓
Backend returns user data + JWT token to frontend
```

## What You Need to Configure

### 1. Google Cloud Console (Frontend Only)
**Authorized JavaScript Origins** (for browser):
- `http://localhost:8080`
- `http://127.0.0.1:8080`
- Your production frontend URL (when deployed)

**Authorized Redirect URIs** (for browser):
- `http://localhost:8080`
- `http://localhost:8080/auth/google/callback`
- Your production callback URL (when deployed)

**❌ DO NOT ADD:**
- `http://localhost:3000` (your backend)
- Any backend URLs

### 2. Backend Environment Variables
In `server/.env`:
```env
GOOGLE_CLIENT_ID=897917467114-eabq6cjm1hq5vdjopr0j73onrfnsn20n.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
GOOGLE_REDIRECT_URI=http://localhost:8080/auth/google/callback
```

**These are used for server-to-server communication:**
- `GOOGLE_CLIENT_ID`: Identifies your app to Google
- `GOOGLE_CLIENT_SECRET`: Proves your backend is authorized (keep secret!)
- `GOOGLE_REDIRECT_URI`: Used for OAuth flow (not needed for ID token verification)

### 3. Frontend Environment Variables
In root `.env`:
```env
VITE_GOOGLE_CLIENT_ID=897917467114-eabq6cjm1hq5vdjopr0j73onrfnsn20n.apps.googleusercontent.com
VITE_API_URL=http://localhost:3000/api
```

## How Backend Gets Data from Google

Looking at `server/routes/auth.js`:

```javascript
// 1. Backend receives ID token from frontend
const { idToken } = req.body;

// 2. Backend creates Google OAuth client
const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,    // Your client ID
  process.env.GOOGLE_CLIENT_SECRET, // Your client secret
  process.env.GOOGLE_REDIRECT_URI
);

// 3. Backend verifies token with Google (server-to-server API call)
const ticket = await client.verifyIdToken({
  idToken: idToken,
  audience: process.env.GOOGLE_CLIENT_ID,
});

// 4. Backend extracts user data from verified token
const payload = ticket.getPayload();
const { sub: googleId, email, name, picture } = payload;

// 5. Backend saves to your database
const user = await prisma.user.create({
  data: {
    googleId: googleId,
    email: email.toLowerCase(),
    name: name,
    picture: picture,
    // ... other fields
  },
});
```

## Key Points

1. **Authorized JavaScript Origins** = Only for browser (frontend)
   - Your backend URL is NOT needed here
   - Only your frontend URL (`localhost:8080`)

2. **Backend → Google Communication** = Server-to-server
   - Uses `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
   - Direct API calls to Google's servers
   - No browser involved, so no origin restrictions

3. **Your Backend → Your Database** = Internal
   - Your backend saves user data to PostgreSQL
   - No Google involvement at this step

## Summary

```
Browser (localhost:8080) 
  → Google OAuth (needs authorized origin)
  → Gets ID token
  → Sends to Your Backend (localhost:3000)
  → Your Backend verifies with Google (server-to-server)
  → Your Backend saves to PostgreSQL
  → Your Backend returns JWT token to browser
```

**You only need to add `http://localhost:8080` to Google's authorized origins.**
**Your backend (`localhost:3000`) does NOT need to be added.**
