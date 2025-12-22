/**
 * Security Middleware
 * General security headers and protections
 */

/**
 * Security logging middleware
 * Logs suspicious activity
 */
export const securityLogger = (req, res, next) => {
  // Log suspicious patterns
  const suspiciousPatterns = [
    /\.\./, // Path traversal
    /<script/i, // XSS attempts
    /union.*select/i, // SQL injection
    /\$where/i, // MongoDB injection
    /\$ne/i, // MongoDB injection
    /\$gt/i, // MongoDB injection
    /javascript:/i, // JavaScript protocol
  ];
  
  const requestString = JSON.stringify({
    url: req.url,
    method: req.method,
    body: req.body,
    query: req.query,
    params: req.params,
  }).toLowerCase();
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(requestString)) {
      console.warn(`⚠️  SECURITY WARNING: Suspicious pattern detected from ${req.ip}`);
      console.warn(`   Pattern: ${pattern}`);
      console.warn(`   Request: ${req.method} ${req.url}`);
      console.warn(`   IP: ${req.ip}`);
      console.warn(`   User-Agent: ${req.get('user-agent')}`);
      break;
    }
  }
  
  next();
};

/**
 * Request size limiter
 */
export const requestSizeLimiter = (req, res, next) => {
  const contentLength = parseInt(req.get('content-length') || '0');
  const maxSize = 10 * 1024 * 1024; // 10MB
  
  if (contentLength > maxSize) {
    return res.status(413).json({ 
      error: 'Payload too large',
      message: 'Request body exceeds maximum size of 10MB'
    });
  }
  
  next();
};

/**
 * IP whitelist middleware (optional)
 */
export const ipWhitelist = (allowedIPs = []) => {
  return (req, res, next) => {
    // Skip in development
    if (process.env.NODE_ENV === 'development' || allowedIPs.length === 0) {
      return next();
    }
    
    const clientIP = req.ip || req.connection.remoteAddress;
    
    if (!allowedIPs.includes(clientIP)) {
      console.warn(`⚠️  Blocked request from unauthorized IP: ${clientIP}`);
      return res.status(403).json({ 
        error: 'Forbidden',
        message: 'IP address not whitelisted'
      });
    }
    
    next();
  };
};

/**
 * Validate request origin
 */
export const validateOrigin = (req, res, next) => {
  // This is handled by CORS, but we can add additional checks here
  const origin = req.get('origin');
  const referer = req.get('referer');
  
  // Log requests without proper origin/referer (potential API abuse)
  if (req.method !== 'GET' && !origin && !referer) {
    console.warn(`⚠️  Request without origin/referer from ${req.ip}: ${req.method} ${req.url}`);
  }
  
  next();
};

