# SneakLink Setup Guide

## Prerequisites

- Node.js 18+ installed
- MongoDB Atlas account (free tier works)
- npm or yarn

## Backend Setup

1. **Navigate to server directory**
   ```bash
   cd server
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create `.env` file**
   
   Copy the template file:
   ```bash
   cd server
   cp env.template .env
   ```
   
   Then edit `.env` and update with your MongoDB Atlas credentials:
   ```env
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/sneaklink?retryWrites=true&w=majority
   PORT=3000
   FRONTEND_URL=http://localhost:8080
   ```
   
   **MongoDB Atlas Connection Details:**
   - `username`: Your MongoDB Atlas database username
   - `password`: Your MongoDB Atlas database password (URL-encode special characters)
   - `cluster`: Your cluster name (e.g., `cluster0.xxxxx.mongodb.net`)
   - The database `sneaklink` will be created automatically
   
   **Example:**
   ```env
   MONGODB_URI=mongodb+srv://myuser:mypassword123@cluster0.abc123.mongodb.net/sneaklink?retryWrites=true&w=majority
   ```

4. **Start the backend server**
   ```bash
   npm run dev
   ```
   
   The server will run on `http://localhost:3000`

## Frontend Setup

1. **Install dependencies** (from root directory)
   ```bash
   npm install
   ```

2. **Create `.env` file** (optional)
   Create a `.env` file in the root directory:
   ```env
   VITE_API_URL=http://localhost:3000/api
   ```
   
   This is optional as it defaults to `http://localhost:3000/api`

3. **Start the frontend**
   ```bash
   npm run dev
   ```
   
   The frontend will run on `http://localhost:8080`

## MongoDB Atlas Setup

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Create a database user
4. Whitelist your IP address (or use `0.0.0.0/0` for development)
5. Get your connection string and update the `.env` file

## Usage

1. Start both backend and frontend servers
2. Open `http://localhost:8080` in your browser
3. Click "Start Scraping" to begin discovering stores
4. Use filters to find stores by country, theme, tags, etc.

## API Endpoints

- `GET /api/stores` - Get stores with filters
- `POST /api/stores/scrape` - Start scraping job
- `POST /api/stores` - Add store manually
- `GET /api/stores/:id` - Get single store
- `PUT /api/stores/:id` - Update store
- `DELETE /api/stores/:id` - Delete store

## Features

✅ Real-time store discovery from multiple sources
✅ Shopify store detection and validation
✅ Theme detection (free/paid)
✅ Business model detection (Dropshipping, POD)
✅ Facebook ads detection
✅ Password protection check
✅ Active store verification
✅ Product count detection
✅ Full filter integration

## Notes

- Some scraping sources require API keys (see `server/utils/scrapers.js`)
- Facebook Ads Library requires Facebook Developer API access
- Search engine scraping requires API keys (SerpAPI, ScraperAPI, etc.)
- The system will work with Reddit scraping by default
