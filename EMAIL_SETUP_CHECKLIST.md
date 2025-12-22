# Email Authentication Setup Checklist

## ✅ What You Need to Do Now

### Step 1: Configure Email Service in `server/.env`

Open `server/.env` and add these lines:

```env
# Email Configuration for Sending Verification Codes
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
EMAIL_FROM=your_email@gmail.com
```

**Replace:**
- `your_email@gmail.com` with your Gmail address (or use a custom domain)
- `your_app_password` with Gmail App Password (see Step 2)

### Step 2: Get Gmail App Password (if using Gmail)

**IMPORTANT:** You cannot use your regular Gmail password. You need an App Password.

1. **Enable 2-Step Verification:**
   - Go to: https://myaccount.google.com/security
   - Click "2-Step Verification"
   - Follow the steps to enable it

2. **Generate App Password:**
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" as the app
   - Select your device (or "Other (Custom name)")
   - Click "Generate"
   - **Copy the 16-character password** (it looks like: `abcd efgh ijkl mnop`)
   - **Remove spaces** when pasting into `.env` file: `abcdefghijklmnop`

3. **Add to `server/.env`:**
   ```env
   EMAIL_PASSWORD=abcdefghijklmnop
   ```

### Step 3: Restart Backend Server

After adding email configuration:

```bash
cd server
# Stop the server (Ctrl+C if running)
npm run dev
```

You should see the server start successfully.

### Step 4: Test the Email Flow

1. **Start Frontend** (if not running):
   ```bash
   npm run dev
   ```

2. **Test Login:**
   - Go to: `http://localhost:8080/login`
   - Enter your email address
   - Click "Continue with Email"
   - Check your email inbox (and spam folder)
   - You should receive a 6-digit code

3. **Verify Code:**
   - Enter the code on the verification page
   - Should redirect to dashboard

## 📧 About the Sender Email

**Yes, users will see the sender email address** in their inbox. It appears in the "From" field of the email.

### Current Setup:
- Uses `EMAIL_FROM` from `server/.env`
- Shows your email address to recipients

### Options to Customize:

**Option 1: Use a Custom "From" Name**
You can modify the email to show a friendly name:
```env
EMAIL_FROM="SneakLink <your_email@gmail.com>"
```

**Option 2: Use a Custom Domain Email**
For a more professional look:
```env
EMAIL_FROM=noreply@sneaklink.com
EMAIL_USER=noreply@sneaklink.com
```

**Option 3: Use a Dedicated Email Service (Production)**
For production, use services like:
- **SendGrid** (Free tier: 100 emails/day)
- **AWS SES** (Very cheap, $0.10 per 1000 emails)
- **Mailgun** (Free tier: 5000 emails/month)

## 🔍 Verify Your Setup

### Check if Email Config is Working:

1. **Check Backend Console:**
   After clicking "Continue with Email", you should see:
   ```
   Verification email sent: <message-id>
   ```

2. **Check Email Inbox:**
   - Look for email from your `EMAIL_FROM` address
   - Subject: "SneakLink - Email Verification Code"
   - Contains 6-digit code

3. **If Email Not Received:**
   - Check spam folder
   - Verify `EMAIL_USER` and `EMAIL_PASSWORD` are correct
   - Make sure you're using App Password (not regular password)
   - Check backend console for errors

## ⚠️ Common Issues

### "Failed to send verification code"
- **Cause:** Wrong email credentials
- **Fix:** Double-check `EMAIL_USER` and `EMAIL_PASSWORD` in `server/.env`
- **Note:** Must use App Password for Gmail, not regular password

### "Invalid login: 534-5.7.9 Application-specific password required"
- **Cause:** Using regular Gmail password instead of App Password
- **Fix:** Generate App Password from Google Account settings

### "Email not received"
- **Cause:** Email in spam, wrong address, or email service not configured
- **Fix:** Check spam folder, verify email address, check backend console

## 📝 Quick Test Command

Test if email service is configured correctly:

```bash
cd server
node -e "
require('dotenv').config();
console.log('EMAIL_USER:', process.env.EMAIL_USER ? '✅ Set' : '❌ Not set');
console.log('EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? '✅ Set' : '❌ Not set');
console.log('EMAIL_FROM:', process.env.EMAIL_FROM || 'Not set');
"
```

## ✅ Summary Checklist

- [ ] Added email configuration to `server/.env`
- [ ] Generated Gmail App Password (if using Gmail)
- [ ] Restarted backend server
- [ ] Tested email sending
- [ ] Received verification code in email
- [ ] Successfully logged in with code

## 🚀 Next Steps After Setup

Once email authentication is working:
1. ✅ Test full login flow
2. ✅ Verify users are saved to MongoDB
3. ✅ Check admin dashboard can query users
4. ✅ Consider customizing email template
5. ✅ Set up production email service (for deployment)
