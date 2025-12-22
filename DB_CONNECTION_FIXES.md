# Database Connection Issues - Fixes Applied

## Issues Found and Fixed

### 1. **Environment Variable Loading**
**Problem:** `.env` file might not be loading correctly from the right directory.

**Fix:**
- Updated `database.js` to explicitly load from `server/.env` with proper path resolution
- Added fallback to root `.env` if server/.env doesn't exist
- Improved path resolution for ES modules

### 2. **Double Connection Attempts**
**Problem:** Code could attempt to connect multiple times, causing conflicts.

**Fix:**
- Added check for existing connection before attempting new connection
- Prevents `mongoose.connect()` if already connected (readyState === 1)

### 3. **Reconnection Logic Issues**
**Problem:** 
- Multiple reconnection timers could be created
- Reconnection could be attempted while already connecting
- No flag to prevent simultaneous reconnection attempts

**Fix:**
- Added `isReconnecting` flag to prevent multiple simultaneous attempts
- Improved connection state checking before reconnection
- Better cleanup of timers

### 4. **Error Handling Improvements**
**Problem:** Error messages weren't specific enough for troubleshooting.

**Fix:**
- Added more specific error detection (authentication, DNS, IP whitelist, timeout)
- Better error messages with actionable troubleshooting steps
- Added connection state logging

### 5. **Missing Connection Event Handlers**
**Problem:** Not all connection events were being handled.

**Fix:**
- Added `connected` event handler
- Improved logging for all connection states
- Better visibility into connection lifecycle

## How to Test the Connection

### Option 1: Use the Test Script
```bash
cd server
node scripts/test-db-connection.js
```

This will:
- Check if MONGODB_URI is set
- Validate the connection string format
- Attempt to connect
- Test a simple query
- Provide specific troubleshooting if it fails

### Option 2: Check Server Logs
When you start the server, look for:
- ✅ `MongoDB Connected successfully!` - Connection is working
- ❌ Error messages with specific troubleshooting steps

## Common Issues and Solutions

### Issue: "MONGODB_URI is not set"
**Solution:**
1. Create `server/.env` file
2. Add: `MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/sneaklink?retryWrites=true&w=majority`
3. Replace username, password, and cluster with your actual values

### Issue: "Authentication failed"
**Solution:**
1. Check username and password in connection string
2. URL-encode special characters in password (e.g., `@` becomes `%40`)
3. Verify user exists in MongoDB Atlas
4. Check user permissions

### Issue: "IP whitelist error"
**Solution:**
1. Go to MongoDB Atlas → Network Access
2. Add your current IP address
3. Or use `0.0.0.0/0` for development (not recommended for production)
4. Wait a few minutes for changes to propagate

### Issue: "Connection timeout"
**Solution:**
1. Check if cluster is paused (free tier pauses after inactivity)
2. Resume cluster in MongoDB Atlas dashboard
3. Check firewall settings
4. Verify internet connection
5. Check if VPN is blocking connection

### Issue: "ENOTFOUND" or DNS error
**Solution:**
1. Verify cluster hostname is correct
2. Check internet connection
3. Try pinging the cluster hostname
4. Verify DNS resolution is working

## Verification Steps

1. **Check .env file exists:**
   ```bash
   ls server/.env
   ```

2. **Verify MONGODB_URI format:**
   - Should start with `mongodb://` or `mongodb+srv://`
   - Should include username, password, cluster, and database name

3. **Test connection:**
   ```bash
   cd server
   node scripts/test-db-connection.js
   ```

4. **Check server logs:**
   - Look for connection success message
   - Check for any error messages

## Additional Improvements

- Better path resolution for ES modules
- Improved error messages with specific troubleshooting
- Connection state checking before operations
- Prevention of multiple simultaneous connection attempts
- Better logging for debugging

## Next Steps

If connection still fails after these fixes:

1. Run the test script: `node server/scripts/test-db-connection.js`
2. Check the specific error message
3. Follow the troubleshooting steps provided
4. Verify MongoDB Atlas cluster is running (not paused)
5. Test connection string in MongoDB Compass
