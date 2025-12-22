# Quick Start Guide

## Prerequisites
- Node.js 18+ installed
- MongoDB Atlas account (or local MongoDB)

## Setup Steps

### 1. Backend Setup

```bash
# Navigate to server directory
cd server

# Install dependencies
npm install

# Create .env file from template
cp env.template .env

# Edit .env and add your MongoDB connection string:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/sneaklink?retryWrites=true&w=majority
# PORT=3000
# FRONTEND_URL=http://localhost:8080

# Start the backend server
npm run dev
```

The backend will run on `http://localhost:3000`

### 2. Frontend Setup

```bash
# From the root directory
npm install

# Start the frontend (in a new terminal)
npm run dev
```

The frontend will run on `http://localhost:8080` (or the port shown in terminal)

### 3. Optional: Generate API Keys

For production use, generate secure API keys:

```bash
cd server
npm run generate-keys
```

This will generate `API_KEY` and `ADMIN_API_KEY` that you should add to your `.env` file.

## Verification

1. **Backend Health Check**: Visit `http://localhost:3000/health` - should return `{"status":"ok"}`
2. **Frontend**: Visit `http://localhost:8080` - should show the dashboard
3. **API Connection**: The frontend should show "API Connected" status

## Troubleshooting

### Backend won't start
- Check MongoDB connection string in `server/.env`
- Ensure MongoDB Atlas IP whitelist includes your IP (or `0.0.0.0/0` for development)
- Check if port 3000 is already in use

### Frontend won't connect to backend
- Ensure backend is running on port 3000
- Check `VITE_API_URL` in root `.env` (defaults to `http://localhost:3000/api`)
- Check CORS settings in `server/server.js`

### No stores showing
- Start a scraping job via the API: `POST http://localhost:3000/api/stores/scrape`
- Check backend logs for scraping progress
- Verify MongoDB connection is working

## Next Steps

- Configure optional API keys in `server/.env` for enhanced scraping (see `server/env.template`)
- Set up production environment variables
- Review security settings in `server/SECURITY.md`

