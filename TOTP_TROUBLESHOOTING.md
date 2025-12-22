# TOTP Authentication Troubleshooting Guide

## 🔧 Common Issues and Solutions

### Issue: "Authentication code expired" or "Invalid code"

This is usually caused by **time synchronization** issues between your phone and server.

#### Solution 1: Check Time Synchronization

**On Your Phone:**
1. Go to Settings → Date & Time
2. Enable "Automatic date & time" (or "Set automatically")
3. Make sure your phone's time is correct

**On Your Server:**
1. Check server time: `date` (Linux/Mac) or check system time (Windows)
2. Ensure server time is synchronized with NTP

#### Solution 2: Wait for New Code

- TOTP codes change every **30 seconds**
- If you're entering a code near the end of its 30-second window, wait for the next one
- The system accepts codes from a 5-window range (±150 seconds)

#### Solution 3: Verify Secret Configuration

1. **Check your `.env` file:**
   ```bash
   # In server/.env
   ADMIN_TOTP_SECRET=your_secret_here
   ```

2. **Make sure there's no extra whitespace:**
   ```env
   # ❌ Wrong (has spaces)
   ADMIN_TOTP_SECRET= M4UHGQCOKJHXOZ3OOBLHSUBDINYCGVBRFQ4TMYRQHJHGM33UFYVA 
   
   # ✅ Correct (no spaces)
   ADMIN_TOTP_SECRET=M4UHGQCOKJHXOZ3OOBLHSUBDINYCGVBRFQ4TMYRQHJHGM33UFYVA
   ```

3. **Verify the secret matches the QR code you scanned:**
   - Run `npm run generate-totp` again
   - Compare the secret with what's in your `.env`
   - If different, update `.env` and rescan the QR code

#### Solution 4: Test TOTP Code

Use the test script to verify your setup:

```bash
cd server
npm run test-totp
```

This will show:
- Current expected code
- Server time
- Whether a test code is valid

To test a specific code:
```bash
npm run test-totp 123456
```

---

## 🧪 Testing Your Setup

### Step 1: Generate Current Code

```bash
cd server
npm run test-totp
```

This shows what code the server expects right now.

### Step 2: Compare with Google Authenticator

1. Open Google Authenticator on your phone
2. Find "SneakLink Admin"
3. Compare the code with what the test script shows
4. If they match → Setup is correct, try logging in
5. If they don't match → Time sync issue or wrong secret

### Step 3: Check Time Difference

If codes don't match:
- Check your phone's time vs server time
- They should be within 2-3 minutes of each other
- If more than 5 minutes difference, sync your phone's time

---

## 🔄 Re-generating TOTP Secret

If you need to start fresh:

1. **Generate new secret:**
   ```bash
   cd server
   npm run generate-totp
   ```

2. **Update `.env`:**
   ```env
   ADMIN_TOTP_SECRET=new_secret_here
   ```

3. **Rescan QR code in Google Authenticator:**
   - Delete old "SneakLink Admin" entry
   - Scan new QR code from `server/totp-qr-code.png`

4. **Restart server:**
   ```bash
   npm run dev
   ```

---

## ⚙️ Advanced: Manual Time Adjustment

If time sync is still an issue, you can manually adjust the time window in `server/routes/admin.js`:

```javascript
const verified = speakeasy.totp.verify({
  secret: totpSecret,
  encoding: 'base32',
  token: code,
  window: 10, // Increase from 5 to 10 for more tolerance
  time: Math.floor(Date.now() / 1000),
});
```

**Note:** Increasing the window reduces security. Only do this if absolutely necessary.

---

## 📱 Google Authenticator Tips

1. **Use the current code:**
   - Codes change every 30 seconds
   - Always use the code currently displayed
   - Don't use a code you saw 1 minute ago

2. **Wait if code expires:**
   - If you see "code expired" while entering
   - Wait for the next code (usually 10-20 seconds)
   - Enter the new code

3. **Check app is working:**
   - Open Google Authenticator
   - Make sure "SneakLink Admin" shows a 6-digit code
   - Code should update every 30 seconds

---

## 🐛 Debug Mode

In development, the server logs debug information:

1. Check server console when you try to login
2. Look for "TOTP Debug" messages
3. Compare expected code with what you entered

To enable more debugging, check `server/routes/admin.js` - debug info is logged when `NODE_ENV=development`.

---

## ✅ Quick Checklist

- [ ] Phone time is synchronized (automatic date/time enabled)
- [ ] Server time is correct
- [ ] `ADMIN_TOTP_SECRET` is set in `server/.env`
- [ ] No extra spaces in `ADMIN_TOTP_SECRET`
- [ ] QR code was scanned correctly in Google Authenticator
- [ ] Using the current code (not an old one)
- [ ] Server was restarted after adding `ADMIN_TOTP_SECRET`
- [ ] Test script shows matching codes

---

## 🆘 Still Not Working?

1. **Run test script:**
   ```bash
   npm run test-totp
   ```

2. **Check server logs:**
   - Look for TOTP debug messages
   - Check for any errors

3. **Verify secret format:**
   - Should be base32 (uppercase letters and numbers)
   - Usually 32 characters long
   - No spaces or special characters

4. **Try regenerating:**
   - Generate new secret
   - Rescan QR code
   - Update `.env`
   - Restart server

---

**Last Updated:** 2024
**Status:** ✅ Troubleshooting guide ready!
