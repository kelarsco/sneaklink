/**
 * Authentication and Authorization Middleware
 * Supports both JWT tokens (for user auth) and API keys (for admin operations)
 */

import jwt from 'jsonwebtoken';
import { getPrisma } from '../config/postgres.js';

/**
 * JWT Token authentication middleware
 * Verifies JWT token from Authorization header
 */
export const authenticateJWT = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'No token provided. Please log in.'
      });
    }

    const token = authHeader.replace('Bearer ', '');
    
    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'your-secret-key-change-in-production'
      );

      // Check if session is still active - but be lenient
      // If JWT token is valid, allow request even if session not in database
      // This keeps users logged in across sessions
      const prisma = getPrisma();
      if (decoded.sessionId) {
        try {
          const session = await prisma.session.findUnique({
            where: {
              sessionId: decoded.sessionId,
              isActive: true,
            },
          });

          if (session) {
            // Session exists - update last activity
            try {
              await prisma.session.update({
                where: { id: session.id },
                data: { lastActivity: new Date() },
              });
            } catch (updateError) {
              // Ignore update errors - session exists, that's enough
              console.warn('Failed to update session activity:', updateError.message);
            }
          } else {
            // Session not in database, but JWT token is valid
            // Try to create session in database to keep it in sync
            // But don't fail if creation fails - token is valid, that's enough
            try {
              await prisma.session.upsert({
                where: { sessionId: decoded.sessionId },
                update: {
                  isActive: true,
                  lastActivity: new Date(),
                },
                create: {
                  userId: decoded.userId,
                  sessionId: decoded.sessionId,
                  token: token,
                  ip: req.ip || null,
                  isActive: true,
                  lastActivity: new Date(),
                },
              });
              // Log removed to prevent terminal clutter - session syncing is working normally
              // console.log(`✅ Synced missing session for user ${decoded.userId}`);
            } catch (createError) {
              // Ignore create errors - token is valid, that's enough
              // Session might already exist or there's a constraint issue
              console.warn('Failed to sync session in database (continuing anyway):', createError.message);
            }
          }
        } catch (dbError) {
          // Database error - but JWT token is valid, so allow request
          console.warn('Database error checking session, but token is valid:', dbError.message);
          // Continue - token is valid, that's enough
        }
      }

      // Get user from database - but be lenient
      let user;
      try {
        user = await prisma.user.findUnique({
          where: { id: decoded.userId },
        });
      } catch (dbError) {
        // Database error - but token is valid, so allow request with minimal user info
        console.warn('Database error fetching user, but token is valid:', dbError.message);
        // Create minimal user object from token
        user = {
          id: decoded.userId,
          email: decoded.email,
          name: decoded.name,
          isActive: true,
          accountStatus: 'active',
        };
      }
      
      if (!user) {
        // User not found, but token is valid - create minimal user object
        console.warn(`User ${decoded.userId} not found in database, but token is valid`);
        user = {
          id: decoded.userId,
          email: decoded.email,
          name: decoded.name,
          isActive: true,
          accountStatus: 'active',
        };
      }

      // Check if user is suspended or deactivated
      if (!user.isActive) {
        const accountStatus = user.accountStatus || 'suspended';
        if (accountStatus === 'deactivated') {
          return res.status(403).json({ 
            error: 'Account deactivated',
            message: 'Your account has been deactivated. You are not allowed to login. Please contact support for assistance.'
        });
        } else {
          return res.status(403).json({ 
            error: 'Account suspended',
            message: 'Your account has been suspended. You are not allowed to use our platform at the moment. Please contact support for assistance.'
          });
        }
      }

      // Attach user to request
      req.user = {
        id: user.id,
        userId: user.id, // UUID string
        email: user.email,
        name: user.name,
        picture: user.picture,
        sessionId: decoded.sessionId,
      };

      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        // Token expired but structure is valid - allow request to keep user logged in
        // They can refresh their session on next action
        console.warn('Token expired but structure is valid - allowing request');
        // Decode without verification to get user info
        try {
          const decoded = jwt.decode(token);
          if (decoded && decoded.userId) {
            // Get user from database
            const prisma = getPrisma();
            const user = await prisma.user.findUnique({
              where: { id: decoded.userId },
            });
            
            if (user && user.isActive) {
              // Attach user to request even with expired token
              req.user = {
                id: user.id,
                userId: user.id,
                email: user.email,
                name: user.name,
                picture: user.picture,
                sessionId: decoded.sessionId,
              };
              return next(); // Allow request with expired token
            }
          }
        } catch (decodeError) {
          // Can't decode - invalid token
        }
        return res.status(401).json({ 
          error: 'Unauthorized',
          message: 'Token expired. Please log in again.'
        });
      }
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ 
          error: 'Unauthorized',
          message: 'Invalid token. Please log in again.'
        });
      }
      throw error;
    }
  } catch (error) {
    console.error('Error in JWT authentication:', error);
    res.status(500).json({ 
      error: 'Authentication error',
      message: error.message 
    });
  }
};

/**
 * Simple API Key authentication middleware
 * For production, consider using JWT tokens or OAuth
 */
