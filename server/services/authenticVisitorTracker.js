/**
 * Authentic Visitor Tracking Service
 * Implements multi-layer validation to count only genuine human visitors
 * 
 * Validation Layers:
 * 1. Bot/Spam Filtering
 * 2. Visitor Identity & Uniqueness
 * 3. Behavior Validation
 * 4. Session Management
 */

import crypto from 'crypto';
import { getPrisma } from '../config/postgres.js';

// Known bot user agents
const BOT_PATTERNS = [
  /bot/i, /crawler/i, /spider/i, /scraper/i, /curl/i, /wget/i,
  /python/i, /java/i, /php/i, /ruby/i, /perl/i, /go-http/i,
  /googlebot/i, /bingbot/i, /slurp/i, /duckduckbot/i, /baiduspider/i,
  /yandexbot/i, /sogou/i, /exabot/i, /facebot/i, /ia_archiver/i,
  /siteauditbot/i, /semrushbot/i, /ahrefsbot/i, /mj12bot/i,
  /dotbot/i, /megaindex/i, /blexbot/i, /petalbot/i,
  /headless/i, /phantom/i, /selenium/i, /webdriver/i, /puppeteer/i,
  /playwright/i, /chromium/i, /chrome-lighthouse/i,
];

// Known data center IP ranges (simplified - in production, use a proper IP database)
const DATA_CENTER_RANGES = [
  /^54\./, // AWS
  /^52\./, // AWS
  /^3\./, // AWS
  /^13\./, // Google Cloud
  /^35\./, // Google Cloud
  /^104\./, // Google Cloud
  /^23\./, // Akamai
  /^104\.236\./, // DigitalOcean
  /^159\.89\./, // DigitalOcean
  /^178\.62\./, // DigitalOcean
];

// Known spam referrer domains
const SPAM_REFERRERS = [
  'semalt.com', 'buttons-for-website.com', 'ilovevitaly.com',
  'priceg.com', 'blackhatworth.com', '7makemoneyonline.com',
  'best-seo-offer.com', 'googlsucks.com', 'humanorightswatch.org',
  'simple-share-buttons.com', 'social-buttons.com', 'socialseet.ru',
  'videos-for-your-business.com', 'webmaster-traffic.com',
];

// Internal/localhost patterns
const INTERNAL_PATTERNS = [
  /^localhost/i,
  /^127\./,
  /^192\.168\./,
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^::1$/,
  /^fe80:/,
];

/**
 * Generate anonymous visitor fingerprint
 * GDPR compliant - no PII, only technical attributes
 */
export const generateVisitorFingerprint = (req) => {
  const userAgent = req.headers['user-agent'] || '';
  const acceptLanguage = req.headers['accept-language'] || '';
  const acceptEncoding = req.headers['accept-encoding'] || '';
  const ip = req.ip || req.connection.remoteAddress || '';
  
  // Hash IP for privacy (first 3 octets only)
  const ipParts = ip.split('.');
  const ipHash = ipParts.length === 4 
    ? `${ipParts[0]}.${ipParts[1]}.${ipParts[2]}.x`
    : 'unknown';
  
  // Create fingerprint from non-PII attributes
  const fingerprintData = [
    userAgent,
    acceptLanguage,
    acceptEncoding,
    ipHash,
    req.headers['accept'] || '',
    req.headers['dnt'] || '',
  ].join('|');
  
  return crypto.createHash('sha256').update(fingerprintData).digest('hex');
};

/**
 * Hash IP address for privacy
 */
export const hashIP = (ip) => {
  if (!ip) return null;
  return crypto.createHash('sha256').update(ip).digest('hex').substring(0, 32);
};

/**
 * Layer 1: Bot/Spam Filtering
 */
