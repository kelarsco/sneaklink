# Quick Start: Email Authentication Setup

## 🚀 What You Need to Do Right Now

### Step 1: Add Email Config to `server/.env`

Open `server/.env` file and add these lines at the end:

```env
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password_here
EMAIL_FROM=your_email@gmail.com
EMAIL_FROM_NAME=SneakLink
```

**Replace:**
- `your_email@gmail.com` → Your actual Gmail address
- `your_app_password_here` → Get from Step 2 below

### Step 2: Get Gmail App Password

**⚠️ IMPORTANT:** You CANNOT use your regular Gmail password!

1. Go to: https://myaccount.google.com/apppasswords
2. Sign in if needed
3. Select "Mail" as the app
4. Select your device
5. Click "Generate"
6. **Copy the 16-character password** (looks like: `abcd efgh ijkl mnop`)
7. **Remove the spaces** when pasting: `abcdefghijklmnop`
8. Paste it into `server/.env` as `EMAIL_PASSWORD`

**If you don't see "App passwords" option:**
- You need to enable 2-Step Verification first
- Go to: https://myaccount.google.com/security
- Enable "2-Step Verification"
- Then come back to generate App Password

### Step 3: Restart Backend Server

```bash
cd server
# Press Ctrl+C to stop if running
npm run dev
```

### Step 4: Test It!

1. Open: `http://localhost:8080/login`
2. Enter your email
3. Click "Continue with Email"
4. Check your email inbox
5. Enter the 6-digit code you received

## 📧 About Sender Email Visibility

**Yes, users will see:**
- **From:** SneakLink <your_email@gmail.com>
- The `EMAIL_FROM_NAME` shows as "SneakLink" (friendly name)
- The actual email address (`EMAIL_FROM`) is also visible

**To customize:**
- Change `EMAIL_FROM_NAME` in `server/.env` to any name you want
- Or use a custom domain email like `noreply@sneaklink.com` (requires custom SMTP setup)

## ✅ Quick Checklist

- [ ] Added email config to `server/.env`
- [ ] Generated Gmail App Password
- [ ] Pasted App Password (no spaces) into `EMAIL_PASSWORD`
- [ ] Restarted backend server
- [ ] Tested by sending verification code
- [ ] Received email with code
- [ ] Successfully logged in

## 🆘 Still Not Working?

**Check backend console** when you click "Continue with Email":
- ✅ Should see: `Verification email sent: <message-id>`
- ❌ Error? Check that `EMAIL_USER` and `EMAIL_PASSWORD` are correct

**Email not received?**
- Check spam folder
- Verify email address is correct
- Make sure you're using App Password (not regular password)
