# Security Guide for SneakLink

## Overview

This document outlines the security measures implemented to protect the SneakLink application from hackers, scammers, and unauthorized manipulation.

## Security Features Implemented

### 1. Authentication & Authorization ✅

**API Key Authentication:**
- All write operations (POST, PUT, DELETE) require API key authentication
- Admin operations (scraping triggers, deletions) require admin API key
- Read operations are public but can be restricted

**Setup:**
Add to your `.env` file:
```env
API_KEY=your_secure_api_key_here
ADMIN_API_KEY=your_secure_admin_key_here
```

**Usage:**
```bash
# Include API key in requests
curl -H "X-API-Key: your_secure_api_key_here" http://localhost:3000/api/stores

# Or use Authorization header
curl -H "Authorization: Bearer your_secure_api_key_here" http://localhost:3000/api/stores
```

### 2. Rate Limiting ✅

**Protection Levels:**
- **General API**: 100 requests per 15 minutes per IP
- **Write Operations**: 20 requests per 15 minutes per IP
- **Scraping Endpoints**: 5 requests per hour per IP
- **Store Addition**: 10 requests per 15 minutes per IP

**Benefits:**
- Prevents DoS (Denial of Service) attacks
- Prevents brute force attacks
- Prevents API abuse
- Protects server resources

### 3. Input Validation & Sanitization ✅

**Protections:**
- URL validation (only http/https allowed)
- MongoDB ObjectId validation
- String sanitization (removes dangerous characters)
- Array size limits (max 100 items)
- String length limits (max 2000 characters)
- Date format validation (YYYY-MM-DD)
- Pagination limits (page: 1-10000, limit: 1-1000)

**Prevents:**
- NoSQL injection attacks
- XSS (Cross-Site Scripting) attacks
- Path traversal attacks
- Buffer overflow attacks

### 4. Security Headers (Helmet) ✅

**Headers Set:**
- `X-Content-Type-Options: nosniff` - Prevents MIME type sniffing
- `X-Frame-Options: DENY` - Prevents clickjacking
- `X-XSS-Protection: 1; mode=block` - XSS protection
- `Strict-Transport-Security` - Forces HTTPS (in production)
- `Content-Security-Policy` - Restricts resource loading

### 5. MongoDB Injection Prevention ✅

**Protections:**
- All user input is sanitized before database queries
- Query operators are restricted
- Field names are validated
- Array inputs are limited and sanitized
- No direct user input in query construction

**Example:**
```javascript
// ❌ UNSAFE (vulnerable to injection)
const filter = JSON.parse(req.query.filter);

// ✅ SAFE (validated and sanitized)
const sanitizedCountries = countryArray
  .filter(c => typeof c === 'string' && c.length > 0 && c.length < 100)
  .slice(0, 100);
filter.country = { $in: sanitizedCountries };
```

### 6. CORS Hardening ✅

**Production:**
- Only allows requests from whitelisted origins
- Rejects requests without proper origin
- Logs unauthorized origin attempts

**Development:**
- More permissive for local development
- Still logs suspicious activity

### 7. Request Size Limits ✅

- Maximum request body: 10MB
- Prevents large payload attacks
- Protects server memory

### 8. Security Logging ✅

**Monitored Patterns:**
- Path traversal attempts (`../`)
- XSS attempts (`<script>`, `javascript:`)
- SQL/NoSQL injection attempts (`$where`, `$ne`, `union select`)
- Suspicious request patterns

**Logs Include:**
- IP address
- User-Agent
- Request method and URL
- Timestamp

### 9. Error Handling ✅

**Production:**
- Generic error messages (no sensitive info leaked)
- Full errors logged server-side only
- Stack traces hidden from clients

**Development:**
- More detailed errors for debugging

### 10. Field-Level Protection ✅

**Update Restrictions:**
- Critical fields like `isShopify` cannot be modified
- Only allowed fields can be updated
- Prevents data tampering

## Security Best Practices

### Environment Variables

