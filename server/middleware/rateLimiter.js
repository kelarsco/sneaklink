import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';

/**
 * Rate Limiting Middleware
 * Prevents DoS attacks and abuse
 */

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per windowMs (increased from 100)
  message: {
    error: 'Too many requests',
    message: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req) => {
    // Skip rate limiting for health checks
    if (req.path === '/health' || req.originalUrl === '/health') return true;
    
    // Skip rate limiting for admin routes - they're internal and need higher limits
    // Check both originalUrl (full path) and path (relative path after route mounting)
    const originalUrl = req.originalUrl || '';
    const path = req.path || '';
    const baseUrl = req.baseUrl || '';
    
    // Check if this is an admin route
    if (originalUrl.includes('/api/auth/admin') || 
        originalUrl.includes('/auth/admin') ||
        path.includes('/admin') ||
        baseUrl.includes('/admin')) {
      return true;
    }
    
    return false;
  },
  // Use keyGenerator to track rate limits per user (for authenticated users) or per IP (for anonymous)
  keyGenerator: (req) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) {
      try {
        // Decode JWT token to get user ID (decode without verification is safe here - we're just using it as a key)
        const decoded = jwt.decode(token);
        if (decoded && decoded.userId) {
          // Use user ID for authenticated users - each user gets their own 200 request limit
          return `user:${decoded.userId}`;
        }
      } catch (error) {
        // If token decode fails, fall back to IP
        // Token decode rarely fails, but if it does, use IP as fallback
      }
    }
    // For anonymous users, use IP address
    return `ip:${req.ip}`;
  },
});

// Strict rate limiter for write operations (POST, PUT, DELETE)
export const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 write requests per windowMs
  message: {
    error: 'Too many write requests',
    message: 'Too many write operations from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Scraping endpoint rate limiter (very strict)
export const scrapingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 scraping requests per hour
  message: {
    error: 'Scraping rate limit exceeded',
    message: 'Too many scraping requests. Please wait before triggering another scrape.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Store addition rate limiter
export const storeAdditionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 store additions per 15 minutes
  message: {
    error: 'Store addition rate limit exceeded',
    message: 'Too many store additions from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

