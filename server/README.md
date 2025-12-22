# SneakLink Backend Server

## Setup Instructions

1. **Install Dependencies**
   ```bash
   cd server
   npm install
   ```

2. **Configure Environment Variables**
   
   Copy the template file and create your `.env` file:
   ```bash
   cp env.template .env
   ```
   
   Then edit `.env` and replace the MongoDB connection string with your credentials:
   ```env
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/sneaklink?retryWrites=true&w=majority
   PORT=3000
   FRONTEND_URL=http://localhost:8080
   ```
   
   **MongoDB Atlas Connection String Format:**
   - Replace `username` with your MongoDB Atlas database username
   - Replace `password` with your MongoDB Atlas database password
   - Replace `cluster` with your MongoDB Atlas cluster name (e.g., `cluster0.xxxxx`)
   - The database name `sneaklink` will be created automatically if it doesn't exist

3. **Start the Server**
   ```bash
   npm run dev
   ```

## API Endpoints

### GET `/api/stores`
Get all stores with optional filters
- Query params: `countries`, `themes`, `tags`, `dateFrom`, `dateTo`, `page`, `limit`

### POST `/api/stores/scrape`
Start a scraping job to discover new stores

### POST `/api/stores`
Add a store manually
- Body: `{ url: string, source?: string }`

### GET `/api/stores/:id`
Get a single store by ID

### PUT `/api/stores/:id`
Update a store

### DELETE `/api/stores/:id`
Delete a store

## Features

- ✅ Shopify store detection
- ✅ Password protection check
- ✅ Active store verification
- ✅ Product count detection
- ✅ Theme detection (free/paid)
- ✅ Business model detection (Dropshipping, POD)
- ✅ Facebook ads detection (heuristic)
- ✅ Multi-source scraping (Reddit, GitHub, Product Hunt, Indie Hackers, Medium, Search Engines, Common Crawl)

## Notes

- **ScrapingAPI.com** (Free Tier Available): Add `SCRAPING_API_KEY` to `.env` for enhanced scraping
  - Get your API key from https://www.scrapingapi.com/
  - Improves success rate for scraping Shopify stores
  - Used for search engine scraping and store validation
  
- **Common Crawl** (Free): Automatically integrated
  - Uses Common Crawl's free web crawl data to discover Shopify stores
  - Searches latest crawl indexes for .myshopify.com domains
  - No API key required - completely free
  - Finds stores from their massive web crawl database

- Some scraping functions require API keys or additional setup
- ScrapingAPI.com key recommended for search engine scraping
- All scrapers work without API keys but may have limited success rates