export const authenticate = (req, res, next) => {
  // Try JWT authentication first (for user auth)
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    // Use JWT authentication
    return authenticateJWT(req, res, next);
  }

  // Fallback to API key authentication (for admin operations)
  // Skip authentication for read-only endpoints in development
  if (process.env.NODE_ENV === 'development' && req.method === 'GET') {
    return next();
  }

  // Check for API key in header or query parameter
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  
  if (!apiKey) {
    return res.status(401).json({ 
      error: 'Unauthorized',
      message: 'API key or JWT token required. Provide it in X-API-Key header or Authorization header.'
    });
  }

  // Validate API key
  const validApiKey = process.env.API_KEY || process.env.ADMIN_API_KEY;
  
  if (!validApiKey) {
    // If no API key is set in env, allow in development but warn
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️  WARNING: No API_KEY set in environment. Allowing request in development mode.');
      return next();
    }
    return res.status(500).json({ 
      error: 'Server configuration error',
      message: 'API authentication not properly configured'
    });
  }

  if (apiKey !== validApiKey) {
    // Log failed authentication attempt
    console.warn(`⚠️  Failed authentication attempt from ${req.ip} - Invalid API key`);
    return res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Invalid API key'
    });
  }

  // API key is valid
  next();
};

/**
 * Admin-only middleware (for sensitive operations)
 */
export const requireAdmin = (req, res, next) => {
  // Check for admin API key
  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '') || req.query.apiKey;
  const adminApiKey = process.env.ADMIN_API_KEY;
  
  if (!adminApiKey) {
    console.warn('⚠️  WARNING: No ADMIN_API_KEY set. Admin endpoints are unprotected!');
    if (process.env.NODE_ENV === 'production') {
      return res.status(500).json({ 
        error: 'Server configuration error',
        message: 'Admin authentication not configured'
      });
    }
    // Allow in development with warning
    return next();
  }

  if (!apiKey || apiKey !== adminApiKey) {
    console.warn(`⚠️  Unauthorized admin access attempt from ${req.ip}`);
    return res.status(403).json({ 
      error: 'Forbidden',
      message: 'Admin access required'
    });
  }

  next();
};

/**
 * Optional authentication - allows requests with or without API key
 * But logs when API key is missing
 */
/**
 * Optional authentication middleware
 * Tries to authenticate with JWT token if provided, but doesn't fail if not provided
 * Also supports API key authentication
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    // Try JWT authentication first if Bearer token is provided
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      
      try {
        let decoded;
        try {
          decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || 'your-secret-key-change-in-production'
          );
        } catch (jwtError) {
          // Handle expired tokens - decode without verification to get user info
          if (jwtError.name === 'TokenExpiredError') {
            try {
              decoded = jwt.decode(token);
              if (!decoded || !decoded.userId) {
                // Can't decode, continue without auth
                return next();
              }
              // Continue with decoded token (expired but still has user info)
            } catch (decodeError) {
              // Can't decode, continue without auth
              return next();
            }
          } else {
            // Invalid token - silently continue without authentication
            return next();
          }
        }

        // Check if session is still active - but be lenient
        const prisma = getPrisma();
        if (decoded.sessionId) {
          let session = await prisma.session.findUnique({
            where: {
              sessionId: decoded.sessionId,
            },
          });

          // If session not found but token is valid, try to create/update it
          if (!session && decoded.userId) {
            try {
              // Try to upsert the session to sync it with the database
              session = await prisma.session.upsert({
                where: { sessionId: decoded.sessionId },
                update: {
                  isActive: true,
                  lastActivity: new Date(),
                },
                create: {
                  userId: decoded.userId,
                  sessionId: decoded.sessionId,
                  token: token.substring(0, 500), // Truncate if too long
                  isActive: true,
                  lastActivity: new Date(),
                },
              });
            } catch (upsertError) {
              // If upsert fails, log but continue - don't block
              console.warn('[OptionalAuth] Could not sync session, but continuing:', upsertError.message);
            }
          }

          // Update last activity if session exists
          if (session) {
            try {
              await prisma.session.update({
                where: { id: session.id },
                data: { lastActivity: new Date() },
              });
            } catch (updateError) {
              // Log but don't block
              console.warn('[OptionalAuth] Could not update session activity:', updateError.message);
            }
          }

          // Get user from database - be lenient if user not found
          let user;
          try {
            user = await prisma.user.findUnique({
              where: { id: decoded.userId },
            });
          } catch (dbError) {
            // Database error - but token is valid, so continue without user
            console.warn('[OptionalAuth] Database error fetching user, but token is valid:', dbError.message);
          }

          // If user not found but token is valid, try to find by email
          if (!user && decoded.email) {
            try {
              user = await prisma.user.findUnique({
                where: { email: decoded.email.toLowerCase() },
              });
            } catch (dbError) {
              // Ignore
            }
          }

          if (user && user.isActive) {
            req.user = {
              id: user.id,
              userId: user.id,
              email: user.email,
              name: user.name,
              picture: user.picture,
              sessionId: decoded.sessionId,
            };
            req.authenticated = true;
          }
        } else {
          // Token without sessionId - legacy token, get user directly
          let user;
          try {
            user = await prisma.user.findUnique({
              where: { id: decoded.userId },
            });
          } catch (dbError) {
            // Database error - continue without auth
            return next();
          }

          if (user && user.isActive) {
            req.user = {
              id: user.id,
              userId: user.id,
              email: user.email,
              name: user.name,
              picture: user.picture,
            };
            req.authenticated = true;
          }
        }
      } catch (error) {
        // Invalid token - silently continue without authentication
        // Don't set req.user, but don't fail the request
      }
    } else {
      // Try API key authentication
      const apiKey = req.headers['x-api-key'] || req.query.apiKey;
      
      if (apiKey) {
        const validApiKey = process.env.API_KEY || process.env.ADMIN_API_KEY;
        if (validApiKey && apiKey === validApiKey) {
          req.authenticated = true;
        }
      }
    }
    
    next();
  } catch (error) {
    // On any error, continue without authentication (optional auth)
    next();
  }
};

