# Deployment Guide

## Overview

When you deploy your project to hosting, the backend will continue to work, but you'll need to configure several things properly. This guide covers deployment for both frontend and backend.

## Backend Deployment

### 1. Environment Variables

Your hosting provider needs access to environment variables. Set these in your hosting dashboard:

**Required:**
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/sneaklink?retryWrites=true&w=majority
PORT=3000
FRONTEND_URL=https://your-frontend-domain.com
```

**Optional (for enhanced features):**
```env
SCRAPING_API_KEY=your_scraping_api_key
FACEBOOK_ACCESS_TOKEN=your_facebook_token
```

### 2. MongoDB Atlas Configuration

1. **IP Whitelist**: Add your hosting server's IP address to MongoDB Atlas IP whitelist
   - Or use `0.0.0.0/0` to allow all IPs (less secure, but easier for dynamic IPs)

2. **Database User**: Ensure your MongoDB user has read/write permissions

### 3. CORS Configuration

Update `server/server.js` to allow your frontend domain:

```javascript
app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://your-frontend-domain.com',
  credentials: true,
}));
```

### 4. Scraping Jobs

The automatic scraping will continue to work:
- ✅ Initial scrape runs 5 seconds after server starts
- ✅ Scheduled jobs run every 6 hours
- ✅ Quick updates every 30 minutes
- ✅ All scrapers continue to function

**Note**: Make sure your hosting provider allows:
- Long-running processes
- Cron jobs (or use external cron service)
- Outbound HTTP requests (for scraping)

## Hosting Options

### Option 1: VPS/Cloud Server (Recommended)

**Providers**: DigitalOcean, AWS EC2, Google Cloud, Azure, Linode

**Pros:**
- Full control
- Cron jobs work natively
- Can run both frontend and backend
- No restrictions on scraping

**Setup:**
```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Clone your repo
git clone your-repo-url
cd sneaklink

# Install dependencies
cd server && npm install
cd ../frontend && npm install

# Build frontend
npm run build

# Set environment variables
nano server/.env  # Edit with your values

# Start backend with PM2
cd server
pm2 start server.js --name sneaklink-backend
pm2 save
pm2 startup  # Follow instructions to enable auto-start

# Serve frontend (using PM2 or nginx)
pm2 serve ../dist 8080 --name sneaklink-frontend --spa
```

### Option 2: Platform as a Service (PaaS)

**Providers**: Heroku, Railway, Render, Fly.io, Vercel (frontend only)

#### Heroku

**Backend:**
```bash
# Install Heroku CLI
heroku login
heroku create sneaklink-backend

# Set environment variables
heroku config:set MONGODB_URI=your_mongodb_uri
heroku config:set FRONTEND_URL=https://your-frontend.com
heroku config:set SCRAPING_API_KEY=your_key
heroku config:set FACEBOOK_ACCESS_TOKEN=your_token

