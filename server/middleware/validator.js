/**
 * Input Validation and Sanitization Middleware
 * Prevents injection attacks and validates input
 */

/**
 * Validate and sanitize UUID (PostgreSQL primary key)
 */
export const validateObjectId = (req, res, next) => {
  if (req.params.id) {
    const id = req.params.id.trim();
    
    // Check if it's a valid UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ 
        error: 'Invalid ID format',
        message: 'ID must be a valid UUID'
      });
    }
    
    req.params.id = id;
  }
  
  next();
};

/**
 * Validate URL format
 */
export const validateUrl = (url) => {
  if (!url || typeof url !== 'string') {
    return false;
  }
  
  try {
    const urlObj = new URL(url);
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return false;
    }
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Sanitize string input (remove dangerous characters)
 */
export const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  
  return str
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .substring(0, 2000); // Limit length
};

/**
 * Sanitize array input
 */
export const sanitizeArray = (arr) => {
  if (!Array.isArray(arr)) {
    return [];
  }
  
  return arr
    .filter(item => typeof item === 'string')
    .map(item => sanitizeString(item))
    .filter(item => item.length > 0)
    .slice(0, 100); // Limit array size
};

/**
 * Validate date format (YYYY-MM-DD)
 */
export const validateDate = (dateString) => {
  if (!dateString || typeof dateString !== 'string') {
    return false;
  }
  
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) {
    return false;
  }
  
  const date = new Date(dateString + 'T00:00:00.000Z');
  return !isNaN(date.getTime());
};

/**
 * Validate pagination parameters
 */
export const validatePagination = (req, res, next) => {
  try {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  
  // Validate page
  if (page < 1 || page > 10000) {
      // Instead of returning error, use default values
      req.query.page = 1;
    } else {
      req.query.page = page;
  }
  
  // Validate limit
  if (limit < 1 || limit > 1000) {
      // Instead of returning error, use default values
      req.query.limit = 50;
    } else {
      req.query.limit = limit;
    }
    
    next();
  } catch (error) {
    // If validation fails, use defaults and continue
    req.query.page = 1;
    req.query.limit = 50;
  next();
  }
};

/**
 * Validate store creation/update input
 */
export const validateStoreInput = (req, res, next) => {
  if (req.method === 'POST' || req.method === 'PUT') {
    // Validate URL if present
    if (req.body.url) {
      if (!validateUrl(req.body.url)) {
        return res.status(400).json({ 
          error: 'Invalid URL',
          message: 'URL must be a valid http or https URL'
        });
      }
      req.body.url = req.body.url.trim();
    }
    
    // Sanitize string fields
    if (req.body.source) {
      req.body.source = sanitizeString(req.body.source);
    }
    
    if (req.body.name) {
      req.body.name = sanitizeString(req.body.name);
    }
    
    if (req.body.country) {
      req.body.country = sanitizeString(req.body.country);
    }
    
    // Sanitize arrays
    if (req.body.tags) {
      req.body.tags = sanitizeArray(req.body.tags);
    }
    
    if (req.body.countries) {
      req.body.countries = sanitizeArray(req.body.countries);
    }
    
    if (req.body.themes) {
      req.body.themes = sanitizeArray(req.body.themes);
    }
  }
  
  next();
};

/**
 * Validate filter parameters
 */
export const validateFilters = (req, res, next) => {
  try {
    // Validate date filters - if invalid, just remove them instead of erroring
  if (req.query.dateFrom && !validateDate(req.query.dateFrom)) {
      console.warn('[Validator] Invalid dateFrom format, ignoring:', req.query.dateFrom);
      delete req.query.dateFrom;
  }
  
  if (req.query.dateTo && !validateDate(req.query.dateTo)) {
      console.warn('[Validator] Invalid dateTo format, ignoring:', req.query.dateTo);
      delete req.query.dateTo;
  }
  
  // Sanitize filter arrays
  if (req.query.countries) {
    req.query.countries = sanitizeArray(
      Array.isArray(req.query.countries) ? req.query.countries : [req.query.countries]
    );
  }
  
  if (req.query.themes) {
    req.query.themes = sanitizeArray(
      Array.isArray(req.query.themes) ? req.query.themes : [req.query.themes]
    );
  }
  
  if (req.query.tags) {
    req.query.tags = sanitizeArray(
      Array.isArray(req.query.tags) ? req.query.tags : [req.query.tags]
    );
  }
  
  next();
  } catch (error) {
    // If validation fails, just continue with defaults
    console.warn('[Validator] Filter validation error, continuing with defaults:', error);
    next();
  }
};

