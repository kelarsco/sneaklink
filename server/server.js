import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cron from 'node-cron';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectPostgres } from './config/postgres.js';
import storeRoutes from './routes/stores.js';
import authRoutes from './routes/auth.js';
import contactRoutes from './routes/contact.js';
import adminRoutes from './routes/admin.js';
import subscriptionRoutes from './routes/subscriptions.js';
import visitorRoutes from './routes/visitors.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { securityLogger, requestSizeLimiter, validateOrigin } from './middleware/security.js';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from server/.env
// Note: database.js also loads .env, but this ensures it's loaded before routes
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to PostgreSQL (primary database)
// Use async/await pattern for better error handling
(async () => {
  try {
    await connectPostgres();
    console.log('✅ PostgreSQL connected');
  } catch (error) {
    console.error('\n❌ PostgreSQL connection failed!');
    console.error('   Error:', error.message);
    console.error('   Check DATABASE_URL in server/.env and run: npm run postgres:test');
    console.error('\n⚠️  Server will start but features may be limited.');
  }
})();

// Security Middleware - Apply first
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://accounts.google.com"],
      scriptSrc: ["'self'", "https://accounts.google.com", "https://js.paystack.co"],
      imgSrc: ["'self'", "data:", "https:", "https://accounts.google.com"],
      connectSrc: ["'self'", "https://accounts.google.com", "https://oauth2.googleapis.com"],
      frameSrc: ["'self'", "https://accounts.google.com"],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow embedding if needed
  crossOriginOpenerPolicy: false, // Allow OAuth popups to communicate
  crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow Google resources
}));

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Request size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(requestSizeLimiter);

// Security logging
app.use(securityLogger);

// Origin validation
app.use(validateOrigin);

// CORS configuration - optimized for speed and mobile devices
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:8080',
  'http://127.0.0.1:8080',
  'http://localhost:5173', // Vite default port
  'http://localhost:3000',
  'http://127.0.0.1:3000',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      return callback(null, true);
    }
    
    // In production, be strict about origins
    if (process.env.NODE_ENV === 'production') {
      if (allowedOrigins.includes(origin) || allowedOrigins.some(allowed => origin.startsWith(allowed))) {
        callback(null, true);
      } else {
        console.warn(`⚠️  CORS blocked request from unauthorized origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    } else {
      // In development, allow all origins (including mobile devices on same network)
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'Accept', 'Origin', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'Content-Type'],
  maxAge: 86400, // Cache preflight requests for 24 hours
}));

// Global rate limiting (admin routes are skipped via skip function)
app.use(apiLimiter);

// Routes
app.use('/api/stores', storeRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/auth/admin', adminRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/visitors', visitorRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware - Don't leak sensitive information
app.use((err, req, res, next) => {
  // Log full error for debugging (server-side only)
  console.error('Error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.url,
    method: req.method,
    ip: req.ip,
  });
  
  // Don't expose internal errors to clients
  const statusCode = err.status || err.statusCode || 500;
  const message = process.env.NODE_ENV === 'development' 
    ? err.message 
    : 'Internal server error';
  
  res.status(statusCode).json({ 
    error: statusCode === 500 ? 'Internal server error' : err.message,
    ...(process.env.NODE_ENV === 'development' && { details: err.message })
  });
});

// Store Processing Pipeline removed

// Shopify Store Scraping Scheduler (every 20 minutes)
import { runShopifyStoreScraping } from './services/shopifyStoreScraper.js';

let isScraping = false;

// Schedule scraping job every 20 minutes
cron.schedule('*/20 * * * *', async () => {
  if (isScraping) {
    console.log('⏸️  Scraping job already running, skipping...');
    return;
  }

  isScraping = true;
  console.log('\n⏰ Scheduled scraping job triggered (20min interval)');
  
  try {
    await runShopifyStoreScraping();
  } catch (error) {
    console.error('❌ Error in scheduled scraping job:', error.message);
  } finally {
    isScraping = false;
  }
});

// Run initial scrape 30 seconds after server starts
setTimeout(async () => {
  if (!isScraping) {
    isScraping = true;
    console.log('\n🚀 Running initial Shopify store scraping job...');
    try {
      await runShopifyStoreScraping();
    } catch (error) {
      console.error('❌ Error in initial scraping job:', error.message);
    } finally {
      isScraping = false;
    }
  }
}, 30000); // 30 seconds delay

console.log('✅ Shopify Store Scraping Scheduler Enabled:');
console.log('   - Initial scrape: 30 seconds after startup');
console.log('   - Scheduled scraping: Every 20 minutes');
console.log('   - Focus: .myshopify.com domains only');
console.log('   - Sources: Reddit, Global Search, WHOISXML');

// Graceful shutdown handling
let isShuttingDown = false;

// Graceful shutdown handler
const gracefulShutdown = async (signal) => {
  if (isShuttingDown) {
    console.log('⚠️  Force shutdown requested...');
    process.exit(1);
  }
  
  isShuttingDown = true;
  console.log(`\n⚠️  ${signal} received. Starting graceful shutdown...`);
  
  console.log('✅ Proceeding with shutdown...');
  
  // Close server
  server.close(() => {
    console.log('✅ HTTP server closed');
    process.exit(0);
  });
  
  // Force shutdown after 10 seconds if server doesn't close
  setTimeout(() => {
    console.error('⚠️  Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on http://0.0.0.0:${PORT}`);
  console.log(`✅ API available at http://localhost:${PORT}/api`);
  console.log(`✅ Health check: http://localhost:${PORT}/health`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Please stop the other process or change the PORT in .env`);
    process.exit(1);
  } else {
    console.error('❌ Server failed to start:', err);
    process.exit(1);
  }
});
