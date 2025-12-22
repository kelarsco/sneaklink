# Quick Security Setup Guide

## Step 1: Install Security Dependencies

```bash
cd server
npm install
```

This will install:
- `helmet` - Security headers
- `express-rate-limit` - Rate limiting

## Step 2: Generate API Keys

```bash
npm run generate-keys
```

This will generate secure random API keys. Copy them to your `.env` file.

## Step 3: Configure Environment Variables

Edit `server/.env` and add:

```env
# Security Keys (REQUIRED for write operations)
API_KEY=paste_generated_key_here
ADMIN_API_KEY=paste_generated_admin_key_here

# Production Settings
NODE_ENV=production
```

## Step 4: Test Security

1. **Test without API key (should fail for write operations):**
```bash
curl -X POST http://localhost:3000/api/stores \
  -H "Content-Type: application/json" \
  -d '{"url":"https://test.myshopify.com"}'
# Should return 401 Unauthorized
```

2. **Test with API key (should work):**
```bash
curl -X POST http://localhost:3000/api/stores \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key_here" \
  -d '{"url":"https://test.myshopify.com"}'
# Should work if key is valid
```

3. **Test rate limiting:**
```bash
# Make 101 requests quickly - should hit rate limit
for i in {1..101}; do curl http://localhost:3000/api/stores; done
# Should return 429 Too Many Requests after 100 requests
```

## Step 5: Verify Security Headers

```bash
curl -I http://localhost:3000/health
```

Should see security headers:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Content-Security-Policy: ...`

## Security Status

✅ **Authentication** - API keys required for write operations  
✅ **Rate Limiting** - Prevents DoS attacks  
✅ **Input Validation** - Prevents injection attacks  
✅ **Security Headers** - Protects against common attacks  
✅ **MongoDB Protection** - Prevents NoSQL injection  
✅ **Error Handling** - No sensitive info leaked  
✅ **CORS Hardening** - Only allows whitelisted origins  
✅ **Request Limits** - Prevents large payload attacks  

## Next Steps

1. ✅ Generate and set API keys
2. ✅ Test authentication
3. ✅ Review `SECURITY.md` for detailed information
4. ✅ Set up monitoring and alerts
5. ✅ Enable HTTPS in production
6. ✅ Regular security audits

---

**Your app is now secured!** 🔒

