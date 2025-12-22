# Email Authentication Setup

## Overview
This guide will help you set up email-based authentication with 6-digit verification codes. The system uses a backend email service (nodemailer) to send verification codes.

## Step 1: Configure Email Service (Backend)

The system uses nodemailer to send verification codes. You need to configure email credentials in `server/.env`.

### Option 1: Gmail (Recommended for Development)

1. **Enable 2-Step Verification:**
   - Go to: https://myaccount.google.com/security
   - Enable "2-Step Verification"

2. **Generate App Password:**
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and your device
   - Click "Generate"
   - Copy the 16-character password

3. **Add to `server/.env`:**
   ```env
   EMAIL_SERVICE=gmail
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASSWORD=your_16_char_app_password
   EMAIL_FROM=your_email@gmail.com
   ```

### Option 2: Custom SMTP

Add to `server/.env`:
```env
SMTP_HOST=smtp.your-domain.com
SMTP_PORT=587
SMTP_SECURE=false
EMAIL_USER=your_email@domain.com
EMAIL_PASSWORD=your_password
EMAIL_FROM=your_email@domain.com
```

## Step 2: Test the Setup

1. **Start Backend Server:**
   ```bash
   cd server
   npm run dev
   ```

2. **Start Frontend:**
   ```bash
   npm run dev
   ```

3. **Test Email Login:**
   - Go to: `http://localhost:8080/login`
   - Enter your email
   - Click "Continue with Email"
   - Check your email for verification code
   - Enter code on verification page
   - Should redirect to dashboard

## How It Works

1. **User enters email** → Firebase sends verification code via email
2. **User receives code** → Code expires in 5 minutes
3. **User enters code** → Frontend verifies with Firebase
4. **Backend creates/login user** → Saves to MongoDB
5. **JWT token generated** → User is logged in

## Troubleshooting

### Error: "Failed to send verification code"
- **Solution:** Check email credentials in `server/.env`
- For Gmail: Make sure you're using an App Password, not your regular password
- Restart backend server after changing `.env`

### Code Not Received
- Check spam folder
- Verify email address is correct
- Check backend console for email sending errors
- Verify SMTP credentials are correct

### Code Expired
- Codes expire in 5 minutes
- Click "Resend Code" to get a new one
- Wait for countdown timer to finish before resending

### Gmail App Password Issues
- Make sure 2-Step Verification is enabled
- Generate a new App Password if old one doesn't work
- Use the 16-character password (no spaces)

## Security Notes

- **Never commit `.env` files`** to git
- **Use App Passwords for Gmail** (not your regular password)
- **Use a dedicated email service** (SendGrid, AWS SES) for production
- **Rate limit code requests** to prevent abuse
- **Codes expire in 5 minutes** for security

## Next Steps

After setup:
1. ✅ Test email login flow
2. ✅ Verify users are saved to MongoDB
3. ✅ Check admin dashboard can access user data
4. ✅ Set up production Firebase project
5. ✅ Configure production authorized domains
