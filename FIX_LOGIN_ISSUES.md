# 🔧 Fix Login Issues - Google OAuth & Email Service

## Issues Fixed

### ✅ 1. Google OAuth "Origin Not Allowed" Error
- **Error:** `The given origin is not allowed for the given client ID`
- **Fix:** Add your frontend URL to Google Cloud Console
- **Guide:** See `server/FIX_GOOGLE_OAUTH_ORIGIN.md`

### ✅ 2. Email Service "Unexpected Socket Close" Error
- **Error:** `Unexpected socket close` when sending verification emails
- **Fix:** Improved connection handling, timeout settings, and better error messages
- **Guide:** See `server/FIX_EMAIL_SERVICE.md`

---

## Quick Fix Steps

### Google OAuth Fix (5 minutes)

1. **Get your frontend URL** (check browser address bar)
   - Usually: `http://localhost:8080` or `http://localhost:5173`

2. **Add to Google Cloud Console:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - APIs & Services → Credentials
   - Edit your OAuth 2.0 Client ID
   - Add frontend URL to **Authorized JavaScript origins**
   - Add `http://localhost:8080/auth/google/callback` to **Authorized redirect URIs**
   - Click **SAVE**

3. **Wait 1-5 minutes** for changes to propagate

4. **Clear browser cache** and try again

### Email Service Fix (5 minutes)

1. **Check `server/.env` has:**
   ```env
   EMAIL_USER=your-email@gmail.com
   EMAIL_APP_PASSWORD=your-16-char-app-password
   ```

2. **Get Gmail App Password:**
   - Go to [Google Account](https://myaccount.google.com/)
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
   - Copy 16-character password (no spaces)

3. **Update `.env`** with App Password

4. **Restart server:**
   ```cmd
   cd server
   npm run dev
   ```

---

## Verification

### Test Google OAuth:
1. Go to login page
2. Click "Sign in with Google"
3. Should redirect to Google login (no origin error)

### Test Email Service:
1. Go to login page
2. Enter email and click "Send Code"
3. Should receive email (no socket close error)

---

## Still Having Issues?

### Google OAuth:
- Check `VITE_GOOGLE_CLIENT_ID` in frontend `.env`
- Check `GOOGLE_CLIENT_ID` in backend `.env`
- Verify backend is running on port 3000
- Check `VITE_API_URL` matches backend URL

### Email Service:
- Verify App Password is correct (16 chars, no spaces)
- Check 2-Step Verification is enabled
- Try different SMTP port (465 or 587)
- Consider using SendGrid/AWS SES for production

---

## Files Updated

1. ✅ `server/utils/emailService.js` - Improved connection handling
2. ✅ `server/FIX_GOOGLE_OAUTH_ORIGIN.md` - Google OAuth fix guide
3. ✅ `server/FIX_EMAIL_SERVICE.md` - Email service fix guide

---

**Both issues should now be resolved!** ✅
