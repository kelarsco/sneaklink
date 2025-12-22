# 🔧 Fix Email Service "Unexpected Socket Close" Error

## The Problem

The error `Unexpected socket close` means the email service cannot maintain a connection to the SMTP server.

## Common Causes

1. **Wrong SMTP credentials** (most common)
2. **Network/firewall blocking SMTP port**
3. **SMTP server rejecting connection**
4. **Gmail App Password not configured correctly**

## Solution

### Step 1: Check Email Configuration

Verify your `server/.env` file has correct email settings:

```env
# For Gmail (recommended)
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_APP_PASSWORD=your-16-char-app-password

# OR for generic SMTP
EMAIL_SERVICE=
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_APP_PASSWORD=your-16-char-app-password
```

### Step 2: Get Gmail App Password (if using Gmail)

1. Go to [Google Account Settings](https://myaccount.google.com/)
2. Click **Security** → **2-Step Verification** (must be enabled)
3. Scroll down to **App passwords**
4. Select **Mail** and **Other (Custom name)**
5. Enter "SneakLink" as the name
6. Click **Generate**
7. Copy the 16-character password (no spaces)
8. Paste it in `.env` as `EMAIL_APP_PASSWORD`

**Important:** Use App Password, NOT your regular Gmail password!

### Step 3: Test Email Connection

Create a test script to verify email works:

```javascript
// server/test-email.js
import { sendVerificationCode } from './utils/emailService.js';

try {
  await sendVerificationCode('your-email@gmail.com', '123456');
  console.log('✅ Email sent successfully!');
} catch (error) {
  console.error('❌ Email failed:', error.message);
}
```

Run: `node server/test-email.js`

### Step 4: Check Network/Firewall

If using a corporate network or VPN:
- SMTP port 587 might be blocked
- Try port 465 with `SMTP_SECURE=true`
- Or use a different email service (SendGrid, AWS SES, Mailgun)

### Step 5: Alternative Email Services

If Gmail doesn't work, try these:

#### SendGrid (Recommended for Production)

```env
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=your-sendgrid-api-key
EMAIL_FROM=noreply@yourdomain.com
```

#### AWS SES

```env
EMAIL_SERVICE=ses
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_SES_HOST=email-smtp.us-east-1.amazonaws.com
AWS_SES_PORT=587
```

#### Mailgun

```env
EMAIL_SERVICE=mailgun
MAILGUN_API_KEY=your-api-key
MAILGUN_DOMAIN=yourdomain.com
EMAIL_FROM=noreply@yourdomain.com
```

### Step 6: Restart Server

After updating `.env`:

```cmd
cd server
npm run dev
```

### Step 7: Test Again

Try sending a verification code from the login page.

---

## Quick Checklist

- [ ] `EMAIL_USER` is set correctly
- [ ] `EMAIL_APP_PASSWORD` is set (16 characters, no spaces)
- [ ] Using App Password, NOT regular password
- [ ] 2-Step Verification is enabled on Gmail account
- [ ] SMTP port (587 or 465) is not blocked by firewall
- [ ] Restarted server after changing `.env`
- [ ] Tested email connection with test script

---

## Still Not Working?

1. **Check server logs** for detailed error messages
2. **Try different SMTP port**: 465 (secure) or 587 (TLS)
3. **Use alternative email service** (SendGrid, AWS SES)
4. **Check if email account is locked** or requires verification

---

**After completing these steps, email service should work!** ✅