**Critical:**
```env
# Required for security
API_KEY=generate_strong_random_key_here
ADMIN_API_KEY=generate_different_strong_key_here

# Database
MONGODB_URI=your_secure_connection_string

# Production settings
NODE_ENV=production
```

**Generate Strong Keys:**
```bash
# Generate secure random keys
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### MongoDB Security

1. **Use Strong Passwords:**
   - Minimum 16 characters
   - Mix of letters, numbers, symbols
   - URL-encode special characters in connection string

2. **IP Whitelisting:**
   - Whitelist only necessary IPs in MongoDB Atlas
   - Use `0.0.0.0/0` only for development

3. **Database User Permissions:**
   - Use read/write user (not admin)
   - Limit to specific database

### API Key Management

1. **Never Commit Keys:**
   - Add `.env` to `.gitignore`
   - Use environment variables
   - Rotate keys regularly

2. **Key Storage:**
   - Use secret management services in production
   - Never log API keys
   - Use different keys for different environments

### Network Security

1. **HTTPS:**
   - Always use HTTPS in production
   - Use reverse proxy (nginx, Cloudflare) for SSL/TLS

2. **Firewall:**
   - Only expose necessary ports
   - Use VPN for admin access

3. **DDoS Protection:**
   - Use Cloudflare or similar service
   - Rate limiting (already implemented)
   - Monitor traffic patterns

## Endpoint Security Matrix

| Endpoint | Method | Auth Required | Rate Limit | Notes |
|----------|--------|---------------|------------|-------|
| `/api/stores` | GET | No | 100/15min | Public read |
| `/api/stores/:id` | GET | No | 100/15min | Public read |
| `/api/stores/scrape/status` | GET | Optional | 100/15min | Public read |
| `/api/stores/scrape` | POST | Admin | 5/hour | Admin only |
| `/api/stores` | POST | Yes | 10/15min | API key required |
| `/api/stores/:id` | PUT | Yes | 20/15min | API key required |
| `/api/stores/:id` | DELETE | Admin | 20/15min | Admin only |

## Monitoring & Alerts

### What to Monitor

1. **Failed Authentication Attempts:**
   - Multiple failed API key attempts
   - Unauthorized access attempts

2. **Rate Limit Violations:**
   - IPs hitting rate limits frequently
   - Unusual traffic patterns

3. **Suspicious Patterns:**
   - Injection attempts
   - XSS attempts
   - Path traversal attempts

4. **Error Rates:**
   - Sudden spike in 500 errors
   - Database connection issues

### Recommended Tools

- **Logging:** Winston, Pino, or similar
- **Monitoring:** PM2, New Relic, Datadog
- **Alerts:** Email, Slack, PagerDuty

## Additional Security Recommendations

### 1. Use HTTPS in Production
```javascript
// Use reverse proxy (nginx) or enable HTTPS
// Never expose HTTP in production
```

### 2. Regular Security Updates
```bash
# Keep dependencies updated
npm audit
npm audit fix
```

### 3. Database Backups
- Regular automated backups
- Test restore procedures
- Encrypt backups

### 4. Access Control
- Limit who has API keys
- Rotate keys regularly
- Use different keys for different environments

### 5. Code Review
- Review all changes before deployment
- Use version control
- Implement CI/CD with security checks

### 6. Dependency Scanning
```bash
# Check for vulnerable dependencies
npm audit

# Fix automatically
npm audit fix
```

## Quick Security Checklist

- [ ] API keys set in `.env`
- [ ] Strong MongoDB password
- [ ] MongoDB IP whitelisting configured
- [ ] HTTPS enabled in production
- [ ] Rate limiting working
- [ ] Security headers enabled
- [ ] Error messages don't leak info
- [ ] Input validation on all endpoints
- [ ] Regular dependency updates
- [ ] Monitoring and logging enabled

## Reporting Security Issues

If you discover a security vulnerability:

1. **DO NOT** create a public issue
2. Email security concerns privately
3. Provide detailed information
4. Allow time for fix before disclosure

## Security Updates

This security implementation will be updated as new threats emerge. Regularly review and update your security measures.

---

**Last Updated:** 2025-01-12
**Version:** 1.0

