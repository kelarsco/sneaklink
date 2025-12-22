# Troubleshooting: "Failed to send verification code"

## Common Causes and Solutions

### 1. Missing Email Credentials in .env

**Error:** "Email credentials not configured"

**Solution:**
1. Check that `server/.env` file exists
2. Ensure these variables are set:
   ```env
   EMAIL_USER=your_email@gmail.com
   EMAIL_APP_PASSWORD=your_16_character_app_password
   ```
3. **Important:** Use `EMAIL_APP_PASSWORD`, not your regular Gmail password
4. Restart the server after updating `.env`

### 2. Using Regular Gmail Password Instead of App Password

**Error:** "Email authentication failed" or "Invalid login"

**Solution:**
1. You **must** use a Gmail App Password, not your regular password
2. Follow these steps to generate an App Password:
   - Go to https://myaccount.google.com/apppasswords
   - Select "Mail" as the app
   - Select "Other (Custom name)" as device
   - Enter "SneakLink" as the name
   - Click "Generate"
   - Copy the 16-character password (remove spaces)
   - Use it in `EMAIL_APP_PASSWORD` in your `.env` file

### 3. 2-Step Verification Not Enabled

**Error:** App Passwords option not available

**Solution:**
1. Enable 2-Step Verification first:
   - Go to https://myaccount.google.com/security
   - Enable "2-Step Verification"
2. Then generate App Password (see step 2 above)

### 4. Incorrect Email Format in .env

**Error:** Various authentication errors

**Solution:**
- Make sure `EMAIL_USER` is your full Gmail address: `yourname@gmail.com`
- No quotes needed in `.env` file
- No spaces around the `=` sign

### 5. Server Not Restarted After .env Changes

**Error:** Still getting old errors

**Solution:**
- **Always restart the server** after changing `.env` file
- Stop the server (Ctrl+C)
- Start it again: `npm run dev` or `npm start`

### 6. Check Server Console for Detailed Errors

The server console will show more specific error messages:

```bash
# Look for these in your server console:
❌ Email authentication failed...
❌ Email credentials not configured...
❌ Cannot connect to email server...
```

## Quick Verification Steps

1. **Check .env file exists:**
   ```bash
   ls server/.env
   # or on Windows:
   dir server\.env
   ```

2. **Verify variables are set:**
   ```bash
   # The file should contain:
   EMAIL_USER=your_email@gmail.com
   EMAIL_APP_PASSWORD=abcdefghijklmnop
   ```

3. **Test email configuration:**
   - Restart server
   - Try sending a verification code
   - Check server console for specific error messages

## Example .env Configuration

```env
# Email Configuration
EMAIL_USER=dkelaroma@gmail.com
EMAIL_APP_PASSWORD=abcd efgh ijkl mnop  # Remove spaces: abcdefghijklmnop
ADMIN_EMAIL=dkelaroma@gmail.com
```

**Note:** Remove spaces from the App Password when adding to `.env`

## Still Having Issues?

1. Check server console for the **exact error message**
2. Verify 2-Step Verification is enabled on your Google Account
3. Generate a new App Password and update `.env`
4. Restart the server
5. Try again

## Support

If you continue to have issues:
- Share the **exact error message** from the server console
- Confirm that `EMAIL_USER` and `EMAIL_APP_PASSWORD` are set in `server/.env`
- Verify 2-Step Verification is enabled on your Google Account
