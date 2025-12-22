/**
 * MongoDB Query Sanitization
 * Prevents NoSQL injection attacks
 */

/**
 * Sanitize MongoDB query operators
 * Removes dangerous operators that could be used for injection
 */
export const sanitizeMongoQuery = (query) => {
  if (!query || typeof query !== 'object') {
    return {};
  }

  const sanitized = {};
  const dangerousOperators = ['$where', '$eval', '$function', '$accumulator'];
  
  for (const [key, value] of Object.entries(query)) {
    // Skip dangerous operators
    if (dangerousOperators.includes(key)) {
      console.warn(`⚠️  Blocked dangerous MongoDB operator: ${key}`);
      continue;
    }
    
    // Recursively sanitize nested objects
    if (typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date)) {
      sanitized[key] = sanitizeMongoQuery(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
};

/**
 * Sanitize field names to prevent injection
 */
export const sanitizeFieldName = (fieldName) => {
  if (typeof fieldName !== 'string') {
    return '';
  }
  
  // Only allow alphanumeric, underscore, and dot
  return fieldName.replace(/[^a-zA-Z0-9._]/g, '');
};

/**
 * Validate and sanitize MongoDB update operations
 */
export const sanitizeUpdateOperation = (update) => {
  if (!update || typeof update !== 'object') {
    return {};
  }

  const sanitized = {};
  
  // Only allow safe update operators
  const allowedOperators = ['$set', '$unset', '$inc', '$push', '$pull', '$addToSet'];
  
  for (const [key, value] of Object.entries(update)) {
    if (allowedOperators.includes(key)) {
      sanitized[key] = sanitizeMongoQuery(value);
    } else if (!key.startsWith('$')) {
      // Regular field update (will be wrapped in $set)
      sanitized[key] = value;
    } else {
      console.warn(`⚠️  Blocked unsafe MongoDB update operator: ${key}`);
    }
  }
  
  return sanitized;
};

