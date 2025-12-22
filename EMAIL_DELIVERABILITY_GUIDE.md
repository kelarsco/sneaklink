# Email Deliverability Guide - Preventing Spam Filtering

This guide explains how to ensure your verification emails reach users' inboxes instead of spam folders.

## 🎯 Quick Summary

To prevent emails from going to spam, you need to:
1. **Use a professional email service** (SendGrid, AWS SES, Mailgun) instead of Gmail
2. **Set up SPF, DKIM, and DMARC records** for your domain
3. **Use proper email headers** (already implemented in code)
4. **Follow email content best practices** (already implemented)
5. **Warm up your sending domain/IP** gradually

---

## 📋 Table of Contents

1. [Why Emails Go to Spam](#why-emails-go-to-spam)
2. [Quick Fixes (Immediate)](#quick-fixes-immediate)
3. [Professional Email Services](#professional-email-services)
4. [DNS Authentication Records](#dns-authentication-records)
5. [Email Content Best Practices](#email-content-best-practices)
6. [Domain Warm-up Process](#domain-warm-up-process)
7. [Testing Email Deliverability](#testing-email-deliverability)

---

## 🔍 Why Emails Go to Spam

Common reasons verification emails get filtered:

1. **No SPF/DKIM/DMARC records** - Email providers can't verify you're authorized to send
2. **Using free email services** (Gmail, Yahoo) - Lower reputation, more likely to be filtered
3. **Poor sender reputation** - New domain/IP with no sending history
4. **Suspicious content** - Spam trigger words, poor formatting
5. **Missing headers** - No List-Unsubscribe, Message-ID, etc.
6. **High bounce/complaint rates** - Recipients marking as spam

---

## ⚡ Quick Fixes (Immediate)

### 1. Use a Custom "From" Name

Update `server/.env`:

```env
EMAIL_FROM_NAME="SneakLink"
EMAIL_FROM="noreply@sneaklink.com"  # Use your domain, not Gmail
```

### 2. Add Reply-To Address

```env
EMAIL_REPLY_TO="support@sneaklink.com"
```

### 3. Use Professional Email Service

**Best for Production:** Use SendGrid, AWS SES, or Mailgun instead of Gmail. See [Professional Email Services](#professional-email-services) below.

---

## 🚀 Professional Email Services

### Option 1: SendGrid (Recommended - Easiest)

**Free Tier:** 100 emails/day forever

**Setup:**

1. **Sign up:** https://sendgrid.com/
2. **Get API Key:**
   - Go to Settings → API Keys
   - Create API Key with "Mail Send" permissions
   - Copy the key

3. **Update `server/.env`:**
   ```env
   EMAIL_SERVICE=sendgrid
   SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   EMAIL_FROM=noreply@sneaklink.com
   EMAIL_FROM_NAME=SneakLink
   ```

4. **Verify your domain** (for better deliverability):
   - Go to Settings → Sender Authentication
   - Add your domain
   - Add the DNS records they provide (SPF, DKIM)
   - Wait for verification (usually 24-48 hours)

**Benefits:**
- ✅ High deliverability (99%+ inbox rate)
- ✅ Free tier: 100 emails/day
- ✅ Automatic SPF/DKIM setup
- ✅ Detailed analytics
- ✅ Easy to set up

---

### Option 2: AWS SES (Cheapest for Scale)

**Free Tier:** 62,000 emails/month (if sending from EC2)

**Setup:**

1. **Sign up:** https://aws.amazon.com/ses/
2. **Verify your email/domain:**
   - Go to SES Console → Verified identities
   - Add your email or domain
   - Add DNS records (SPF, DKIM, DMARC)

3. **Get AWS credentials:**
   - Go to IAM → Users → Create user
   - Attach policy: `AmazonSESFullAccess`
   - Create access key

4. **Update `server/.env`:**
   ```env
   EMAIL_SERVICE=ses
   AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXXXXXXXX
   AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   AWS_SES_HOST=email-smtp.us-east-1.amazonaws.com  # Use your region
   AWS_SES_PORT=587
   EMAIL_FROM=noreply@sneaklink.com
   ```

**Benefits:**
- ✅ Very cheap ($0.10 per 1,000 emails)
- ✅ High deliverability
- ✅ Scales to millions of emails
- ⚠️ Requires AWS account setup

---

### Option 3: Mailgun (Good Balance)

**Free Tier:** 5,000 emails/month for 3 months, then paid

**Setup:**

1. **Sign up:** https://www.mailgun.com/
2. **Get API Key:**
   - Go to Sending → Domain settings
   - Copy SMTP credentials

3. **Update `server/.env`:**
   ```env
   EMAIL_SERVICE=mailgun
   MAILGUN_DOMAIN=mg.sneaklink.com
   MAILGUN_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-xxxxxxxx-xxxxxxxx
   MAILGUN_SMTP_USER=postmaster@mg.sneaklink.com
   EMAIL_FROM=noreply@sneaklink.com
   ```

**Benefits:**
- ✅ Good free tier
- ✅ Easy setup
- ✅ Good deliverability
- ⚠️ Free tier expires after 3 months

---

## 🔐 DNS Authentication Records

**CRITICAL:** These records prove you're authorized to send emails from your domain.

### SPF Record (Sender Policy Framework)

**What it does:** Lists which servers can send emails for your domain.

**Add to DNS:**
```
Type: TXT
Name: @ (or your domain)
Value: v=spf1 include:_spf.google.com ~all
```

**For SendGrid:**
```
v=spf1 include:sendgrid.net ~all
```

**For AWS SES:**
```
v=spf1 include:amazonses.com ~all
```

**For Mailgun:**
```
v=spf1 include:mailgun.org ~all
```

---

### DKIM Record (DomainKeys Identified Mail)

**What it does:** Cryptographically signs emails to prove authenticity.

**How to get:**
- **SendGrid:** Provided in Sender Authentication settings
- **AWS SES:** Generated in Verified identities → DKIM
- **Mailgun:** Provided in Domain settings

**Add to DNS:**
```
Type: TXT
Name: [selector]._domainkey (e.g., s1._domainkey)
Value: [long string provided by service]
```

---

### DMARC Record (Domain-based Message Authentication)

**What it does:** Tells email providers what to do with emails that fail SPF/DKIM.

**Add to DNS:**
```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=none; rua=mailto:dmarc@sneaklink.com
```

**Stages:**
1. **`p=none`** - Monitor only (start here)
2. **`p=quarantine`** - Send failures to spam
3. **`p=reject`** - Reject failures completely

**Start with `p=none` for 2-4 weeks, then move to `p=quarantine`.**

---

## ✉️ Email Content Best Practices

### ✅ Already Implemented in Code

The email service now includes:

1. **Proper HTML structure** - DOCTYPE, meta tags, viewport
2. **Professional formatting** - Clean design, proper spacing
3. **Text version** - Plain text fallback for all emails
4. **Proper headers:**
   - `Message-ID` - Unique identifier
   - `List-Unsubscribe` - Allows users to unsubscribe
   - `X-Mailer` - Identifies sending service
   - `Reply-To` - Proper reply address

### 📝 Content Guidelines

**Do:**
- ✅ Use clear, professional language
- ✅ Include your company name
- ✅ Provide clear call-to-action
- ✅ Include expiration time for codes
- ✅ Use proper grammar and spelling

**Don't:**
- ❌ Use ALL CAPS
- ❌ Use excessive exclamation marks!!!
- ❌ Include spam trigger words (FREE, CLICK HERE, etc.)
- ❌ Use URL shorteners (bit.ly, etc.)
- ❌ Include suspicious links

---

## 🔥 Domain Warm-up Process

**Important:** If you're using a new domain or email service, you need to "warm up" gradually.

### Week 1-2: Start Small
- Day 1-3: 10-20 emails/day
- Day 4-7: 50-100 emails/day
- Day 8-14: 200-500 emails/day

### Week 3-4: Increase Gradually
- Day 15-21: 1,000 emails/day
- Day 22-28: 2,000-5,000 emails/day

### After Month 1: Full Volume
- Gradually increase to your target volume
- Monitor bounce rates (keep < 5%)
- Monitor spam complaints (keep < 0.1%)

**Tools:**
- SendGrid: Automatic warm-up service
- AWS SES: Start in "Sandbox" mode (verify recipients first)

---

## 🧪 Testing Email Deliverability

### 1. Test with Email Testing Tools

**Free Tools:**
- **Mail Tester:** https://www.mail-tester.com/
  - Send email to the address they provide
  - Get score (aim for 10/10)
  - See what's wrong

- **MXToolbox:** https://mxtoolbox.com/
  - Check SPF, DKIM, DMARC records
  - Verify DNS configuration

### 2. Test with Real Email Providers

Send test emails to:
- Gmail
- Outlook/Hotmail
- Yahoo
- Apple Mail

Check:
- ✅ Inbox placement (not spam)
- ✅ Rendering (looks correct)
- ✅ Links work
- ✅ Images load

### 3. Monitor Metrics

**Key Metrics:**
- **Delivery Rate:** Should be > 95%
- **Open Rate:** 20-30% is normal for transactional emails
- **Bounce Rate:** Should be < 5%
- **Spam Complaint Rate:** Should be < 0.1%

**Where to check:**
- SendGrid: Dashboard → Activity
- AWS SES: Console → Sending statistics
- Mailgun: Dashboard → Logs

---

## 📊 Comparison: Email Services

| Service | Free Tier | Cost After Free | Best For |
|---------|-----------|-----------------|----------|
| **SendGrid** | 100/day forever | $19.95/month (40k) | Easiest setup, good for most |
| **AWS SES** | 62k/month (EC2) | $0.10/1k emails | High volume, cost-effective |
| **Mailgun** | 5k/month (3 months) | $35/month (50k) | Good balance |
| **Gmail** | Unlimited | Free | Development only ⚠️ |

**Recommendation:** Use **SendGrid** for production. It's the easiest to set up and has the best free tier.

---

## 🎯 Action Plan

### Immediate (Today):
1. ✅ Code already updated with proper headers
2. ⬜ Sign up for SendGrid (or AWS SES)
3. ⬜ Update `server/.env` with service credentials
4. ⬜ Test sending verification email

### This Week:
1. ⬜ Verify your domain in email service
2. ⬜ Add SPF record to DNS
3. ⬜ Add DKIM record to DNS
4. ⬜ Test with Mail Tester (aim for 10/10)

### This Month:
1. ⬜ Add DMARC record (start with `p=none`)
2. ⬜ Monitor deliverability metrics
3. ⬜ Warm up domain if new
4. ⬜ After 2-4 weeks, change DMARC to `p=quarantine`

---

## 🔗 Resources

- **SendGrid Setup:** https://docs.sendgrid.com/for-developers/sending-email/getting-started-sending-email
- **AWS SES Setup:** https://docs.aws.amazon.com/ses/latest/dg/send-email.html
- **Mailgun Setup:** https://documentation.mailgun.com/en/latest/quickstart-sending.html
- **SPF Record Generator:** https://www.spf-record.com/
- **DMARC Record Generator:** https://www.dmarcanalyzer.com/dmarc-record-generator/
- **Mail Tester:** https://www.mail-tester.com/

---

## ❓ FAQ

**Q: Can I use Gmail for production?**
A: Not recommended. Gmail has lower deliverability and may get filtered. Use SendGrid, AWS SES, or Mailgun.

**Q: How long does DNS propagation take?**
A: Usually 1-24 hours, but can take up to 48 hours.

**Q: What if my emails still go to spam?**
A: Check Mail Tester score, verify SPF/DKIM/DMARC are set correctly, ensure domain is warmed up, and monitor bounce/complaint rates.

**Q: Do I need all three (SPF, DKIM, DMARC)?**
A: Yes, for best deliverability. Start with SPF and DKIM, then add DMARC.

**Q: Can I skip domain warm-up?**
A: Not recommended. Sending too many emails too quickly can damage your sender reputation permanently.

---

## ✅ Checklist

- [ ] Signed up for professional email service (SendGrid/AWS SES/Mailgun)
- [ ] Updated `server/.env` with service credentials
- [ ] Verified domain in email service
- [ ] Added SPF record to DNS
- [ ] Added DKIM record to DNS
- [ ] Added DMARC record to DNS (start with `p=none`)
- [ ] Tested with Mail Tester (score 8+/10)
- [ ] Tested with real email providers (Gmail, Outlook, Yahoo)
- [ ] Started domain warm-up process
- [ ] Monitoring deliverability metrics

---

**Last Updated:** 2024
**Status:** ✅ Code updated with best practices. Ready for DNS configuration.
