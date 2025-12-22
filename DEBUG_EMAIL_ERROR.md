# Debug Email Error Guide

## Current Error: "Failed to send verification email"

This error usually means the email service cannot authenticate or connect to the email server.

## Quick Fixes

### Fix 1: Check Email Configuration in `server/.env`

Make sure you have these lines in `server/.env`:

```env
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
EMAIL_FROM=your_email@gmail.com
```

**Common Issues:**
- ❌ `EMAIL_USER` or `EMAIL_PASSWORD` missing
- ❌ Using regular Gmail password instead of App Password
- ❌ App Password has spaces (should be: `abcdefghijklmnop`, not `abcd efgh ijkl mnop`)

### Fix 2: Verify App Password

**For Gmail users:**
1. Go to: https://myaccount.google.com/apppasswords
2. Generate a new App Password for "Mail"
3. Copy the 16-character code
4. **Remove all spaces** when pasting into `.env`
5. Restart backend server

### Fix 3: Check Environment Variables

Test if environment variables are being read:

```bash
cd server
node -e "
require('dotenv').config();
console.log('EMAIL_USER:', process.env.EMAIL_USER || '❌ NOT SET');
console.log('EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? '✅ Set (' + process.env.EMAIL_PASSWORD.length + ' chars)' : '❌ NOT SET');
console.log('EMAIL_SERVICE:', process.env.EMAIL_SERVICE || 'Not set');
"
```

**Expected output:**
```
EMAIL_USER: your_email@gmail.com
EMAIL_PASSWORD: ✅ Set (16 chars)
EMAIL_SERVICE: gmail
```

### Fix 4: Restart Backend Server

After changing `.env` file, **always restart the server**:

```bash
cd server
# Press Ctrl+C to stop
npm run dev
```

## Common Error Messages

### "Email authentication failed"
- **Cause:** Wrong EMAIL_USER or EMAIL_PASSWORD
- **Fix:** Double-check credentials in `server/.env`
- **For Gmail:** Must use App Password, not regular password

### "Cannot connect to email server"
- **Cause:** Network issue or wrong SMTP settings
- **Fix:** Check internet connection, verify SMTP_HOST if using custom SMTP

### "Email credentials not configured"
- **Cause:** EMAIL_USER or EMAIL_PASSWORD missing in `.env`
- **Fix:** Add them to `server/.env` file

## Step-by-Step Debugging

1. **Check if variables are set:**
   ```bash
   cd server
   node -e "require('dotenv').config(); console.log(process.env.EMAIL_USER, process.env.EMAIL_PASSWORD ? 'Password set' : 'No password');"
   ```

2. **Check backend console:**
   - Look for the actual error message (not just "Failed to send")
   - Check if it says "EAUTH" (authentication error)
   - Check if it says "ECONNECTION" (connection error)

3. **Test email manually:**
   - Try sending an email from a regular email client using the same credentials
   - If that works, the credentials are correct
   - If not, verify the App Password is correct

4. **Verify .env file location:**
   - Make sure `.env` is in `server/` directory (not root)
   - File should be named exactly `.env` (not `.env.txt` or `.env.local`)

## Still Not Working?

Share the **full error message** from the backend console (the detailed one, not just "Failed to send verification email"). The improved error handling should now show more specific error messages.