# Deploy
git push heroku main
```

**Frontend:**
- Deploy to Vercel, Netlify, or Cloudflare Pages
- Update `VITE_API_URL` in frontend `.env` to point to your backend

#### Railway

1. Connect your GitHub repo
2. Add environment variables in dashboard
3. Deploy automatically on push

#### Render

1. Create new Web Service
2. Connect GitHub repo
3. Set build command: `cd server && npm install`
4. Set start command: `node server.js`
5. Add environment variables

### Option 3: Serverless (Limited)

**Note**: Serverless functions have limitations:
- ❌ Cron jobs may not work (use external cron service)
- ❌ Long-running scraping jobs may timeout
- ✅ Good for API endpoints
- ✅ Auto-scaling

**Providers**: AWS Lambda, Vercel Functions, Cloudflare Workers

**For serverless, you'd need to:**
- Use external cron service (cron-job.org, EasyCron) to trigger scraping
- Split scraping into smaller chunks
- Use queue system (Redis, AWS SQS)

## Frontend Deployment

### 1. Update API URL

Create `.env.production` in frontend:
```env
VITE_API_URL=https://your-backend-domain.com/api
```

### 2. Build Frontend

```bash
cd frontend
npm run build
```

### 3. Deploy Options

**Static Hosting:**
- Vercel (recommended)
- Netlify
- Cloudflare Pages
- GitHub Pages

**Steps for Vercel:**
```bash
npm install -g vercel
vercel
# Follow prompts
```

## Configuration Checklist

### Backend Checklist

- [ ] MongoDB Atlas IP whitelist configured
- [ ] Environment variables set in hosting dashboard
- [ ] CORS allows frontend domain
- [ ] Port configured (or use hosting default)
- [ ] Process manager (PM2) installed (for VPS)
- [ ] Auto-restart on crash enabled
- [ ] Logs accessible

### Frontend Checklist

- [ ] `VITE_API_URL` points to backend
- [ ] Build completed successfully
- [ ] Static files served correctly
- [ ] Environment variables set

## Monitoring & Maintenance

### 1. Health Checks

Your backend has a health endpoint:
```
GET https://your-backend.com/health
```

Set up monitoring to ping this endpoint.

### 2. Logs

**PM2 (VPS):**
```bash
pm2 logs sneaklink-backend
pm2 monit
```

**Heroku:**
```bash
heroku logs --tail
```

**Railway/Render:**
- Check logs in dashboard

### 3. Database Monitoring

- Monitor MongoDB Atlas dashboard
- Set up alerts for connection issues
- Monitor storage usage

### 4. Scraping Status

Check scraping status:
```
GET https://your-backend.com/api/stores/scrape/status
```

## Troubleshooting Deployment

### Issue: Backend not connecting to MongoDB

**Solution:**
- Check IP whitelist in MongoDB Atlas
- Verify `MONGODB_URI` is correct
- Check MongoDB user permissions

### Issue: CORS errors

**Solution:**
- Update `FRONTEND_URL` in backend `.env`
- Verify CORS middleware allows your frontend domain

### Issue: Scraping not working

**Solution:**
- Check if hosting allows outbound HTTP requests
- Verify API keys are set correctly
- Check server logs for errors
- Ensure cron jobs are enabled (for VPS)

### Issue: Timeout errors

**Solution:**
- Increase timeout limits in hosting settings
- Break scraping into smaller batches
- Use queue system for long-running tasks

## Recommended Architecture

```
┌─────────────────┐
│   Frontend      │  (Vercel/Netlify)
│   (React/Vite)  │
└────────┬────────┘
         │ HTTPS
         │
┌────────▼────────┐
│   Backend API   │  (Railway/Render/Heroku)
│   (Express)     │
└────────┬────────┘
         │
┌────────▼────────┐
│  MongoDB Atlas  │  (Cloud Database)
│   (Database)    │
└─────────────────┘
```

## Cost Estimates

**Free Tier Options:**
- Railway: $5/month (after free trial)
- Render: Free tier available (with limitations)
- Vercel: Free tier for frontend
- MongoDB Atlas: Free tier (512MB)

**VPS Options:**
- DigitalOcean: $6/month (basic droplet)
- AWS EC2: Pay as you go
- Google Cloud: Free tier available

## Security Considerations

1. **Environment Variables**: Never commit `.env` files
2. **API Keys**: Rotate keys regularly
3. **CORS**: Only allow your frontend domain
4. **Rate Limiting**: Add rate limiting to API endpoints
5. **HTTPS**: Always use HTTPS in production
6. **MongoDB**: Use strong passwords, enable IP whitelist

## Next Steps

1. Choose your hosting provider
2. Set up MongoDB Atlas (if not done)
3. Configure environment variables
4. Deploy backend
5. Deploy frontend
6. Test all endpoints
7. Monitor logs and performance

## Support

If you encounter issues:
1. Check server logs
2. Verify environment variables
3. Test endpoints with curl/Postman
4. Check MongoDB Atlas connection
5. Review this deployment guide
