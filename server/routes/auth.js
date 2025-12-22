import express from 'express';
import { OAuth2Client } from 'google-auth-library';
import { getPrisma } from '../config/postgres.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { authenticateJWT } from '../middleware/auth.js';
import { sendStaffWelcomeEmail } from '../services/emailService.js';
import { getMaxDevices, getSuspendAfterDevices } from '../config/planRestrictions.js';

const router = express.Router();

// Initialize Google OAuth client
const getGoogleClient = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.FRONTEND_URL}/auth/google/callback`;

  if (!clientId || !clientSecret) {
    return null;
  }

  return new OAuth2Client(clientId, clientSecret, redirectUri);
};

// Generate unique session ID
const generateSessionId = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Generate JWT token with session ID
// Long expiration to keep users logged in
const generateToken = (user, sessionId) => {
  return jwt.sign(
    { 
      userId: user.id, // UUID string
      email: user.email,
      name: user.name,
      sessionId: sessionId
    },
    process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    { expiresIn: '365d' } // 1 year expiration - keep users logged in
  );
};

// Get device info from request
const getDeviceInfo = (req) => {
  return {
    userAgent: req.headers['user-agent'] || 'Unknown',
    ip: req.ip || req.connection.remoteAddress || 'Unknown',
    deviceId: crypto
      .createHash('sha256')
      .update((req.headers['user-agent'] || '') + (req.ip || ''))
      .digest('hex')
      .substring(0, 16),
  };
};

// Manage user sessions with device limits based on subscription plan
const manageUserSessions = async (userId, newSessionId, token, deviceInfo) => {
  try {
    const prisma = getPrisma();
    
    // Get user and their plan
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        sessions: {
          where: { isActive: true },
        },
      },
    });
    
    if (!user) {
      throw new Error('User not found');
    }
    
    const plan = user.subscriptionPlan || 'free';
    const maxDevices = getMaxDevices(plan);
    
    // Count active sessions (each session represents a device)
    const activeSessionCount = user.sessions.length;
    
    // Free users have unlimited devices - no checks needed
    if (maxDevices === Infinity) {
      // Unlimited devices - create session without checking
      const newSession = await prisma.session.create({
        data: {
          userId: userId,
          sessionId: newSessionId,
          token: token,
          ip: deviceInfo?.ip || null,
          isActive: true,
          lastActivity: new Date(),
        },
      });
      // Session created successfully - log removed to prevent terminal clutter
      return newSession;
    }
    
    // Check device limits for Starter and Pro plans
    // Starter: 2 devices max, suspend on 3rd device (activeSessionCount >= 2 means they already have 2, so 3rd login should suspend)
    // Pro: 3 devices max, suspend on 4th device (activeSessionCount >= 3 means they already have 3, so 4th login should suspend)
    
    if (plan === 'starter' && activeSessionCount >= 2) {
      // Starter plan: Already has 2 devices, attempting 3rd - SUSPEND
      const oldStatus = user.accountStatus || 'active';
      
      await prisma.user.update({
        where: { id: userId },
        data: {
          isActive: false,
          accountStatus: 'suspended',
        },
      });
      
      await prisma.session.updateMany({
        where: { userId: userId },
        data: { isActive: false },
      });

      // Send notification email (async, don't wait)
      const { notifyAccountStatusChange } = await import('../services/accountStatusNotificationService.js');
      notifyAccountStatusChange(
        user,
        oldStatus,
        'suspended',
        {
          deviceLimitExceeded: true,
          maxDevices: 2,
          currentDevices: activeSessionCount + 1,
          notificationType: 'auto_suspension_device',
        }
      ).catch(err => console.error('[Auth] Failed to send suspension notification:', err));
      
      throw new Error(`Account suspended: Your Starter plan allows up to 2 devices. You attempted to login from a 3rd device. Please contact support.`);
    } else if (plan === 'pro' && activeSessionCount >= 3) {
      // Pro plan: Already has 3 devices, attempting 4th - SUSPEND
      const oldStatus = user.accountStatus || 'active';
      
      await prisma.user.update({
        where: { id: userId },
        data: {
          isActive: false,
          accountStatus: 'suspended',
        },
      });
      
      await prisma.session.updateMany({
        where: { userId: userId },
        data: { isActive: false },
      });

      // Send notification email (async, don't wait)
      const { notifyAccountStatusChange } = await import('../services/accountStatusNotificationService.js');
      notifyAccountStatusChange(
        user,
        oldStatus,
        'suspended',
        {
          deviceLimitExceeded: true,
          maxDevices: 3,
          currentDevices: activeSessionCount + 1,
          notificationType: 'auto_suspension_device',
        }
      ).catch(err => console.error('[Auth] Failed to send suspension notification:', err));
      
      throw new Error(`Account suspended: Your Pro plan allows up to 3 devices. You attempted to login from a 4th device. Please contact support.`);
    } else if (activeSessionCount >= maxDevices) {
      // Device limit reached (shouldn't happen for starter/pro due to above checks, but safety check)
      throw new Error(`Device limit reached: Your ${plan} plan allows up to ${maxDevices} devices. Please log out from another device or upgrade your plan.`);
    }
    
    // Create new session (device limit not reached)
    const newSession = await prisma.session.create({
      data: {
        userId: userId,
        sessionId: newSessionId,
        token: token,
        ip: deviceInfo?.ip || null,
        isActive: true,
        lastActivity: new Date(),
      },
    });

    // Session created successfully - log removed to prevent terminal clutter
    return newSession;
  } catch (error) {
    console.error('Error managing user sessions:', error);
    throw error;
  }
};

/**
 * GET /api/auth/google/url
 * Get Google OAuth authorization URL
 */
router.get('/google/url', (req, res) => {
  try {
    const client = getGoogleClient();
    
    if (!client) {
      return res.status(500).json({
        error: 'Google OAuth not configured',
        message: 'Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your .env file'
      });
    }

    const scopes = [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ];

    const authUrl = client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
    });

    res.json({ authUrl });
  } catch (error) {
    console.error('Error generating Google OAuth URL:', error);
    res.status(500).json({ error: 'Failed to generate OAuth URL', message: error.message });
  }
});

/**
 * POST /api/auth/google/callback
 * Handle Google OAuth callback with authorization code
 */
router.post('/google/callback', async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }

    const client = getGoogleClient();
    
    if (!client) {
      return res.status(500).json({
        error: 'Google OAuth not configured',
        message: 'Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your .env file'
      });
    }

    // Exchange code for tokens
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    // Get user info from Google
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    if (!email) {
      return res.status(400).json({ error: 'Email not provided by Google' });
    }

    // Find or create user
    const prisma = getPrisma();
    let user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (user) {
      // Check if user is suspended or deactivated
      if (!user.isActive) {
        const accountStatus = user.accountStatus || 'suspended';
        if (accountStatus === 'deactivated') {
          return res.status(403).json({
            error: 'Account deactivated',
            message: 'Your account has been deactivated. You are not allowed to login. Please contact support for assistance.',
          });
        } else {
          return res.status(403).json({
            error: 'Account suspended',
            message: 'Your account has been suspended. You are not allowed to use our platform at the moment. Please contact support for assistance.',
          });
        }
      }

      // Update existing user
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: googleId,
          name: name || user.name,
          picture: picture || user.picture,
          lastLogin: new Date(),
        },
      });
    } else {
      // Create new user
      user = await prisma.user.create({
        data: {
          googleId: googleId,
          email: email.toLowerCase(),
          name: name || 'User',
          picture: picture,
          provider: 'google',
          lastLogin: new Date(),
        },
      });
    }

    // Generate session ID and token
    const sessionId = generateSessionId();
    const token = generateToken(user, sessionId);
    const deviceInfo = getDeviceInfo(req);

    // Manage user sessions (limit to 2 devices)
    await manageUserSessions(user.id, sessionId, token, deviceInfo);

    res.json({
      success: true,
      token,
      sessionId,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
        subscription: {
          plan: user.subscriptionPlan || 'free',
          status: user.subscriptionStatus || 'active',
          startDate: user.subscriptionStartDate || null,
          endDate: user.subscriptionEndDate || null,
          autoRenew: user.subscriptionAutoRenew || false,
          billingCycle: user.subscriptionBillingCycle || null,
        },
      },
    });
  } catch (error) {
    console.error('Error in Google OAuth callback:', error);
    res.status(500).json({ 
      error: 'Authentication failed', 
      message: error.message 
    });
  }
});

/**
 * POST /api/auth/google/verify
 * Verify Google ID token (for client-side OAuth)
 */
router.post('/google/verify', async (req, res) => {
  const startTime = Date.now();
  try {
    const { idToken, deviceId } = req.body;

    if (!idToken) {
      return res.status(400).json({ error: 'ID token is required' });
    }
    
    if (!deviceId) {
      return res.status(400).json({ error: 'Device ID is required' });
    }

    const client = getGoogleClient();
    
    if (!client) {
      return res.status(500).json({
        error: 'Google OAuth not configured',
        message: 'Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your .env file'
      });
    }

    // Verify the token with timeout (increased to 30 seconds)
    let ticket;
    try {
      ticket = await Promise.race([
        client.verifyIdToken({
          idToken,
          audience: process.env.GOOGLE_CLIENT_ID,
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Google token verification timeout')), 30000)
        )
      ]);
    } catch (verifyError) {
      
      // Provide more specific error messages
      let errorMessage = verifyError.message || 'Invalid or expired Google token';
      if (verifyError.message?.includes('timeout')) {
        errorMessage = 'Google token verification timed out. Please try again.';
      } else if (verifyError.message?.includes('Invalid token') || verifyError.message?.includes('expired')) {
        errorMessage = 'Invalid or expired Google token. Please sign in again.';
      }
      
      return res.status(401).json({
        error: 'Token verification failed',
        message: errorMessage
      });
    }

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    if (!email) {
      return res.status(400).json({ error: 'Email not provided by Google' });
    }

    // Find or create user with timeout
    const prisma = getPrisma();
    let user;
    try {
      user = await Promise.race([
        prisma.user.findUnique({
          where: { email: email.toLowerCase() },
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database query timeout')), 5000)
        )
      ]);
    } catch (dbError) {
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to check user account. Please try again.'
      });
    }

    if (user) {
      // Check if user is suspended or deactivated BEFORE updating
      if (!user.isActive) {
        const accountStatus = user.accountStatus || 'suspended';
        if (accountStatus === 'deactivated') {
          return res.status(403).json({
            error: 'Account deactivated',
            message: 'Your account has been deactivated. You are not allowed to login. Please contact support for assistance.',
          });
        } else {
          return res.status(403).json({
            error: 'Account suspended',
            message: 'Your account has been suspended. You are not allowed to use our platform at the moment. Please contact support for assistance.',
          });
        }
      }

      // Check device limits before allowing login
      const { checkDeviceLimits, registerDevice, suspendUserAndRevokeSessions } = await import('../utils/deviceChecker.js');
      const deviceCheck = await checkDeviceLimits(user.id, deviceId);
      
      if (deviceCheck.shouldSuspend) {
        // Suspend user and revoke all sessions
        await suspendUserAndRevokeSessions(user.id);
        return res.status(403).json({
          error: 'Account suspended',
          message: 'Your account has been suspended for exceeding the device limit for your plan. Please contact support for assistance.',
        });
      }
      
      if (!deviceCheck.allowed) {
        return res.status(403).json({
          error: 'Device limit exceeded',
          message: deviceCheck.message || 'You have exceeded the device limit for your plan. Please contact support.',
        });
      }
      
      // Register device (create or update)
      await registerDevice(user.id, deviceId);
      
      // Update existing user
      try {
        user = await Promise.race([
          prisma.user.update({
            where: { id: user.id },
            data: {
              googleId: googleId,
              name: name || user.name,
              picture: picture || user.picture,
              lastLogin: new Date(),
            },
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Database update timeout')), 5000)
          )
        ]);
      } catch (updateError) {
        return res.status(500).json({
          error: 'Database error',
          message: 'Failed to update user account. Please try again.'
        });
      }
    } else {
      // Create new user
      try {
        user = await Promise.race([
          prisma.user.create({
            data: {
              googleId: googleId,
              email: email.toLowerCase(),
              name: name || 'User',
              picture: picture,
              provider: 'google',
              lastLogin: new Date(),
            },
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Database create timeout')), 5000)
          )
        ]);
      } catch (createError) {
        return res.status(500).json({
          error: 'Database error',
          message: 'Failed to create user account. Please try again.'
        });
      }
      
      // Register device for new user
      const { registerDevice } = await import('../utils/deviceChecker.js');
      await registerDevice(user.id, deviceId);
    }

    // Generate session ID and token
    const sessionId = generateSessionId();
    const token = generateToken(user, sessionId);
    const deviceInfo = getDeviceInfo(req);

    // Check if user is admin (for admin dashboard access)
    const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim().toLowerCase()) || [];
    const isAdmin = adminEmails.includes(email.toLowerCase());

    // Manage user sessions (create session)
    try {
      await Promise.race([
        manageUserSessions(user.id, sessionId, token, deviceInfo),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Session management timeout')), 5000)
        )
      ]);
    } catch (sessionError) {
      // Continue anyway - session management failure shouldn't block login
    }
    
    // Check device limits again to get warning info for response
    const { checkDeviceLimits } = await import('../utils/deviceChecker.js');
    const deviceCheck = await checkDeviceLimits(user.id, deviceId);

    const response = {
      success: true,
      token,
      sessionId,
      isAdmin, // Include admin status in response
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
        subscription: {
          plan: user.subscriptionPlan || 'free',
          status: user.subscriptionStatus || 'active',
          startDate: user.subscriptionStartDate || null,
          endDate: user.subscriptionEndDate || null,
          autoRenew: user.subscriptionAutoRenew || false,
          billingCycle: user.subscriptionBillingCycle || null,
        },
      },
    };
    
    // Include warning if device limit warning was triggered
    if (deviceCheck.warning) {
      response.warning = deviceCheck.warning;
      response.deviceCount = deviceCheck.deviceCount;
    }
    
    res.json(response);
  } catch (error) {
    res.status(401).json({ 
      error: 'Token verification failed', 
      message: error.message || 'An unexpected error occurred during authentication'
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user from JWT token
 */
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

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
            return res.status(401).json({ error: 'Invalid token' });
          }
          // Continue with decoded token (expired but still has user info)
        } catch (decodeError) {
          return res.status(401).json({ error: 'Invalid token' });
        }
      } else {
        return res.status(401).json({ error: 'Invalid token' });
      }
    }

    const prisma = getPrisma();

    // Check if session is still active - but be lenient
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
          // If upsert fails, log but continue - don't block user
          console.warn('[Auth /me] Could not sync session, but continuing:', upsertError.message);
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
          console.warn('[Auth /me] Could not update session activity:', updateError.message);
        }
      }
    }

    // Get user - be lenient if user not found
    let user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    // If user not found but token is valid, create minimal user object from token
    if (!user && decoded.userId) {
      // Try to find user by email if available in token
      if (decoded.email) {
        user = await prisma.user.findUnique({
          where: { email: decoded.email.toLowerCase() },
        });
      }
      
      // If still not found, return error (user should exist)
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }
    }

    // Check if user is active
    if (user && !user.isActive) {
      const accountStatus = user.accountStatus || 'suspended';
      if (accountStatus === 'deactivated') {
        return res.status(403).json({
          error: 'Account deactivated',
          message: 'Your account has been deactivated. Please contact support.',
        });
      } else {
        return res.status(403).json({
          error: 'Account suspended',
          message: 'Your account has been suspended. Please contact support.',
        });
      }
    }

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
        createdAt: user.createdAt,
        subscription: {
          plan: user.subscriptionPlan || 'free',
          status: user.subscriptionStatus || 'active',
          startDate: user.subscriptionStartDate || null,
          endDate: user.subscriptionEndDate || null,
          autoRenew: user.subscriptionAutoRenew || false,
          billingCycle: user.subscriptionBillingCycle || null,
        },
        usage: {
          filterQueriesThisMonth: user.filterQueriesThisMonth || 0,
          csvExportsToday: user.csvExportsToday || 0,
          copyOperationsToday: user.copyOperationsToday || 0,
        },
      },
    });
  } catch (error) {
    // Handle JWT errors gracefully
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      // Try to decode expired token to get user info
      try {
        const decoded = jwt.decode(token);
        if (decoded && decoded.userId) {
          const prisma = getPrisma();
          const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
          });
          if (user && user.isActive) {
            // Return user even with expired token - frontend can refresh
            return res.json({
              user: {
                id: user.id,
                email: user.email,
                name: user.name,
                picture: user.picture,
                createdAt: user.createdAt,
                subscription: {
                  plan: user.subscriptionPlan || 'free',
                  status: user.subscriptionStatus || 'active',
                  startDate: user.subscriptionStartDate || null,
                  endDate: user.subscriptionEndDate || null,
                  autoRenew: user.subscriptionAutoRenew || false,
                  billingCycle: user.subscriptionBillingCycle || null,
                },
                usage: {
                  filterQueriesThisMonth: user.filterQueriesThisMonth || 0,
                  csvExportsToday: user.csvExportsToday || 0,
                  copyOperationsToday: user.copyOperationsToday || 0,
                },
              },
              tokenExpired: true, // Signal to frontend that token needs refresh
            });
          }
        }
      } catch (decodeError) {
        // Can't decode, return 401
      }
      return res.status(401).json({ error: 'Token expired' });
    }
    console.error('Error getting user:', error);
    res.status(500).json({ error: 'Failed to get user', message: error.message });
  }
});

/**
 * POST /api/auth/email/send-code
 * Send verification code to email
 */
router.post('/email/send-code', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        error: 'Email is required' 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        error: 'Invalid email format' 
      });
    }

    // Check if user exists and is suspended/deactivated BEFORE sending code
    const prisma = getPrisma();
    let existingUser = null;
    try {
      existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });
    } catch (dbError) {
      console.error('Database query error:', dbError);
      // Continue anyway - we'll create a new user if needed
    }

    if (existingUser && !existingUser.isActive) {
      const accountStatus = existingUser.accountStatus || 'suspended';
      if (accountStatus === 'deactivated') {
        return res.status(403).json({
          error: 'Account deactivated',
          message: 'Your account has been deactivated. You are not allowed to login. Please contact support for assistance.',
        });
      } else {
        return res.status(403).json({
          error: 'Account suspended',
          message: 'Your account has been suspended. You are not allowed to use our platform at the moment. Please contact support for assistance.',
        });
      }
    }

    // Import code store and email service
    const { generateCode, storeCode } = await import('../utils/codeStore.js');
    const { sendVerificationCode } = await import('../utils/emailService.js');

    // Generate and store code
    const code = generateCode();
    // Normalize email to lowercase for consistency
    const normalizedEmail = email.toLowerCase().trim();
    storeCode(normalizedEmail, code);
    
    // Log removed to prevent terminal clutter

    // Send email with timeout handling
    try {
      // Wrap email sending in a promise race with timeout
      const emailPromise = sendVerificationCode(normalizedEmail, code);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Email sending timeout - Gmail may be slow. Please try again.')), 40000); // 40 second timeout
      });
      
      await Promise.race([emailPromise, timeoutPromise]);
    } catch (emailError) {
      console.error('Email service error:', emailError);
      return res.status(500).json({ 
        error: 'Failed to send verification code', 
        message: emailError.message || 'Email service error. Check server/.env configuration.',
        details: process.env.NODE_ENV === 'development' ? emailError.message : undefined,
      });
    }

    res.json({
      success: true,
      message: 'Verification code sent to email',
    });
  } catch (error) {
    console.error('Error sending verification code:', error);
    
    // Provide more helpful error messages
    let errorMessage = 'Failed to send verification code';
    if (error.message.includes('timeout') || error.message.includes('ECONNREFUSED')) {
      errorMessage = 'Database connection timeout. Please try again.';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    res.status(500).json({ 
      error: 'Failed to send verification code', 
      message: errorMessage 
    });
  }
});

/**
 * POST /api/auth/email/verify
 * Verify email code and create/login user
 */
router.post('/email/verify', async (req, res) => {
  try {
    const { email, code, deviceId } = req.body;

    if (!email || !code) {
      return res.status(400).json({ 
        error: 'Email and code are required' 
      });
    }
    
    if (!deviceId) {
      return res.status(400).json({ 
        error: 'Device ID is required' 
      });
    }

    // Verify code
    const { verifyCode } = await import('../utils/codeStore.js');
    
    // Normalize email to lowercase for consistency
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedCode = code.trim();
    
    const verification = verifyCode(normalizedEmail, normalizedCode);

    if (!verification.valid) {
      // Log removed to prevent terminal clutter
      // Code verification failed - error returned to client
      return res.status(400).json({ 
        error: verification.error || 'Invalid verification code' 
      });
    }

    // Find or create user
    const prisma = getPrisma();
    let user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (user) {
      // CRITICAL: Check if user is suspended or deactivated BEFORE allowing login
      if (!user.isActive) {
        const accountStatus = user.accountStatus || 'suspended';
        if (accountStatus === 'deactivated') {
          return res.status(403).json({
            error: 'Account deactivated',
            message: 'Your account has been deactivated. You are not allowed to login. Please contact support for assistance.',
          });
        } else {
          return res.status(403).json({
            error: 'Account suspended',
            message: 'Your account has been suspended. You are not allowed to use our platform at the moment. Please contact support for assistance.',
          });
        }
      }

      // Check device limits before allowing login
      const { checkDeviceLimits, registerDevice, suspendUserAndRevokeSessions } = await import('../utils/deviceChecker.js');
      const deviceCheck = await checkDeviceLimits(user.id, deviceId);
      
      if (deviceCheck.shouldSuspend) {
        // Suspend user and revoke all sessions
        await suspendUserAndRevokeSessions(user.id);
        return res.status(403).json({
          error: 'Account suspended',
          message: 'Your account has been suspended for exceeding the device limit for your plan. Please contact support for assistance.',
        });
      }
      
      if (!deviceCheck.allowed) {
        return res.status(403).json({
          error: 'Device limit exceeded',
          message: deviceCheck.message || 'You have exceeded the device limit for your plan. Please contact support.',
        });
      }
      
      // Register device (create or update)
      await registerDevice(user.id, deviceId);
      
      // Update existing user
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          lastLogin: new Date(),
          provider: 'email',
        },
      });
    } else {
      // Create new user
      // Extract name from email (before @) as default
      const emailName = normalizedEmail.split('@')[0];
      const name = emailName.charAt(0).toUpperCase() + emailName.slice(1);
      
      user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          name: name || 'User',
          provider: 'email',
          lastLogin: new Date(),
        },
      });
      
      // Register device for new user
      const { registerDevice } = await import('../utils/deviceChecker.js');
      await registerDevice(user.id, deviceId);
    }

    // Generate session ID and token
    const sessionId = generateSessionId();
    const token = generateToken(user, sessionId);
    const deviceInfo = getDeviceInfo(req);

    // Manage user sessions (create session)
    await manageUserSessions(user.id, sessionId, token, deviceInfo);
    
    // Check device limits again to get warning info for response
    const { checkDeviceLimits } = await import('../utils/deviceChecker.js');
    const deviceCheck = await checkDeviceLimits(user.id, deviceId);

    const response = {
      success: true,
      token,
      sessionId,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
        subscription: {
          plan: user.subscriptionPlan || 'free',
          status: user.subscriptionStatus || 'active',
          startDate: user.subscriptionStartDate || null,
          endDate: user.subscriptionEndDate || null,
          autoRenew: user.subscriptionAutoRenew || false,
          billingCycle: user.subscriptionBillingCycle || null,
        },
      },
    };
    
    // Include warning if device limit warning was triggered
    if (deviceCheck.warning) {
      response.warning = deviceCheck.warning;
      response.deviceCount = deviceCheck.deviceCount;
    }
    
    res.json(response);
  } catch (error) {
    console.error('Error verifying email code:', error);
    res.status(500).json({ 
      error: 'Verification failed', 
      message: error.message 
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout user (deactivate current session)
 */
router.post('/logout', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'your-secret-key-change-in-production'
      );

      // Deactivate session if sessionId exists
      const prisma = getPrisma();
      if (decoded.sessionId) {
        const session = await prisma.session.findUnique({
          where: { sessionId: decoded.sessionId },
        });
        if (session) {
          await prisma.session.update({
            where: { id: session.id },
            data: { isActive: false },
          });
        }
      }

      res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
      // Even if token is invalid, return success
      res.json({ success: true, message: 'Logged out successfully' });
    }
  } catch (error) {
    console.error('Error in logout:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

/**
 * GET /api/auth/admin/check
 * Check if current user is admin
 */
router.get('/admin/check', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        isAdmin: false,
        error: 'No token provided' 
      });
    }

    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'your-secret-key-change-in-production'
      );

      const prisma = getPrisma();
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
      });
      
      if (!user) {
        return res.json({ isAdmin: false });
      }

      // Check if user email is in admin list
      const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim().toLowerCase()) || [];
      const isAdmin = adminEmails.includes(user.email.toLowerCase());

      return res.json({ 
        isAdmin,
        email: user.email 
      });
    } catch (error) {
      return res.json({ isAdmin: false });
    }
  } catch (error) {
    console.error('Error checking admin status:', error);
    return res.status(500).json({ 
      isAdmin: false,
      error: 'Admin check failed' 
    });
  }
});

/**
 * GET /api/auth/session/check
 * Check if current session is still valid
 */
router.get('/session/check', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        valid: false,
        error: 'No token provided' 
      });
    }

    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'your-secret-key-change-in-production'
      );

      // Check if session is still active - but be lenient
      // If token is valid JWT, consider session valid even if not in database
      // This allows users to stay logged in across sessions
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
            // Session exists and is active
            return res.json({ 
              valid: true,
              sessionId: decoded.sessionId
            });
          } else {
            // Session not in database, but token is valid JWT
            // Consider it valid - might be a new session or database sync issue
            // Keep user logged in
            return res.json({ 
              valid: true,
              sessionId: decoded.sessionId,
              needsSync: true // Indicates session should be created in DB
            });
          }
        } catch (dbError) {
          // Database error - but token is valid, so keep user logged in
          console.warn('Database error checking session, but token is valid:', dbError.message);
          return res.json({ 
            valid: true,
            sessionId: decoded.sessionId,
            needsSync: true
          });
        }
      }

      // If no sessionId in token, it's an old token format - still valid
      return res.json({ 
        valid: true,
        needsUpdate: true
      });
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.json({ 
          valid: false,
          error: 'Token expired'
        });
      }
      return res.json({ 
        valid: false,
        error: 'Invalid token'
      });
    }
  } catch (error) {
    console.error('Error checking session:', error);
    res.status(500).json({ 
      valid: false,
      error: 'Session check failed' 
    });
  }
});

/**
 * GET /api/auth/tickets
 * Get user's support tickets (requires authentication)
 */
router.get('/tickets', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const userEmail = req.user.email;
    
    // Find tickets by userId OR by email (in case user was created after ticket)
    const prisma = getPrisma();
    const tickets = await prisma.supportTicket.findMany({
      where: {
        OR: [
          { userId: userId },
          { userEmail: userEmail.toLowerCase() }
        ]
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const transformedTickets = tickets.map(ticket => ({
      id: ticket.id,
      ticketId: ticket.ticketId,
      subject: ticket.subject,
      message: ticket.message,
      status: ticket.status,
      userPlan: ticket.userPlan || 'free',
      priority: ticket.priority,
      replies: ticket.replies || [],
      lastRepliedBy: ticket.lastRepliedBy,
      lastRepliedAt: ticket.lastRepliedAt,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
    }));

    res.json({
      tickets: transformedTickets,
      total: transformedTickets.length,
    });
  } catch (error) {
    console.error('Error fetching user tickets:', error);
    res.status(500).json({
      error: 'Failed to fetch tickets',
      message: error.message,
    });
  }
});

/**
 * GET /api/auth/tickets/:id
 * Get a specific ticket (requires authentication)
 */
router.get('/tickets/:id', authenticateJWT, async (req, res) => {
  try {
    const ticketId = req.params.id;
    const userId = req.user.id;
    const userEmail = req.user.email;
    
    // Find ticket by ID and either userId OR email (in case user was created after ticket)
    const prisma = getPrisma();
    const ticket = await prisma.supportTicket.findFirst({
      where: {
        id: ticketId,
        OR: [
          { userId: userId },
          { userEmail: userEmail.toLowerCase() }
        ]
      },
    });
    
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    res.json({
      id: ticket.id,
      ticketId: ticket.ticketId,
      subject: ticket.subject,
      message: ticket.message,
      status: ticket.status,
      userPlan: ticket.userPlan || 'free',
      priority: ticket.priority,
      replies: ticket.replies || [],
      lastRepliedBy: ticket.lastRepliedBy,
      lastRepliedAt: ticket.lastRepliedAt,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
    });
  } catch (error) {
    console.error('Error fetching ticket:', error);
    res.status(500).json({
      error: 'Failed to fetch ticket',
      message: error.message,
    });
  }
});

/**
 * POST /api/auth/tickets/:id/reply
 * User reply to their ticket (requires authentication)
 */
router.post('/tickets/:id/reply', authenticateJWT, async (req, res) => {
  try {
    const ticketId = req.params.id;
    const userId = req.user.id;
    const userEmail = req.user.email;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        error: 'Message is required',
      });
    }

    // Find ticket by ID and either userId OR email
    const prisma = getPrisma();
    const ticket = await prisma.supportTicket.findFirst({
      where: {
        id: ticketId,
        OR: [
          { userId: userId },
          { userEmail: userEmail.toLowerCase() }
        ]
      },
    });
    
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Add user reply
    const currentReplies = Array.isArray(ticket.replies) ? ticket.replies : [];
    const newReply = {
      from: 'user',
      message: message.trim(),
      createdAt: new Date().toISOString(),
    };
    const updatedReplies = [...currentReplies, newReply];
    
    // Update status if it was resolved/closed
    const newStatus = (ticket.status === 'resolved' || ticket.status === 'closed') ? 'open' : ticket.status;

    const updatedTicket = await prisma.supportTicket.update({
      where: { id: ticket.id },
      data: {
        replies: updatedReplies,
        lastRepliedBy: 'user',
        lastRepliedAt: new Date(),
        status: newStatus,
      },
    });

    res.json({
      success: true,
      message: 'Reply sent successfully',
      ticket: {
        id: updatedTicket.id,
        ticketId: updatedTicket.ticketId,
        replies: updatedTicket.replies,
        status: updatedTicket.status,
      },
    });
  } catch (error) {
    console.error('Error replying to ticket:', error);
    res.status(500).json({
      error: 'Failed to send reply',
      message: error.message,
    });
  }
});

/**
 * POST /api/auth/staff/accept-invite
 * Accept staff invitation
 */
router.post('/staff/accept-invite', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Invitation token is required'
      });
    }

    // Find staff member by invitation token
    const prisma = getPrisma();
    const staff = await prisma.staff.findFirst({
      where: {
        invitationToken: token,
        invitationTokenExpires: {
          gt: new Date(),
        },
      },
    });

    if (!staff) {
      return res.status(400).json({
        error: 'Invalid or expired invitation',
        message: 'This invitation link is invalid or has expired. Please contact the admin for a new invitation.'
      });
    }

    if (staff.invitationAccepted) {
      return res.status(400).json({
        error: 'Invitation already accepted',
        message: 'This invitation has already been accepted. You can now login.'
      });
    }

    // Accept the invitation
    await prisma.staff.update({
      where: { id: staff.id },
      data: {
        invitationAccepted: true,
        invitationAcceptedAt: new Date(),
        status: 'active',
      },
    });

    // Send welcome email with login link
    try {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
      const loginUrl = `${frontendUrl}/manager/login`;
      
      await sendStaffWelcomeEmail({
        staffName: staff.name,
        staffEmail: staff.email,
        role: staff.role,
        loginUrl,
      });
    } catch (emailError) {
      console.error('Error sending welcome email:', emailError);
      // Don't fail the request if email fails, but log it
    }

    res.json({
      success: true,
      message: 'Invitation accepted successfully. Check your email for login instructions.',
      staff: {
        id: staff.id,
        name: staff.name,
        email: staff.email,
        role: staff.role,
      },
    });
  } catch (error) {
    console.error('Error accepting staff invitation:', error);
    res.status(500).json({
      error: 'Failed to accept invitation',
      message: error.message,
    });
  }
});

/**
 * POST /api/auth/staff/login
 * Staff login (no password required if invitation accepted)
 */
router.post('/staff/login', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: 'Email required',
        message: 'Email is required for staff login'
      });
    }

    // Find staff member
    const prisma = getPrisma();
    const staff = await prisma.staff.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!staff) {
      return res.status(404).json({
        error: 'Staff member not found',
        message: 'No staff member found with this email'
      });
    }

    // Check if invitation has been accepted
    if (!staff.invitationAccepted) {
      return res.status(403).json({
        error: 'Invitation not accepted',
        message: 'Please accept your invitation first. Check your email for the invitation link.'
      });
    }

    // Check if staff is active
    if (staff.status !== 'active') {
      return res.status(403).json({
        error: 'Account inactive',
        message: 'Your staff account is not active. Please contact the admin.'
      });
    }

    // Find or create user account for staff (for session management)
    let user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      // Create user account for staff
      user = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          name: staff.name,
          provider: 'email',
          isActive: true,
          accountStatus: 'active',
          subscriptionPlan: 'free',
          subscriptionStatus: 'active',
        },
      });
    } else {
      // Update existing user
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: staff.name,
          isActive: true,
          accountStatus: 'active',
          lastLogin: new Date(),
        },
      });
    }

    // Generate session ID and token with staff info
    const sessionId = generateSessionId();
    
    // Create token with staff information
    const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim().toLowerCase()) || [];
    const isAdmin = adminEmails.includes(email.toLowerCase()) || staff.role === 'admin';
    
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      name: user.name,
      sessionId: sessionId,
      isStaff: true,
      staffId: staff.id,
      staffRole: staff.role,
      staffPermissions: staff.permissions,
      isAdmin: isAdmin,
    };
    
    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      { expiresIn: '365d' } // 1 year expiration - keep users logged in
    );
    
    const deviceInfo = getDeviceInfo(req);

    // Manage user sessions
    await manageUserSessions(user.id, sessionId, token, deviceInfo);

    res.json({
      success: true,
      token,
      sessionId,
      isAdmin: isAdmin,
      isStaff: true,
      staff: {
        id: staff.id,
        name: staff.name,
        email: staff.email,
        role: staff.role,
        permissions: staff.permissions,
      },
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
        subscription: {
          plan: user.subscriptionPlan || 'free',
          status: user.subscriptionStatus || 'active',
        },
      },
    });
  } catch (error) {
    console.error('Error in staff login:', error);
    res.status(500).json({
      error: 'Login failed',
      message: error.message,
    });
  }
});

export default router;

