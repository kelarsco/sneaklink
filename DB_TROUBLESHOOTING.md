# MongoDB Connection Troubleshooting

## Quick Test

Run the connection test:
```bash
cd server
npm run test:db
```

## Common Issues & Solutions

### Issue 1: "MONGODB_URI is not set"

**Symptoms:**
- Error: "MONGODB_URI is not set in environment variables"

**Solution:**
1. Make sure you have a `.env` file in the `server/` directory
2. Check that the file contains:
   ```env
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/sneaklink?retryWrites=true&w=majority
   ```
3. Verify the file is named exactly `.env` (not `.env.txt` or `.env.example`)

### Issue 2: "Authentication failed"

**Symptoms:**
- Error: "authentication failed" or "bad auth"

**Solutions:**
1. **Check username and password:**
   - Verify they're correct in MongoDB Atlas
   - Password must be URL-encoded:
     - `@` becomes `%40`
     - `#` becomes `%23`
     - `$` becomes `%24`
     - `%` becomes `%25`
     - `&` becomes `%26`
     - `+` becomes `%2B`
     - `=` becomes `%3D`
     - `?` becomes `%3F`

2. **Example:**
   - Password: `@Kelaroma12345`
   - Encoded: `%40Kelaroma12345`
   - Full URI: `mongodb+srv://sneak:%40Kelaroma12345@cluster...`

3. **Reset database user:**
   - Go to MongoDB Atlas → Database Access
   - Edit user or create new user
   - Update password in `.env` file

### Issue 3: "IP not whitelisted"

**Symptoms:**
- Error: "IP address is not whitelisted" or "IP whitelist"

**Solutions:**
1. **Add your IP to MongoDB Atlas:**
   - Go to MongoDB Atlas → Network Access
   - Click "Add IP Address"
   - Click "Add Current IP Address" (or enter manually)
   - Click "Confirm"

2. **For development (less secure):**
   - Add `0.0.0.0/0` to allow all IPs
   - ⚠️ Only use this for development/testing

3. **For hosting:**
   - Add your hosting server's IP address
   - Or use `0.0.0.0/0` if IP is dynamic

### Issue 4: "Connection timeout"

**Symptoms:**
- Error: "Server selection timed out" or "connection timeout"

**Solutions:**
1. **Check internet connection**
2. **Check firewall:**
   - Ensure port 27017 is not blocked
   - MongoDB Atlas uses port 27017
3. **Check MongoDB Atlas status:**
   - Visit MongoDB Atlas dashboard
   - Verify cluster is running (not paused)
4. **Check cluster hostname:**
   - Verify the cluster name in connection string matches Atlas

### Issue 5: "ENOTFOUND" or DNS error

**Symptoms:**
- Error: "getaddrinfo ENOTFOUND" or "ENOTFOUND"

**Solutions:**
1. **Check cluster hostname:**
   - Format should be: `cluster0.xxxxx.mongodb.net`
   - Verify in MongoDB Atlas → Clusters → Connect
2. **Check internet/DNS:**
   - Try pinging the cluster hostname
   - Check if DNS is resolving correctly

### Issue 6: Connection string format

**Correct format:**
```
mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority
```

**Common mistakes:**
- ❌ Missing `mongodb+srv://` prefix
- ❌ Missing `@` before cluster name
- ❌ Wrong database name
- ❌ Missing query parameters
- ❌ Special characters not URL-encoded

## Step-by-Step Fix

1. **Verify .env file exists:**
   ```bash
   cd server
   ls -la .env
   ```

2. **Check .env content:**
   ```bash
   cat .env | grep MONGODB
   ```

3. **Test connection:**
   ```bash
   npm run test:db
   ```

4. **Check MongoDB Atlas:**
   - Login to MongoDB Atlas
   - Verify cluster is running
   - Check Network Access (IP whitelist)
   - Check Database Access (user exists)

5. **Get fresh connection string:**
   - MongoDB Atlas → Clusters → Connect
   - Choose "Connect your application"
   - Copy connection string
   - Replace `<password>` with your actual password (URL-encoded)
   - Update `.env` file

## Your Current Connection String

From your `.env` file:
```
mongodb+srv://sneak:%40Kelaroma12345@sneak1.wmnmygx.mongodb.net/sneaklink?retryWrites=true&w=majority&appName=sneak1
```

**Things to check:**
1. ✅ Username: `sneak`
2. ✅ Password: `%40Kelaroma12345` (URL-encoded `@Kelaroma12345`)
3. ✅ Cluster: `sneak1.wmnmygx.mongodb.net`
4. ✅ Database: `sneaklink`
5. ⚠️ **IP Whitelist** - Make sure your IP is added
6. ⚠️ **User exists** - Verify user `sneak` exists in Database Access

## Quick Fixes

### Fix 1: Test connection
```bash
cd server
npm run test:db
```

### Fix 2: Check IP whitelist
1. Go to: https://cloud.mongodb.com/
2. Network Access → Add IP Address
3. Add your current IP or `0.0.0.0/0` for development

### Fix 3: Verify user
1. Go to: https://cloud.mongodb.com/
2. Database Access
3. Verify user `sneak` exists
4. Check user has read/write permissions

### Fix 4: Get fresh connection string
1. MongoDB Atlas → Clusters → Connect
2. Connect your application
3. Copy string and update `.env`

## Still Not Working?

1. **Check server logs** - Look for specific error messages
2. **Run test script** - `npm run test:db` for detailed diagnostics
3. **Verify MongoDB Atlas** - Ensure cluster is not paused
4. **Check network** - Try from different network
5. **Contact support** - Share error message from logs
