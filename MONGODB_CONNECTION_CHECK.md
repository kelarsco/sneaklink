# MongoDB Connection Check

## Current MongoDB URI
Your MongoDB URI is configured in `server/.env`:
```
MONGODB_URI=mongodb+srv://sneak:%40Kelaroma12345@sneak1.wmnmygx.mongodb.net/sneaklink?retryWrites=true&w=majority&appName=sneak1
```

## How to Check MongoDB Connection

### 1. Check if Backend Server is Running
```bash
cd server
npm run dev
```

Look for these messages:
- ✅ `MongoDB Connected successfully!` - Connection is working
- ❌ `Error connecting to MongoDB` - Connection failed

### 2. Common MongoDB Connection Issues

#### Issue: Authentication Failed
**Symptoms:**
- Error: "authentication failed"
- Error: "bad auth"

**Solutions:**
- Verify username and password in MongoDB Atlas
- Make sure password is URL-encoded (special characters like `@` become `%40`)
- Check that database user exists and has correct permissions

#### Issue: IP Not Whitelisted
**Symptoms:**
- Error: "IP not whitelisted"
- Error: "network access denied"

**Solutions:**
1. Go to MongoDB Atlas → Network Access
2. Click "Add IP Address"
3. For development: Use `0.0.0.0/0` (allows all IPs)
4. For production: Add your specific IP address

#### Issue: Connection Timeout
**Symptoms:**
- Error: "connection timeout"
- Error: "ENOTFOUND"

**Solutions:**
- Check internet connection
- Verify cluster is running in MongoDB Atlas
- Check firewall settings
- Verify cluster hostname is correct

### 3. Test Connection Manually

You can test the connection using Node.js:

```bash
cd server
node -e "
const mongoose = require('mongoose');
require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB!');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Connection failed:', err.message);
    process.exit(1);
  });
"
```

### 4. Verify Environment Variables

Make sure your `server/.env` file has:
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/sneaklink?retryWrites=true&w=majority
PORT=3000
FRONTEND_URL=http://localhost:8080
```

### 5. Check MongoDB Atlas Dashboard

1. Log in to [MongoDB Atlas](https://cloud.mongodb.com/)
2. Check cluster status (should be "Running")
3. Verify database user exists
4. Check Network Access settings
5. Verify connection string format

## Frontend Error Handling

The frontend now handles MongoDB/backend connection errors gracefully:
- ✅ Won't crash if backend is down
- ✅ Shows login page even if auth check fails
- ✅ Handles network timeouts (5 second timeout)
- ✅ Clears invalid tokens automatically

## Next Steps

1. **Start Backend Server:**
   ```bash
   cd server
   npm run dev
   ```

2. **Check Connection:**
   - Look for "✅ MongoDB Connected successfully!" message
   - If you see errors, follow the troubleshooting steps above

3. **Test Frontend:**
   - Visit `http://localhost:8080/login`
   - Page should load even if backend is down
   - Google OAuth will work once backend is running

## Still Having Issues?

1. Check server console for MongoDB connection errors
2. Verify MongoDB Atlas cluster is running
3. Check IP whitelist in MongoDB Atlas
4. Verify username/password are correct
5. Make sure password special characters are URL-encoded