export const detectBot = (req) => {
  const userAgent = req.headers['user-agent'] || '';
  const referrer = req.headers['referer'] || req.headers['referrer'] || '';
  const ip = req.ip || req.connection.remoteAddress || '';
  
  // Check user agent for bot patterns
  const isBotUA = BOT_PATTERNS.some(pattern => pattern.test(userAgent));
  
  // Check for missing or suspicious user agent
  if (!userAgent || userAgent.length < 10) {
    return { isBot: true, reason: 'missing_or_suspicious_ua' };
  }
  
  // Check for spam referrer
  const isSpamReferrer = SPAM_REFERRERS.some(domain => 
    referrer.toLowerCase().includes(domain)
  );
  
  // Check for data center IP
  const isDataCenter = DATA_CENTER_RANGES.some(range => range.test(ip));
  
  // Check for internal/localhost
  const isInternal = INTERNAL_PATTERNS.some(pattern => pattern.test(ip));
  
  return {
    isBot: isBotUA,
    isSpam: isSpamReferrer,
    isDataCenter: isDataCenter,
    isInternal: isInternal,
    reason: isBotUA ? 'bot_user_agent' : 
            isSpamReferrer ? 'spam_referrer' :
            isDataCenter ? 'data_center_ip' :
            isInternal ? 'internal_ip' : null,
  };
};

/**
 * Layer 2: Visitor Identity & Uniqueness
 * Check if visitor was seen in last 12 hours
 */
export const checkVisitorUniqueness = async (visitorFingerprint) => {
  try {
    const prisma = getPrisma();
    const twelveHoursAgo = new Date();
    twelveHoursAgo.setHours(twelveHoursAgo.getHours() - 12);
    
    const existingVisitor = await prisma.authenticVisitor.findUnique({
      where: { visitorFingerprint },
    });
    
    if (existingVisitor) {
      // Check if last seen within 12 hours
      if (existingVisitor.lastSeen > twelveHoursAgo) {
        return {
          isNew: false,
          visitor: existingVisitor,
        };
      }
    }
    
    return { isNew: true, visitor: existingVisitor || null };
  } catch (error) {
    console.error('Error checking visitor uniqueness:', error);
    return { isNew: true, visitor: null };
  }
};

/**
 * Layer 3: Behavior Validation
 * Requires minimum interaction (handled on frontend)
 */
export const validateBehavior = (req) => {
  // Frontend will send interaction data
  // For now, we accept if no bot/spam detected
  const botCheck = detectBot(req);
  
  if (botCheck.isBot || botCheck.isSpam || botCheck.isDataCenter || botCheck.isInternal) {
    return { isValid: false, reason: botCheck.reason };
  }
  
  return { isValid: true };
};

/**
 * Track authentic visitor
 * Main entry point for visitor tracking
 */
