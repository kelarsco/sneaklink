# Fix TOTP Secret Mismatch

## 🔴 Problem

The code from your Google Authenticator app is **different** from what the server expects. This means:

**The secret in `server/.env` doesn't match the secret that was used to generate the QR code you scanned.**

---

## ✅ Solution: Regenerate and Rescan

### Step 1: Generate New Secret and QR Code

```bash
cd server
npm run generate-totp
```

This will:
- Generate a NEW secret
- Create a NEW QR code
- Show you the secret to add to `.env`

### Step 2: Copy the Secret to .env

The script will show you something like:
```
ADMIN_TOTP_SECRET=M4UHGQCOKJHXOZ3OOBLHSUBDINYCGVBRFQ4TMYRQHJHGM33UFYVA
```

**Copy this EXACT secret** and add it to `server/.env`:

```env
ADMIN_TOTP_SECRET=M4UHGQCOKJHXOZ3OOBLHSUBDINYCGVBRFQ4TMYRQHJHGM33UFYVA
```

**Important:**
- No spaces before or after the `=`
- Copy the entire secret (usually 32-52 characters)
- Make sure there are no extra characters

### Step 3: Delete Old Entry in Google Authenticator

1. Open **Google Authenticator** on your phone
2. Find **"SneakLink Admin"** (or whatever you named it)
3. Delete/Remove it

### Step 4: Scan New QR Code

1. In Google Authenticator, tap **"+"** to add account
2. Choose **"Scan a QR code"**
3. Scan the NEW QR code from `server/totp-qr-code.png`
4. You should see "SneakLink Admin" appear

### Step 5: Verify Setup

Test that everything matches:

```bash
cd server
npm run test-totp
```

This shows what code the server expects. Compare it with Google Authenticator:
- ✅ **If they match** → Setup is correct! Try logging in.
- ❌ **If they don't match** → Go back to Step 1 and try again.

### Step 6: Restart Server

```bash
cd server
npm run dev
```

### Step 7: Test Login

1. Go to `http://localhost:8080/admin/login`
2. Enter the 6-digit code from Google Authenticator
3. Click "Sign In"

---

## 🔍 Verify Your Current Setup

Check what's currently configured:

```bash
cd server
npm run verify-totp
```

This will show:
- What secret is in your `.env` file
- What code the server expects
- Whether QR code file exists

---

## 🐛 Common Mistakes

### ❌ Wrong: Secret has spaces
```env
ADMIN_TOTP_SECRET= M4UHGQCOKJHXOZ3OOBLHSUBDINYCGVBRFQ4TMYRQHJHGM33UFYVA 
```

### ✅ Correct: No spaces
```env
ADMIN_TOTP_SECRET=M4UHGQCOKJHXOZ3OOBLHSUBDINYCGVBRFQ4TMYRQHJHGM33UFYVA
```

### ❌ Wrong: Using old secret with new QR code
- Generated QR code with Secret A
- But `.env` has Secret B
- Scanned QR code (which uses Secret A)
- Codes won't match!

### ✅ Correct: Secret and QR code must match
- Generate secret → Save to `.env` → Scan QR code
- All three must use the SAME secret

---

## 📝 Quick Fix Checklist

- [ ] Run `npm run generate-totp` to get new secret
- [ ] Copy the EXACT secret shown (no spaces)
- [ ] Add to `server/.env` as `ADMIN_TOTP_SECRET=...`
- [ ] Delete old "SneakLink Admin" from Google Authenticator
- [ ] Scan NEW QR code from `server/totp-qr-code.png`
- [ ] Run `npm run test-totp` to verify codes match
- [ ] Restart server: `npm run dev`
- [ ] Try logging in with code from Google Authenticator

---

## 🆘 Still Not Working?

1. **Double-check the secret:**
   ```bash
   npm run verify-totp
   ```
   Compare the secret shown with what's in `.env`

2. **Test with a code:**
   ```bash
   npm run test-totp 123456
   ```
   Replace `123456` with a code from Google Authenticator

3. **Regenerate completely:**
   - Delete `.env` entry
   - Delete QR code file
   - Run `npm run generate-totp` again
   - Start fresh

---

**The key is: The secret in `.env` MUST match the secret used to generate the QR code you scanned.**
