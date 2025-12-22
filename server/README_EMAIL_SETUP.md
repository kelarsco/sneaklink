# Email Setup for Contact Forms

## Quick Setup Guide

To enable contact form email notifications, you need to configure Gmail in your `.env` file.

### Step 1: Enable 2-Step Verification
1. Go to your Google Account: https://myaccount.google.com/
2. Navigate to **Security**
3. Enable **2-Step Verification** if not already enabled

### Step 2: Generate App Password
1. Go to App Passwords: https://myaccount.google.com/apppasswords
2. Select **Mail** as the app
3. Select **Other (Custom name)** as the device
4. Enter "SneakLink Server" as the name
5. Click **Generate**
6. Copy the 16-character password (it will look like: `abcd efgh ijkl mnop`)

### Step 3: Configure .env File
Add these variables to your `server/.env` file:

```env
EMAIL_USER=your_gmail@gmail.com
EMAIL_APP_PASSWORD=abcdefghijklmnop  # The 16-character app password (remove spaces)
ADMIN_EMAIL=dkelaroma@gmail.com
```

### Step 4: Test Email Configuration
Restart your server and check the console for email configuration validation.

## How It Works

- When a user submits the contact form (homepage or account dashboard), an email is sent to `ADMIN_EMAIL`
- The email includes:
  - Sender's name and email
  - Message content
  - Source (homepage or account dashboard)
  - Subject (for account support form)
- You can reply directly to the email to respond to the customer

## Troubleshooting

**Error: "Invalid login"**
- Make sure you're using an App Password, not your regular Gmail password
- Verify 2-Step Verification is enabled

**Error: "Connection timeout"**
- Check your firewall settings
- Ensure port 587 (SMTP) is not blocked

**Emails not received**
- Check spam folder
- Verify ADMIN_EMAIL is correct
- Check server logs for error messages