export const trackAuthenticVisitor = async (req, interactionData = {}) => {
  try {
    const prisma = getPrisma();
    
    // Layer 1: Bot/Spam Detection
    const botCheck = detectBot(req);
    if (botCheck.isBot || botCheck.isSpam || botCheck.isDataCenter || botCheck.isInternal) {
      return {
        tracked: false,
        reason: botCheck.reason,
        isBot: botCheck.isBot,
        isSpam: botCheck.isSpam,
      };
    }
    
    // Layer 2: Visitor Fingerprinting
    const visitorFingerprint = generateVisitorFingerprint(req);
    const ipHash = hashIP(req.ip || req.connection.remoteAddress);
    
    // Check uniqueness (12-hour window)
    const uniquenessCheck = await checkVisitorUniqueness(visitorFingerprint);
    
    // Layer 3: Behavior Validation
    // Require minimum interaction (scroll, mouse movement, or click)
    const hasInteraction = interactionData.hasScroll || 
                           interactionData.hasMouseMove || 
                           interactionData.hasClick ||
                           interactionData.hasInteraction;
    
    if (!hasInteraction && !uniquenessCheck.visitor) {
      // New visitor without interaction - don't count yet
      return {
        tracked: false,
        reason: 'no_interaction',
        visitorFingerprint,
      };
    }
    
    // Layer 4: Session Management
    // Reuse existing session if visitor was seen within 12 hours
    // Otherwise, create new session (new visit after 12 hours = new session)
    let sessionId;
    let isNewSession = false;
    
    if (uniquenessCheck.visitor && uniquenessCheck.visitor.sessionId) {
      // Visitor exists and was seen within 12 hours - reuse session
      sessionId = uniquenessCheck.visitor.sessionId;
    } else {
      // New visitor OR returning after 12 hours - create new session
      sessionId = crypto.randomBytes(16).toString('hex');
      isNewSession = true;
    }
    
    // Time-based debouncing: Ignore rapid successive requests (< 2 seconds)
    if (uniquenessCheck.visitor && !isNewSession) {
      const timeSinceLastSeen = Date.now() - new Date(uniquenessCheck.visitor.lastSeen).getTime();
      if (timeSinceLastSeen < 2000) {
        // Update last seen but don't count as new session
        await prisma.authenticVisitor.update({
          where: { visitorFingerprint },
          data: { lastSeen: new Date() },
        });
        return {
          tracked: false,
          reason: 'debounce',
          isExisting: true,
        };
      }
    }
    
    // Extract metadata
    const userAgent = req.headers['user-agent'] || '';
    const referrer = req.headers['referer'] || req.headers['referrer'] || '';
    const language = req.headers['accept-language']?.split(',')[0] || '';
    const timezone = interactionData.timezone || '';
    const screenResolution = interactionData.screenResolution || '';
    
    // Create or update visitor
    if (uniquenessCheck.isNew || !uniquenessCheck.visitor) {
      // New authentic visitor (or returning after 12 hours with new session)
      await prisma.authenticVisitor.create({
        data: {
          visitorFingerprint,
          ipHash,
          userAgent: userAgent.substring(0, 500),
          referrer: referrer.substring(0, 500),
          language: language.substring(0, 10),
          timezone: timezone.substring(0, 50),
          screenResolution: screenResolution.substring(0, 20),
          isBot: false,
          isSpam: false,
          isDataCenter: false,
          hasInteraction: hasInteraction || false,
          isValidated: true,
          sessionId,
          lastSeen: new Date(),
        },
      });
      
      return {
        tracked: true,
        isNew: true,
        isNewSession: isNewSession,
        sessionId,
        visitorFingerprint,
      };
    } else {
      // Update existing visitor (same session)
      await prisma.authenticVisitor.update({
        where: { visitorFingerprint },
        data: {
          lastSeen: new Date(),
          hasInteraction: hasInteraction || uniquenessCheck.visitor.hasInteraction,
          isValidated: true,
          // Update sessionId if it's a new session (returning after 12 hours)
          ...(isNewSession && { sessionId }),
        },
      });
      
      return {
        tracked: isNewSession, // Count as new if it's a new session
        isNew: false,
        isNewSession: isNewSession,
        isExisting: true,
        sessionId,
      };
    }
  } catch (error) {
    console.error('Error tracking authentic visitor:', error);
    return {
      tracked: false,
      reason: 'error',
      error: error.message,
    };
  }
};

/**
 * Get count of authentic visitors (for analytics)
 * Returns count of unique validated sessions
 */
export const getAuthenticVisitorCount = async (dateFrom, dateTo) => {
  try {
    const prisma = getPrisma();
    
    const where = {
      isValidated: true,
      isBot: false,
      isSpam: false,
      isDataCenter: false,
      sessionId: { not: null }, // Only count sessions with valid sessionId
    };
    
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom + 'T00:00:00.000Z');
      }
      if (dateTo) {
        where.createdAt.lte = new Date(dateTo + 'T23:59:59.999Z');
      }
    }
    
    // Count unique sessions using groupBy for accurate count
    const sessionGroups = await prisma.authenticVisitor.groupBy({
      by: ['sessionId'],
      where,
      _count: {
        id: true,
      },
    });
    
    // Return count of unique sessions
    return sessionGroups.length;
  } catch (error) {
    console.error('Error getting authentic visitor count:', error);
    // If table doesn't exist yet (migration not run), return 0
    if (error.message?.includes('does not exist') || error.message?.includes('Unknown model')) {
      return 0;
    }
    return 0;
  }
};

