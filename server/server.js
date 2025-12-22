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
import { runContinuousScrapingJob, getContinuousScrapingStatus } from './services/continuousScrapingService.js';
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
    
    // Start initial CONTINUOUS scraping job after database connection
    console.log('⏳ Waiting 5 seconds before starting initial CONTINUOUS scrape...');
    setTimeout(() => {
      runContinuousScrapingJob(`initial-${Date.now()}`).catch(err => {
        console.error('Error in initial continuous scraping job:', err);
      });
    }, 5000);
  } catch (error) {
    console.error('\n❌ PostgreSQL connection failed!');
    console.error('   PostgreSQL is required for the application to work.');
    console.error('   Please check your DATABASE_URL in .env file.');
    console.error('   Run: npm run postgres:test');
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

// Set up CONTINUOUS automatic scraping schedule
// Uses the enhanced continuous scraping service for massive scale
// Format: minute hour day month day-of-week

// Main continuous scraping job - runs every 5 minutes for maximum throughput
// Monitor suspended user tickets every minute
cron.schedule('* * * * *', async () => {
  try {
    const { monitorSuspendedUserTickets } = await import('./services/suspendedUserAutomation.js');
    await monitorSuspendedUserTickets();
  } catch (err) {
    console.error('[Server] Error monitoring suspended user tickets:', err);
  }
});

cron.schedule('*/5 * * * *', () => {
  console.log('\n⏰ CONTINUOUS scraping job triggered (5min interval)');
  runContinuousScrapingJob().catch(err => {
    console.error('Error in continuous scraping job:', err);
  });
});

// Deep scraping job - runs every 6 hours for comprehensive coverage
cron.schedule('0 */6 * * *', () => {
  console.log('\n⏰ DEEP scraping job triggered (6 hour interval)');
  runContinuousScrapingJob(`deep-${Date.now()}`).catch(err => {
    console.error('Error in deep scraping job:', err);
  });
});

// Daily comprehensive scrape - runs once per day at 2 AM
cron.schedule('0 2 * * *', () => {
  console.log('\n⏰ DAILY comprehensive scraping job triggered');
  runContinuousScrapingJob(`daily-${Date.now()}`).catch(err => {
    console.error('Error in daily scraping job:', err);
  });
});

// Graceful shutdown handling - prevents interrupting scraping jobs
let isShuttingDown = false;

// Graceful shutdown handler
const gracefulShutdown = async (signal) => {
  if (isShuttingDown) {
    console.log('⚠️  Force shutdown requested...');
    process.exit(1);
  }
  
  isShuttingDown = true;
  console.log(`\n⚠️  ${signal} received. Starting graceful shutdown...`);
  
  // Check if scraping is in progress
  const scrapingStatus = getContinuousScrapingStatus();
  if (scrapingStatus.isScraping) {
    console.log(`⏳ Waiting for active scraping job to complete...`);
    console.log(`   Current job ID: ${scrapingStatus.currentJobId || 'N/A'}`);
    console.log(`   Stores scraped so far: ${scrapingStatus.totalStoresScraped || 0}`);
    console.log(`   Stores saved so far: ${scrapingStatus.totalStoresSaved || 0}`);
    
    // Wait up to 5 minutes for scraping to complete
    const maxWaitTime = 5 * 60 * 1000; // 5 minutes
    const startTime = Date.now();
    const checkInterval = 2000; // Check every 2 seconds
    
    while (Date.now() - startTime < maxWaitTime) {
      const status = getContinuousScrapingStatus();
      if (!status.isScraping) {
        console.log('✅ Scraping job completed. Proceeding with shutdown...');
        break;
      }
      
      // Show progress every 10 seconds
      if ((Date.now() - startTime) % 10000 < checkInterval) {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        console.log(`   Still waiting... (${elapsed}s elapsed, max 5min)`);
      }
      
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }
    
    const finalStatus = getContinuousScrapingStatus();
    if (finalStatus.isScraping) {
      console.log('⚠️  Scraping job still running after wait period. Proceeding with shutdown...');
      console.log('   Note: The scraping job will be interrupted. Progress may be lost.');
    }
  } else {
    console.log('✅ No active scraping jobs. Proceeding with shutdown...');
  }
  
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
  console.log('🔄 MASSIVE AUTOMATIC SCRAPING SYSTEM ENABLED:');
  console.log('   - Initial scrape: 5 seconds after startup');
  console.log('   - Continuous scraping: Every 5 minutes (MAXIMUM THROUGHPUT)');
  console.log('   - Deep scraping: Every 6 hours');
  console.log('   - Daily comprehensive: Once per day at 2 AM');
  console.log('   - All sources enabled: Reddit, Marketplace, Search Engines, Social Media,');
  console.log('     Common Crawl, Free APIs, Certificate Transparency, Fingerprints, CDN,');
  console.log('     Google Index, TikTok, Instagram, Pinterest, Google Ads');
  console.log('   - System will run continuously and automatically');
  console.log('   - Expected: Thousands to millions of stores per day');
  console.log('   - Graceful shutdown enabled: Scraping jobs will complete before restart');
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Please stop the other process or change the PORT in .env`);
    process.exit(1);
  } else {
    console.error('❌ Server failed to start:', err);
    process.exit(1);
  }
});
