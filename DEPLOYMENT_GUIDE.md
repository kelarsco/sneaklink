# Deployment Guide - Continuous Scraping System

## ✅ Yes, Links Will Keep Generating Automatically!

Your scraping system is **fully automated** and will continue to generate/store links when deployed to production. Here's how it works:

## 🔄 Automatic Scraping Schedule

The system runs **automatically** with the following schedule:

1. **Initial Scrape**: Runs 5 seconds after server startup
2. **Continuous Scraping**: Every 30 minutes
3. **Deep Scraping**: Every 6 hours
4. **Daily Comprehensive**: Once per day at 2 AM (server time)

## 📋 Production Deployment Checklist

### 1. Environment Variables

Make sure these are set in your production environment:

```env
# Required
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/sneaklink?retryWrites=true&w=majority
PORT=3000
NODE_ENV=production
FRONTEND_URL=https://yourdomain.com

# Security (Required for production)
API_KEY=your_secure_api_key_here
ADMIN_API_KEY=your_secure_admin_key_here

# Optional but Recommended (for better scraping)
SCRAPING_API_KEY=your_scraping_api_key
TIKTOK_RAPIDAPI_KEY=your_tiktok_key
TIKTOK_RAPIDAPI_HOST=scraptik.p.rapidapi.com
GOOGLE_ADS_RAPIDAPI_KEY=your_google_ads_key
GOOGLE_ADS_RAPIDAPI_HOST=google-ads-library.p.rapidapi.com
```

### 2. Process Management

Use a process manager to keep the server running:

#### Option A: PM2 (Recommended)
```bash
# Install PM2 globally
npm install -g pm2

# Start with PM2
cd server
npm run pm2

# Or manually
pm2 start ecosystem.config.js

# Check status
pm2 status

# View logs
pm2 logs sneaklink-backend

# Auto-restart on reboot
pm2 startup
pm2 save
```

#### Option B: Docker
```bash
# Build and run
docker build -t sneaklink-backend .
docker run -d --name sneaklink-backend -p 3000:3000 --env-file .env sneaklink-backend
```

#### Option C: Systemd (Linux)
Create `/etc/systemd/system/sneaklink.service`:
```ini
[Unit]
Description=SneakLink Backend Server
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/sneaklink/server
Environment=NODE_ENV=production
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Then:
```bash
sudo systemctl enable sneaklink
sudo systemctl start sneaklink
```

### 3. MongoDB Connection

- ✅ Ensure MongoDB Atlas allows connections from your server IP
- ✅ Add your server's IP to MongoDB Atlas IP whitelist (or use `0.0.0.0/0` for all IPs)
- ✅ Verify connection string is correct

### 4. Server Requirements

- **Node.js**: v18+ recommended
- **Memory**: At least 512MB RAM (1GB+ recommended)
- **CPU**: 1+ cores
- **Storage**: Depends on database size
- **Network**: Stable internet connection

### 5. Monitoring

Monitor the scraping system:

```bash
# Check PM2 logs
pm2 logs sneaklink-backend

# Check server health
curl http://localhost:3000/health

# Check scraping status
curl http://localhost:3000/api/stores/scrape/status
```

### 6. Verify It's Working

After deployment, check:

1. **Server logs** should show:
   ```
   ✅ Connected to MongoDB
   ⏳ Waiting 5 seconds before starting initial CONTINUOUS scrape...
   🔄 CONTINUOUS Automatic Scraping System Enabled:
      - Initial scrape: 5 seconds after startup
      - Continuous scraping: Every 30 minutes
      - Deep scraping: Every 6 hours
      - Daily comprehensive: Once per day at 2 AM
   ```

2. **After 5 seconds**, you should see scraping activity:
   ```
   🔍 Processing store: https://...
   ✅ Confirmed Shopify store: https://...
   ```

3. **Every 30 minutes**, you'll see:
   ```
   ⏰ CONTINUOUS scraping job triggered (30min interval)
   ```

## 🚨 Important Notes

### Cron Jobs Work in Production
- ✅ `node-cron` works in production environments
- ✅ Scheduled jobs will run automatically
- ✅ No additional configuration needed

### Server Must Stay Running
- ⚠️ The server process must stay running 24/7
- ⚠️ If the server restarts, scraping resumes automatically
- ✅ Use PM2 or similar to auto-restart on crashes

### Timezone Considerations
- The "2 AM daily scrape" uses the **server's timezone**
- Make sure your server timezone is set correctly
- Or adjust the cron schedule in `server.js` if needed

### Rate Limiting
- The system includes built-in rate limiting
- Scraping is throttled to avoid overwhelming sources
- Delays between requests prevent IP bans

## 🔧 Troubleshooting

### Scraping Not Starting?

1. **Check MongoDB connection**:
   ```bash
   curl http://localhost:3000/health
   ```

2. **Check server logs**:
   ```bash
   pm2 logs sneaklink-backend
   # or
   tail -f server.log
   ```

3. **Verify cron is working**:
   - Check logs for "⏰ CONTINUOUS scraping job triggered"
   - Should appear every 30 minutes

### No Stores Being Found?

1. **Check API keys** (if using external APIs):
   - Verify API keys are set in environment
   - Check API key quotas/limits

2. **Check network connectivity**:
   - Server needs internet access
   - Firewall should allow outbound connections

3. **Check scraping sources**:
   - Some sources may require API keys
   - Free sources should work without keys

## 📊 Expected Performance

- **New stores per day**: Varies (depends on sources and API access)
- **Scraping frequency**: Every 30 minutes
- **Database growth**: Continuous as new stores are found
- **Deduplication**: Automatic (won't save duplicates)

## ✅ Summary

**YES, the system will automatically generate/store links when deployed!**

- ✅ Runs automatically on server startup
- ✅ Continues scraping every 30 minutes
- ✅ Works in production environments
- ✅ No manual intervention needed
- ✅ Auto-restarts if server crashes (with PM2/systemd)

Just make sure:
1. Server stays running 24/7
2. MongoDB connection is configured
3. Environment variables are set
4. Process manager (PM2) is used for reliability

The system is production-ready! 🚀

