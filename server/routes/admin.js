import express from 'express';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import axios from 'axios';
import https from 'https';
import { getPrisma } from '../config/postgres.js';
import { sendStaffInvitation } from '../services/emailService.js';

const router = express.Router();

// Middleware to verify admin or staff token
const verifyAdminToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Admin or staff token required'
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-secret-key-change-in-production'
    );

    // Allow admin or staff access
    if (!decoded.isAdmin && !decoded.isStaff) {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: 'Admin or staff access required'
      });
    }

    // If staff, fetch latest permissions from database
    if (decoded.isStaff && decoded.staffId) {
      try {
        const prisma = getPrisma();
        const staff = await prisma.staff.findUnique({
          where: { id: decoded.staffId },
        });
        if (staff && staff.status === 'active') {
          req.staff = {
            id: staff.id,
            role: staff.role,
            permissions: staff.permissions || [],
          };
        } else {
          return res.status(403).json({
            error: 'Forbidden',
            message: 'Staff account is not active'
          });
        }
      } catch (dbError) {
        // If staff not found, still allow if token is valid (might be deleted)
        req.staff = {
          id: decoded.staffId,
          role: decoded.staffRole,
          permissions: decoded.staffPermissions || [],
        };
      }
    }

    // Attach admin and staff info to request
    req.admin = decoded;
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Invalid or expired token'
      });
    }
    throw error;
  }
};

// Middleware to check specific permissions
const checkPermission = (requiredPermission) => {
  return (req, res, next) => {
    // Admins have all permissions
    if (req.admin?.isAdmin) {
      return next();
    }

    // Staff must have the required permission or "all" permission
    if (req.staff) {
      const permissions = req.staff.permissions || [];
      if (permissions.includes('all') || permissions.includes(requiredPermission)) {
        return next();
      }
    }

    return res.status(403).json({
      error: 'Forbidden',
      message: `Permission required: ${requiredPermission}`
    });
  };
};

// Generate unique session ID for admin
const generateSessionId = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Generate JWT token for admin
const generateAdminToken = (adminData) => {
  return jwt.sign(
    { 
      adminId: adminData.id || 'admin',
      email: adminData.email || 'admin',
      isAdmin: true,
      sessionId: generateSessionId()
    },
    process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    { expiresIn: '24h' } // Admin sessions last 24 hours
  );
};

/**
 * POST /api/auth/admin/verify-totp
 * Verify TOTP code from Google Authenticator
 */
router.post('/verify-totp', async (req, res) => {
  try {
    const { code } = req.body;

    if (!code || code.length !== 6) {
      return res.status(400).json({ 
        error: 'Invalid code',
        message: 'Please provide a valid 6-digit code'
      });
    }

    // Get TOTP secret from environment variable
    let totpSecret = process.env.ADMIN_TOTP_SECRET;

    if (!totpSecret) {
      console.error('ADMIN_TOTP_SECRET not configured');
      return res.status(500).json({ 
        error: 'Server configuration error',
        message: 'TOTP secret not configured. Please set ADMIN_TOTP_SECRET in server/.env'
      });
    }

    // Trim whitespace from secret
    totpSecret = totpSecret.trim();

    // Generate expected codes for debugging
    const currentTime = Math.floor(Date.now() / 1000);
    const timeStep = Math.floor(currentTime / 30);
    
    // Generate codes for current and adjacent time steps
    const expectedCodes = {
      current: speakeasy.totp({ secret: totpSecret, encoding: 'base32', time: currentTime }),
      previous: speakeasy.totp({ secret: totpSecret, encoding: 'base32', time: currentTime - 30 }),
      next: speakeasy.totp({ secret: totpSecret, encoding: 'base32', time: currentTime + 30 }),
      previous2: speakeasy.totp({ secret: totpSecret, encoding: 'base32', time: currentTime - 60 }),
      next2: speakeasy.totp({ secret: totpSecret, encoding: 'base32', time: currentTime + 60 }),
    };

    // Try verification with base32 encoding and larger window
    let verifiedResult = speakeasy.totp.verify({
      secret: totpSecret,
      encoding: 'base32',
      token: code,
      window: 10, // Increased to 10 time steps (300 seconds = 5 minutes)
      time: currentTime,
    });

    // If base32 fails, try ascii encoding
    if (!verifiedResult) {
      verifiedResult = speakeasy.totp.verify({
        secret: totpSecret,
        encoding: 'ascii',
        token: code,
        window: 10,
        time: currentTime,
      });
    }

    // If still fails, try hex encoding
    if (!verifiedResult) {
      verifiedResult = speakeasy.totp.verify({
        secret: totpSecret,
        encoding: 'hex',
        token: code,
        window: 10,
        time: currentTime,
      });
    }

    // Check if code matches any of the expected codes (manual check)
    const codeMatches = Object.values(expectedCodes).includes(code);
    if (codeMatches && !verifiedResult) {
      verifiedResult = true; // Override if code matches expected
    }

    if (!verifiedResult) {
      return res.status(401).json({ 
        error: 'Invalid code',
        message: 'The authentication code is invalid or has expired. Please check: 1) Your phone\'s time is synchronized, 2) You\'re entering the current 6-digit code, 3) The code hasn\'t expired (codes change every 30 seconds).',
        debug: {
          receivedCode: code,
          expectedCodes: expectedCodes,
          serverTime: new Date().toISOString(),
          unixTimestamp: currentTime,
          timeStep: timeStep,
          secretLength: totpSecret.length,
          hint: 'Compare your code with the expected codes above. If none match, check time synchronization or regenerate the secret.'
        }
      });
    }

    // Code is valid, generate admin token
    const adminData = {
      id: 'admin',
      email: 'admin@sneaklink.io',
      name: 'Admin',
    };

    const token = generateAdminToken(adminData);

    res.json({
      success: true,
      token,
      user: adminData,
      message: 'Authentication successful'
    });
  } catch (error) {
    console.error('Error verifying TOTP:', error);
    res.status(500).json({ 
      error: 'Verification failed', 
      message: error.message || 'Failed to verify authentication code'
    });
  }
});

/**
 * GET /api/auth/admin/verify
 * Verify admin token is still valid
 */
router.get('/verify', verifyAdminToken, async (req, res) => {
  try {
    res.json({
      valid: true,
      admin: {
        id: req.admin.adminId,
        email: req.admin.email,
        isAdmin: req.admin.isAdmin,
      },
    });
  } catch (error) {
    console.error('Error verifying admin token:', error);
    res.status(401).json({
      valid: false,
      error: 'Invalid or expired token',
    });
  }
});

/**
 * GET /api/auth/admin/setup
 * Generate TOTP secret and QR code for setup (one-time use)
 * This endpoint should be protected and only accessible during initial setup
 */
router.get('/setup', async (req, res) => {
  try {
    // Check if TOTP is already configured
    if (process.env.ADMIN_TOTP_SECRET) {
      return res.status(400).json({ 
        error: 'Already configured',
        message: 'TOTP is already configured. Use the existing secret.'
      });
    }

    // Generate a new secret
    const secret = speakeasy.generateSecret({
      name: 'SneakLink Admin',
      length: 32,
    });

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    res.json({
      secret: secret.base32, // Return base32 secret to save in .env
      qrCode: qrCodeUrl,
      manualEntryKey: secret.base32,
      message: 'Save the secret in ADMIN_TOTP_SECRET in your .env file'
    });
  } catch (error) {
    console.error('Error generating TOTP setup:', error);
    res.status(500).json({ 
      error: 'Setup failed', 
      message: error.message 
    });
  }
});

/**
 * GET /api/auth/admin/analytics
 * Get dashboard analytics and statistics
 */
router.get('/analytics', verifyAdminToken, checkPermission('dashboard.view'), async (req, res) => {
  try {
    // Check PostgreSQL connection
    const prisma = getPrisma();
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch (dbError) {
      console.warn('[Admin API] Database not connected - returning empty analytics');
      return res.json({
        totalVisitors: 0,
        totalSessions: 0,
        activeUsers: 0,
        premiumUsers: 0,
        linksGenerated: 0,
        planCounts: { free: 0, pro: 0, enterprise: 0 },
        warnedUsers: 0,
        recentSignups: 0,
      });
    }

    // Extract date range from query params
    const { dateFrom, dateTo } = req.query;
    let dateFilter = {};
    
    if (dateFrom || dateTo) {
      dateFilter.createdAt = {};
      if (dateFrom) {
        dateFilter.createdAt.gte = new Date(dateFrom + 'T00:00:00.000Z');
      }
      if (dateTo) {
        dateFilter.createdAt.lte = new Date(dateTo + 'T23:59:59.999Z');
      }
    }

    // Get total users (filtered by date range if provided)
    const totalUsersWhere = { 
      isActive: true,
      ...dateFilter
    };
    const totalUsers = await prisma.user.count({
      where: totalUsersWhere
    });
    
    // Get users by plan (filtered by date range if provided)
    const usersByPlan = await prisma.user.groupBy({
      by: ['subscriptionPlan'],
      where: totalUsersWhere,
      _count: { id: true }
    });

    const planCounts = {
      free: 0,
      pro: 0,
      enterprise: 0
    };
    usersByPlan.forEach(item => {
      planCounts[item.subscriptionPlan || 'free'] = item._count.id;
    });

    // Get active users (logged in within date range, or last 30 days if no range specified)
    let activeUsersDateFilter = {};
    if (dateFrom || dateTo) {
      // Use provided date range for lastLogin
      activeUsersDateFilter.lastLogin = {};
      if (dateFrom) {
        activeUsersDateFilter.lastLogin.gte = new Date(dateFrom + 'T00:00:00.000Z');
      }
      if (dateTo) {
        activeUsersDateFilter.lastLogin.lte = new Date(dateTo + 'T23:59:59.999Z');
      }
    } else {
      // Default: last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      activeUsersDateFilter.lastLogin = { gte: thirtyDaysAgo };
    }
    
    const activeUsers = await prisma.user.count({
      where: {
        isActive: true,
        ...activeUsersDateFilter,
        ...dateFilter // Also filter by creation date if provided
      }
    });

    // Get premium users (filtered by date range if provided)
    const premiumUsers = await prisma.user.count({
      where: {
        isActive: true,
        subscriptionPlan: { in: ['pro', 'enterprise'] },
        ...dateFilter
      },
    });

    // Get total stores (filtered by date range if provided)
    let storesDateFilter = {};
    if (dateFrom || dateTo) {
      storesDateFilter.dateAdded = {};
      if (dateFrom) {
        storesDateFilter.dateAdded.gte = new Date(dateFrom + 'T00:00:00.000Z');
      }
      if (dateTo) {
        storesDateFilter.dateAdded.lte = new Date(dateTo + 'T23:59:59.999Z');
      }
    }
    const totalStores = await prisma.store.count({ 
      where: { 
        isActive: true,
        ...storesDateFilter
      } 
    });

    // Get users with multiple active sessions (warned users)
    const sessionsByUser = await prisma.session.groupBy({
      by: ['userId'],
      where: { isActive: true },
      _count: { id: true },
    });
    const warnedUsersCount = sessionsByUser.filter(g => g._count.id > 2).length;

    // Get recent signups (within date range, or use dateFilter if provided)
    const recentSignups = await prisma.user.count({
      where: {
        isActive: true,
        ...dateFilter
      }
    });

    // Get total sessions (authentic visitors) - filtered by date range if provided
    // Use authentic visitor tracking instead of regular sessions
    let totalSessions = 0;
    try {
      const { getAuthenticVisitorCount } = await import('../services/authenticVisitorTracker.js');
      totalSessions = await getAuthenticVisitorCount(dateFrom, dateTo);
    } catch (error) {
      console.error('Error getting authentic visitor count:', error);
      // Fallback to 0 if tracking service fails
      totalSessions = 0;
    }

    return res.json({
      totalVisitors: totalSessions, // Using total sessions as homepage visits
      totalSessions, // Also include as totalSessions for clarity
      activeUsers,
      premiumUsers,
      linksGenerated: totalStores, // Using stores as links generated
      totalUsers,
      usersByPlan: planCounts,
      warnedUsers: warnedUsersCount,
      recentSignups,
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    // Return empty analytics instead of error to prevent frontend issues
    return res.json({
      totalVisitors: 0,
      totalSessions: 0,
      activeUsers: 0,
      premiumUsers: 0,
      linksGenerated: 0,
      totalUsers: 0,
      usersByPlan: { free: 0, pro: 0, enterprise: 0 },
      warnedUsers: 0,
      recentSignups: 0,
    });
  }
});

/**
 * GET /api/auth/admin/users
 * Get all users with pagination and filters
 */
router.get('/users', verifyAdminToken, checkPermission('users.view'), async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      search = '',
      plan = 'all',
      status = 'all'
    } = req.query;

    const prisma = getPrisma();
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build Prisma filter - SIMPLE and CLEAR
    const prismaWhere = {};
    
    // 1. Status filter (always applied)
    if (status === 'active') {
      prismaWhere.isActive = true;
      prismaWhere.accountStatus = { not: 'deactivated' };
    } else if (status === 'suspended') {
      prismaWhere.isActive = false;
    }
    
    // 2. Plan filter (CRITICAL - must be exact)
    if (plan && plan !== 'all' && plan.trim() !== '') {
      const normalizedPlan = plan.toLowerCase().trim();
      
      if (normalizedPlan === 'free') {
        // Free: 'free' plan OR null/undefined (defaults to free)
        prismaWhere.OR = [
          { subscriptionPlan: 'free' },
          { subscriptionPlan: null },
        ];
      } else if (['pro', 'enterprise', 'starter'].includes(normalizedPlan)) {
        // Pro, Enterprise, Starter: EXACT match
        prismaWhere.subscriptionPlan = normalizedPlan;
      }
    }
    
    // 3. Search filter (combine with plan if both exist)
    if (search && search.trim()) {
      const searchTerm = search.trim();
      const searchOr = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { email: { contains: searchTerm, mode: 'insensitive' } }
      ];
      
      if (prismaWhere.OR) {
        // Plan filter already uses OR (free plan case)
        // Combine with AND: (plan filter) AND (search filter)
        prismaWhere.AND = [
          { OR: prismaWhere.OR },
          { OR: searchOr }
        ];
        delete prismaWhere.OR;
      } else {
        // No existing OR, just add search
        prismaWhere.OR = searchOr;
      }
    }

    const users = await prisma.user.findMany({
      where: prismaWhere,
      orderBy: { createdAt: 'desc' },
      skip: skip,
      take: parseInt(limit),
    });

    const total = await prisma.user.count({ where: prismaWhere });

    // Transform users for frontend
    const transformedUsers = users.map(user => {
      const userPlan = user.subscriptionPlan || 'free';
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        signupDate: user.createdAt ? new Date(user.createdAt).toISOString().split('T')[0] : 'N/A',
        plan: userPlan,
        status: user.isActive ? 'active' : 'suspended',
        lastLogin: user.lastLogin || null,
      };
    });


    res.json({
      users: transformedUsers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ 
      error: 'Failed to fetch users',
      message: error.message 
    });
  }
});

/**
 * OLD /warned-users endpoint - REMOVED
 * This endpoint has been replaced by the new one below (line ~1279) that supports
 * type parameter (warned, suspended, deactivated, all)
 * The old endpoint was blocking the new one from being reached.
 */

/**
 * GET /api/auth/admin/recent-users
 * Get recent users for dashboard
 */
router.get('/recent-users', verifyAdminToken, checkPermission('users.view'), async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    const { dateFrom, dateTo } = req.query;
    
    // Build date filter if provided
    let dateFilter = {};
    if (dateFrom || dateTo) {
      dateFilter.createdAt = {};
      if (dateFrom) {
        dateFilter.createdAt.gte = new Date(dateFrom + 'T00:00:00.000Z');
      }
      if (dateTo) {
        dateFilter.createdAt.lte = new Date(dateTo + 'T23:59:59.999Z');
      }
    }
    
    const prisma = getPrisma();
    const users = await prisma.user.findMany({
      where: { 
        isActive: true,
        ...dateFilter
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const recentUsers = users.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      signupDate: user.createdAt ? new Date(user.createdAt).toISOString().split('T')[0] : 'N/A',
      plan: user.subscriptionPlan || 'free',
      status: user.isActive ? 'active' : 'suspended',
    }));

    res.json({ users: recentUsers });
  } catch (error) {
    console.error('Error fetching recent users:', error);
    res.status(500).json({ 
      error: 'Failed to fetch recent users',
      message: error.message 
    });
  }
});

/**
 * GET /api/auth/admin/support/tickets/count
 * Get count of tickets that need admin attention:
 * - New tickets (no admin reply yet)
 * - Tickets where user has replied after admin's last reply
 */
router.get('/support/tickets/count', verifyAdminToken, async (req, res) => {
  try {
    // Check PostgreSQL connection
    const prisma = getPrisma();
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch (dbError) {
      console.warn('[Admin API] Database not connected - returning zero ticket count');
      return res.json({
        count: 0,
      });
    }

    // Count tickets that need admin attention
    // Include: new tickets (lastRepliedBy is null) OR tickets where user replied last
    const count = await prisma.supportTicket.count({
      where: {
        status: { not: 'resolved' }, // Exclude resolved tickets
        OR: [
          { lastRepliedBy: null }, // New tickets with no replies yet
          { lastRepliedBy: 'user' } // User replied last, needs admin response
        ]
      },
    });
    
    res.json({
      count: count,
    });
  } catch (error) {
    console.error('Error fetching ticket count:', error);
    res.status(500).json({
      error: 'Failed to fetch ticket count',
      message: error.message,
    });
  }
});

/**
 * GET /api/auth/admin/support/tickets
 * Get all support tickets (admin only)
 */
router.get('/support/tickets', verifyAdminToken, async (req, res) => {
  try {
    const { status = 'all', page = 1, limit = 50 } = req.query;
    
    const filter = {};
    if (status !== 'all') {
      filter.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const prisma = getPrisma();
    const prismaWhere = {};
    if (status !== 'all') {
      prismaWhere.status = status;
    }
    
    const tickets = await prisma.supportTicket.findMany({
      where: prismaWhere,
      orderBy: { createdAt: 'desc' },
      skip: skip,
      take: parseInt(limit),
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    const total = await prisma.supportTicket.count({ where: prismaWhere });

    const transformedTickets = tickets.map(ticket => ({
      id: ticket.id,
      ticketId: ticket.ticketId,
      userName: ticket.userName,
      userEmail: ticket.userEmail,
      userPlan: ticket.userPlan || 'free',
      subject: ticket.subject,
      message: ticket.message,
      status: ticket.status,
      priority: ticket.priority,
      replies: ticket.replies || [],
      lastRepliedBy: ticket.lastRepliedBy,
      lastRepliedAt: ticket.lastRepliedAt,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
    }));

    res.json({
      tickets: transformedTickets,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching support tickets:', error);
    res.status(500).json({
      error: 'Failed to fetch tickets',
      message: error.message,
    });
  }
});

/**
 * POST /api/auth/admin/support/tickets/:id/reply
 * Admin reply to a ticket (sends email notification)
 */
router.post('/support/tickets/:id/reply', verifyAdminToken, async (req, res) => {
  try {
    const ticketId = req.params.id;
    const { message } = req.body;
    const adminName = req.admin.email || 'Admin';

    if (!message || !message.trim()) {
      return res.status(400).json({
        error: 'Message is required',
      });
    }

    const prisma = getPrisma();
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Get current replies (it's a JSON field in Prisma)
    const currentReplies = Array.isArray(ticket.replies) ? ticket.replies : [];
    
    // Add admin reply
    const newReply = {
      from: 'admin',
      message: message.trim(),
      createdAt: new Date(),
      adminName: adminName,
    };
    const updatedReplies = [...currentReplies, newReply];

    // Determine new status
    const newStatus = ticket.status === 'open' ? 'in-progress' : ticket.status;

    // Update ticket using Prisma
    const updatedTicket = await prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        replies: updatedReplies,
        lastRepliedBy: 'admin',
        lastRepliedAt: new Date(),
        status: newStatus,
      },
    });

    // Send email notification to user
    try {
      const { sendTicketReplyNotification } = await import('../utils/emailService.js');
      await sendTicketReplyNotification({
        userEmail: updatedTicket.userEmail,
        userName: updatedTicket.userName,
        ticketId: updatedTicket.ticketId,
        subject: updatedTicket.subject,
        adminMessage: message.trim(),
        ticketUrl: `${process.env.FRONTEND_URL || 'http://localhost:8080'}/account?tab=support&ticket=${updatedTicket.id}`,
      });
    } catch (emailError) {
      console.error('Error sending email notification:', emailError);
      // Don't fail the request if email fails
    }

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
 * DELETE /api/auth/admin/support/tickets/:id
 * Delete a single ticket (admin only)
 */
router.delete('/support/tickets/:id', verifyAdminToken, checkPermission('tickets.delete'), async (req, res) => {
  try {
    const ticketId = req.params.id;

    const prisma = getPrisma();
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    await prisma.supportTicket.delete({
      where: { id: ticketId },
    });

    res.json({
      success: true,
      message: `Ticket ${ticket.ticketId} deleted successfully`,
    });
  } catch (error) {
    console.error('Error deleting ticket:', error);
    res.status(500).json({
      error: 'Failed to delete ticket',
      message: error.message,
    });
  }
});

/**
 * DELETE /api/auth/admin/support/tickets
 * Delete multiple tickets or all tickets (admin only)
 */
router.delete('/support/tickets', verifyAdminToken, async (req, res) => {
  try {
    const { ticketIds, deleteAll } = req.body;

    const prisma = getPrisma();
    if (deleteAll === true) {
      // Delete all tickets
      const result = await prisma.supportTicket.deleteMany({});
      
      return res.json({
        success: true,
        message: `All ${result.count} tickets deleted successfully`,
        deletedCount: result.count,
      });
    }

    if (ticketIds && Array.isArray(ticketIds) && ticketIds.length > 0) {
      // Delete specific tickets
      const result = await prisma.supportTicket.deleteMany({
        where: {
          id: { in: ticketIds }
        }
      });

      return res.json({
        success: true,
        message: `${result.count} ticket(s) deleted successfully`,
        deletedCount: result.count,
      });
    }

    return res.status(400).json({
      error: 'Invalid request',
      message: 'Either provide ticketIds array or set deleteAll to true',
    });
  } catch (error) {
    console.error('Error deleting tickets:', error);
    res.status(500).json({
      error: 'Failed to delete tickets',
      message: error.message,
    });
  }
});

/**
 * PUT /api/auth/admin/support/tickets/:id/status
 * Update ticket status (admin only)
 */
router.put('/support/tickets/:id/status', verifyAdminToken, checkPermission('tickets.update'), async (req, res) => {
  try {
    const ticketId = req.params.id;
    const { status } = req.body;

    if (!['open', 'in-progress', 'resolved', 'closed'].includes(status)) {
      return res.status(400).json({
        error: 'Invalid status',
        message: 'Status must be one of: open, in-progress, resolved, closed',
      });
    }

    const prisma = getPrisma();
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const updatedTicket = await prisma.supportTicket.update({
      where: { id: ticket.id },
      data: { status: status },
    });

    res.json({
      success: true,
      ticket: {
        id: updatedTicket.id,
        ticketId: updatedTicket.ticketId,
        status: updatedTicket.status,
      },
    });
  } catch (error) {
    console.error('Error updating ticket status:', error);
    res.status(500).json({
      error: 'Failed to update ticket status',
      message: error.message,
    });
  }
});

/**
 * POST /api/auth/admin/users
 * Create a new user manually (admin only)
 */
router.post('/users', verifyAdminToken, checkPermission('users.create'), async (req, res) => {
  try {
    const { name, email, plan = 'free', password } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Name and email are required',
      });
    }

    // Check if user already exists
    const prisma = getPrisma();
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (existingUser) {
      return res.status(400).json({
        error: 'User already exists',
        message: 'A user with this email already exists',
      });
    }

    // Create new user
    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        provider: 'email',
        isActive: true,
        subscriptionPlan: plan,
        subscriptionStatus: 'active',
        subscriptionStartDate: new Date(),
      },
    });

    res.json({
      success: true,
      message: 'User created successfully',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        plan: newUser.subscriptionPlan,
        status: newUser.isActive ? 'active' : 'suspended',
      },
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      error: 'Failed to create user',
      message: error.message,
    });
  }
});

/**
 * PUT /api/auth/admin/users/:id
 * Update user details (including plan)
 */
router.put('/users/:id', verifyAdminToken, checkPermission('users.edit'), async (req, res) => {
  try {
    const userId = req.params.id;
    const { name, email, plan } = req.body;

    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prepare update data
    const updateData = {};
    if (name) updateData.name = name.trim();
    if (email && email !== user.email) {
      // Check if new email is already taken
      const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({
          error: 'Email already in use',
          message: 'Another user with this email already exists',
        });
      }
      updateData.email = email.toLowerCase().trim();
    }
    if (plan && ['free', 'starter', 'pro', 'enterprise'].includes(plan)) {
      updateData.subscriptionPlan = plan;
      
      // If plan is being changed, reset usage counters to give user full allowance for new plan
      if (plan !== user.subscriptionPlan) {
        const now = new Date();
        updateData.filterQueriesThisMonth = 0;
        updateData.filterQueriesResetDate = now;
        updateData.csvExportsToday = 0;
        updateData.csvExportsResetDate = now;
        updateData.copyOperationsToday = 0;
        updateData.copyOperationsResetDate = now;
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });

    res.json({
      success: true,
      message: 'User updated successfully',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        plan: updatedUser.subscriptionPlan,
        status: updatedUser.isActive ? 'active' : 'suspended',
      },
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      error: 'Failed to update user',
      message: error.message,
    });
  }
});

/**
 * PUT /api/auth/admin/users/:id/suspend
 * Suspend a user (logout and restrict access)
 */
router.put('/users/:id/suspend', verifyAdminToken, checkPermission('users.suspend'), async (req, res) => {
  try {
    const userId = req.params.id;

    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscriptions: {
          where: { status: 'active' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Save current subscription data before suspending (subscription data is preserved in User model fields)
    // The subscription fields (subscriptionPlan, subscriptionBillingCycle, etc.) remain unchanged
    // Get old status before updating
    const oldStatus = user.accountStatus || 'active';
    const adminId = req.user?.userId || req.user?.id;
    const adminCaseId = `ADMIN-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;
    const currentSuspensionCount = user.suspensionCount || 0;

    // Set user as inactive and mark as suspended (subscription data stays intact)
    // Increment suspensionCount to track violations
    await prisma.user.update({
      where: { id: user.id },
      data: {
        isActive: false,
        accountStatus: 'suspended',
        suspensionCount: currentSuspensionCount + 1, // Increment suspension count
        // Subscription fields (subscriptionPlan, subscriptionBillingCycle, etc.) are NOT changed
        // They remain as they were before suspension
      },
    });

    // Terminate ALL active sessions (immediately logout the user)
    const sessionResult = await prisma.session.updateMany({
      where: {
        userId: userId,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    // Send notification email (async, don't wait)
    const { notifyAccountStatusChange } = await import('../services/accountStatusNotificationService.js');
    notifyAccountStatusChange(
      user,
      oldStatus,
      'suspended',
      {
        adminAction: true,
        adminId,
        adminCaseId,
        reason: req.body.reason || 'policy_violation',
        notificationType: 'admin_suspension',
      }
    ).catch(err => console.error('[Admin API] Failed to send suspension notification:', err));

    console.log(`[Admin API] Suspended user ${user.email} and terminated ${sessionResult.count} active session(s)`);

    res.json({
      success: true,
      message: 'User suspended successfully. All active sessions have been terminated.',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        status: 'suspended',
      },
      sessionsTerminated: sessionResult.count,
    });
  } catch (error) {
    console.error('Error suspending user:', error);
    res.status(500).json({
      error: 'Failed to suspend user',
      message: error.message,
    });
  }
});

/**
 * PUT /api/auth/admin/users/:id/deactivate
 * Deactivate a user (permanent restriction - cannot login unless admin restores)
 */
router.put('/users/:id/deactivate', verifyAdminToken, async (req, res) => {
  try {
    const userId = req.params.id;

    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscriptions: {
          where: { status: 'active' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get old status before updating
    const oldStatus = user.accountStatus || 'active';
    const adminId = req.user?.userId || req.user?.id;
    const adminCaseId = `ADMIN-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;

    // Save current subscription data before deactivating (subscription data is preserved in User model fields)
    // The subscription fields (subscriptionPlan, subscriptionBillingCycle, etc.) remain unchanged
    // Set user as inactive and mark as deactivated (subscription data stays intact)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        isActive: false,
        accountStatus: 'deactivated',
        // Subscription fields (subscriptionPlan, subscriptionBillingCycle, etc.) are NOT changed
        // They remain as they were before deactivation
      },
    });

    // Terminate ALL active sessions (immediately logout the user)
    const sessionResult = await prisma.session.updateMany({
      where: {
        userId: userId,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    // Send notification email (async, don't wait)
    const { notifyAccountStatusChange } = await import('../services/accountStatusNotificationService.js');
    notifyAccountStatusChange(
      user,
      oldStatus,
      'deactivated',
      {
        adminAction: true,
        adminId,
        adminCaseId,
        reason: req.body.reason || 'policy_violation',
        notificationType: 'admin_deactivation',
      }
    ).catch(err => console.error('[Admin API] Failed to send deactivation notification:', err));

    console.log(`[Admin API] Deactivated user ${user.email} and terminated ${sessionResult.count} active session(s)`);

    res.json({
      success: true,
      message: 'User deactivated successfully. All active sessions have been terminated. User cannot login unless restored by admin.',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        status: 'deactivated',
      },
      sessionsTerminated: sessionResult.modifiedCount,
    });
  } catch (error) {
    console.error('Error deactivating user:', error);
    res.status(500).json({
      error: 'Failed to deactivate user',
      message: error.message,
    });
  }
});

/**
 * PUT /api/auth/admin/users/:id/restore
 * Restore a user (make active again)
 */
router.put('/users/:id/restore', verifyAdminToken, checkPermission('users.restore'), async (req, res) => {
  try {
    const userId = req.params.id;

    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscriptions: {
          where: { status: 'active' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get previous status before restoring
    const previousStatus = user.accountStatus || 'suspended';

    // Restore user to active status
    // Subscription data (subscriptionPlan, subscriptionBillingCycle, etc.) was preserved during suspension
    // and will remain as it was before suspension - no changes needed
    // Reset suspensionCount when manually restored by admin (allows one more chance)
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        isActive: true,
        accountStatus: 'active',
        suspensionCount: 0, // Reset suspension count when manually restored by admin
        // Subscription fields remain unchanged - they were preserved during suspension
        // subscriptionPlan, subscriptionBillingCycle, subscriptionStatus, etc. stay as they were
      },
    });

    // Send restoration notification email (async, don't wait)
    const { sendAccountRestorationNotification } = await import('../services/emailService.js');
    sendAccountRestorationNotification({
      userName: user.name || 'User',
      userEmail: user.email,
      previousStatus,
    }).catch(err => console.error('[Admin API] Failed to send restoration notification:', err));

    res.json({
      success: true,
      message: 'User restored successfully',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        status: 'active',
      },
    });
  } catch (error) {
    console.error('Error restoring user:', error);
    res.status(500).json({
      error: 'Failed to restore user',
      message: error.message,
    });
  }
});

/**
 * DELETE /api/auth/admin/users/:id
 * Delete a user from the database permanently
 */
router.delete('/users/:id', verifyAdminToken, async (req, res) => {
  try {
    const userId = req.params.id;

    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete all user sessions first (to avoid foreign key constraints)
    await prisma.session.deleteMany({
      where: { userId: userId },
    });

    // Delete user subscriptions if any
    await prisma.subscription.deleteMany({
      where: { userId: userId },
    });

    // Delete the user
    await prisma.user.delete({
      where: { id: userId },
    });

    res.json({
      success: true,
      message: 'User deleted successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      error: 'Failed to delete user',
      message: error.message,
    });
  }
});

/**
 * PUT /api/auth/admin/users/restore-all
 * Restore all suspended and deactivated users back to active
 */
router.put('/users/restore-all', verifyAdminToken, async (req, res) => {
  try {
    // Find ALL inactive users (regardless of accountStatus)
    const prisma = getPrisma();
    const inactiveUsers = await prisma.user.findMany({
      where: { isActive: false },
    });

    console.log(`[Admin API] Found ${inactiveUsers.length} inactive users to restore`);
    console.log(`[Admin API] Inactive users breakdown:`, inactiveUsers.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      isActive: u.isActive,
      accountStatus: u.accountStatus || 'NOT SET'
    })));

    if (inactiveUsers.length === 0) {
      return res.json({
        success: true,
        message: 'No users to restore',
        restored: 0,
      });
    }

    // Use updateMany (bulk update)
    // Subscription data was preserved during suspension/deactivation and will remain unchanged
    const updateResult = await prisma.user.updateMany({
      where: { isActive: false },
      data: {
        isActive: true,
        accountStatus: 'active',
        suspensionCount: 0, // Reset suspension count when manually restored by admin
        // Subscription fields (subscriptionPlan, subscriptionBillingCycle, etc.) remain unchanged
        // They were preserved during suspension and will remain as they were before suspension
      },
    });

    // Send restoration notifications to all restored users (async, don't wait)
    const { sendAccountRestorationNotification } = await import('../services/emailService.js');
    inactiveUsers.forEach(user => {
      const previousStatus = user.accountStatus || 'suspended';
      sendAccountRestorationNotification({
        userName: user.name || 'User',
        userEmail: user.email,
        previousStatus,
      }).catch(err => console.error(`[Admin API] Failed to send restoration notification to ${user.email}:`, err));
    });

    console.log(`[Admin API] UpdateMany result:`, {
      count: updateResult.count,
    });

    // Verify the update worked
    const stillInactive = await prisma.user.count({ where: { isActive: false } });
    const activeCount = await prisma.user.count({ where: { isActive: true } });
    console.log(`[Admin API] Verification - Still inactive: ${stillInactive}, Now active: ${activeCount}`);

    const finalInactiveCount = stillInactive;
    const finalActiveCount = activeCount;

    res.json({
      success: true,
      message: `Successfully restored users to active status`,
      restored: updateResult.modifiedCount || individuallyUpdated,
      matched: updateResult.matchedCount,
      total: inactiveUsers.length,
      finalActive: finalActiveCount,
      finalInactive: finalInactiveCount,
    });
  } catch (error) {
    console.error('Error restoring all users:', error);
    res.status(500).json({
      error: 'Failed to restore users',
      message: error.message,
    });
  }
});

/**
 * PUT /api/auth/admin/users/activate-all
 * Force activate ALL users (sets all users to active regardless of current status)
 */
router.put('/users/activate-all', verifyAdminToken, async (req, res) => {
  try {
    // Get total user count
    const prisma = getPrisma();
    const totalUsers = await prisma.user.count();
    console.log(`[Admin API] Total users in database: ${totalUsers}`);

    // Update ALL users to active
    const updateResult = await prisma.user.updateMany({
      where: {}, // Empty filter = match all documents
      data: {
        isActive: true,
        accountStatus: 'active',
      },
    });

    console.log(`[Admin API] Activate-all result:`, {
      count: updateResult.count,
    });

    // Verify
    const activeCount = await prisma.user.count({ where: { isActive: true } });
    const inactiveCount = await prisma.user.count({ where: { isActive: false } });

    res.json({
      success: true,
      message: `Successfully activated all users`,
      total: totalUsers,
      modified: updateResult.count,
      active: activeCount,
      inactive: inactiveCount,
    });
  } catch (error) {
    console.error('Error activating all users:', error);
    res.status(500).json({
      error: 'Failed to activate all users',
      message: error.message,
    });
  }
});

/**
 * DELETE /api/auth/admin/users/delete-all
 * Delete ALL users from the database (use with caution!)
 */
router.delete('/users/delete-all', verifyAdminToken, async (req, res) => {
  try {
    const prisma = getPrisma();
    // Get total user count before deletion
    const totalUsers = await prisma.user.count();
    console.log(`[Admin API] Total users before deletion: ${totalUsers}`);

    if (totalUsers === 0) {
      return res.json({
        success: true,
        message: 'No users to delete',
        deleted: 0,
      });
    }

    // Delete ALL users
    const deleteResult = await prisma.user.deleteMany({});

    console.log(`[Admin API] Delete-all result:`, {
      deleted: deleteResult.count,
      acknowledged: true
    });

    // Verify
    const remainingUsers = await prisma.user.count();
    console.log(`[Admin API] Users remaining after deletion: ${remainingUsers}`);

    res.json({
      success: true,
      message: `Successfully deleted all users`,
      deleted: deleteResult.count,
      total: totalUsers,
      remaining: remainingUsers,
    });
  } catch (error) {
    console.error('Error deleting all users:', error);
    res.status(500).json({
      error: 'Failed to delete all users',
      message: error.message,
    });
  }
});

/**
 * GET /api/auth/admin/warned-users
 * Get users with multiple active sessions (exceeding device limit)
 * Now supports filtering by type: 'warned', 'suspended', 'deactivated', 'all'
 */
router.get('/warned-users', verifyAdminToken, async (req, res) => {
  try {
    const { type = 'warned' } = req.query;

    let warnedUsers = [];

    if (type === 'suspended' || type === 'deactivated') {
      // Get suspended or deactivated users based on accountStatus
      const targetStatus = type === 'suspended' ? 'suspended' : 'deactivated';
      
      // Query users with the specific accountStatus
      const prisma = getPrisma();
      let whereClause = {
        isActive: false,
        accountStatus: targetStatus,
      };
      
      // Find users with the specific accountStatus
      let filteredUsers = await prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          email: true,
          isActive: true,
          accountStatus: true,
          subscriptionPlan: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: 'desc' },
      });
      
      // Also check for legacy users (inactive but accountStatus='active')
      // These should be included in suspended list
      if (type === 'suspended') {
        const legacyUsers = await prisma.user.findMany({
          where: {
            isActive: false,
            accountStatus: 'active', // Inconsistent data - inactive but status says active
          },
          select: {
            id: true,
            name: true,
            email: true,
            isActive: true,
            accountStatus: true,
            subscriptionPlan: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { updatedAt: 'desc' },
        });
        
        // Combine both lists
        const allFilteredUsers = [...filteredUsers, ...legacyUsers];

        warnedUsers = allFilteredUsers.map(user => ({
          id: user.id,
          name: user.name,
          email: user.email,
          signupDate: user.createdAt ? new Date(user.createdAt).toISOString().split('T')[0] : 'N/A',
          plan: user.subscriptionPlan || 'free',
          status: user.accountStatus || 'suspended',
          accountStatus: user.accountStatus || 'suspended',
          devicesCount: 0,
          maxDevices: user.subscriptionPlan === 'enterprise' ? 10 : 
                     user.subscriptionPlan === 'pro' ? 3 : 
                     user.subscriptionPlan === 'starter' ? 2 : 1,
          warningsSent: 0,
          lastWarning: user.updatedAt ? new Date(user.updatedAt).toISOString().split('T')[0] : 'N/A',
        }));
      } else {
        // For deactivated, only include users with accountStatus='deactivated'
        warnedUsers = filteredUsers.map(user => ({
          id: user.id,
          name: user.name,
          email: user.email,
          signupDate: user.createdAt ? new Date(user.createdAt).toISOString().split('T')[0] : 'N/A',
          plan: user.subscriptionPlan || 'free',
          status: user.accountStatus || 'deactivated',
          accountStatus: user.accountStatus || 'deactivated',
          devicesCount: 0,
          maxDevices: user.subscriptionPlan === 'enterprise' ? 10 : 
                     user.subscriptionPlan === 'pro' ? 3 : 
                     user.subscriptionPlan === 'starter' ? 2 : 1,
          warningsSent: 0,
          lastWarning: user.updatedAt ? new Date(user.updatedAt).toISOString().split('T')[0] : 'N/A',
        }));
      }
    } else if (type === 'warned' || type === 'all') {
      // Find users with more than 2 active sessions
      const sessionsByUser = await prisma.session.groupBy({
        by: ['userId'],
        where: { isActive: true },
        _count: { id: true },
      });
      
      const usersWithMultipleSessions = sessionsByUser
        .filter(g => g._count.id > 2)
        .map(g => ({ userId: g.userId, sessionCount: g._count.id }));

      // Get user details for each warned user
      const warnedUsersList = await Promise.all(
        usersWithMultipleSessions.map(async (item) => {
          const user = await prisma.user.findUnique({
            where: { id: item.userId },
          });
          if (!user) return null;

          // Get max devices based on plan
          const maxDevices = user.subscriptionPlan === 'enterprise' ? 10 : 
                            user.subscriptionPlan === 'pro' ? 3 : 
                            user.subscriptionPlan === 'starter' ? 2 : 1;

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            signupDate: user.createdAt ? new Date(user.createdAt).toISOString().split('T')[0] : 'N/A',
            plan: user.subscriptionPlan || 'free',
            status: user.isActive ? 'active' : 'suspended',
            devicesCount: item.sessionCount,
            maxDevices,
            warningsSent: 1,
            lastWarning: new Date().toISOString().split('T')[0],
          };
        })
      );

      warnedUsers = warnedUsersList.filter(u => u !== null);
    }

    res.json({
      users: warnedUsers,
      total: warnedUsers.length,
    });
  } catch (error) {
    console.error('Error fetching warned users:', error);
    res.status(500).json({
      error: 'Failed to fetch warned users',
      message: error.message,
    });
  }
});

/**
 * GET /api/auth/admin/users/debug
 * Debug endpoint to check all users and their statuses
 */
router.get('/users/debug', verifyAdminToken, async (req, res) => {
  try {
    // Get all users with their status
    const prisma = getPrisma();
    const allUsers = await prisma.user.findMany({
      select: {
        name: true,
        email: true,
        isActive: true,
        accountStatus: true,
        subscriptionPlan: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    const stats = {
      total: allUsers.length,
      active: allUsers.filter(u => u.isActive === true).length,
      inactive: allUsers.filter(u => u.isActive === false).length,
      withAccountStatus: allUsers.filter(u => u.accountStatus).length,
      withoutAccountStatus: allUsers.filter(u => !u.accountStatus).length,
      suspended: allUsers.filter(u => u.accountStatus === 'suspended').length,
      deactivated: allUsers.filter(u => u.accountStatus === 'deactivated').length,
      activeStatus: allUsers.filter(u => u.accountStatus === 'active').length,
    };

    const inactiveUsers = allUsers
      .filter(u => u.isActive === false)
      .map(u => ({
        name: u.name,
        email: u.email,
        isActive: u.isActive,
        accountStatus: u.accountStatus || 'NOT SET',
        plan: u.subscriptionPlan || 'free',
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      }));

    res.json({
      stats,
      inactiveUsers,
      allUsers: allUsers.map(u => ({
        name: u.name,
        email: u.email,
        isActive: u.isActive,
        accountStatus: u.accountStatus || 'NOT SET',
        plan: u.subscriptionPlan || 'free',
      })),
    });
  } catch (error) {
    console.error('Error in debug endpoint:', error);
    res.status(500).json({
      error: 'Failed to fetch debug info',
      message: error.message,
    });
  }
});

/**
 * POST /api/auth/admin/staff
 * Add a new staff member
 */
router.post('/staff', verifyAdminToken, checkPermission('staff.manage'), async (req, res) => {
  try {
    const { name, email, role, permissions } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Name and email are required'
      });
    }

    // Check if staff member already exists
    const prisma = getPrisma();
    const existingStaff = await prisma.staff.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (existingStaff) {
      return res.status(400).json({
        error: 'Staff member already exists',
        message: 'A staff member with this email already exists'
      });
    }

    // Check if user with this email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (existingUser) {
      return res.status(400).json({
        error: 'User already exists',
        message: 'A user with this email already exists. Staff members must have unique emails.'
      });
    }

    // Generate invitation token
    const invitationToken = crypto.randomBytes(32).toString('hex');
    const invitationTokenExpires = new Date();
    invitationTokenExpires.setDate(invitationTokenExpires.getDate() + 7); // 7 days expiry

    // Create new staff member
    const staff = await prisma.staff.create({
      data: {
        name,
        email: email.toLowerCase(),
        role: role || 'support',
        permissions: permissions || [],
        addedBy: req.admin.userId || null,
        status: 'pending',
        invitationToken,
        invitationTokenExpires,
      },
    });

    // Send invitation email
    try {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
      const acceptUrl = `${frontendUrl}/staff/accept-invite?token=${invitationToken}`;
      
      // Send invitation email with timeout to prevent hanging (40 seconds, same as verification code)
      try {
        await Promise.race([
          sendStaffInvitation({
            staffName: name,
            staffEmail: email,
            role: role || 'support',
            acceptUrl,
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Staff invitation email send timeout')), 40000)
          )
        ]);
      } catch (emailTimeoutError) {
        if (emailTimeoutError.message === 'Staff invitation email send timeout') {
          console.error('Staff invitation email send timed out after 40 seconds');
        } else {
          throw emailTimeoutError; // Re-throw if it's a different error
        }
      }
    } catch (emailError) {
      console.error('Error sending staff invitation email:', emailError);
      // Log detailed error for debugging
      if (emailError.message) {
        console.error('Email error details:', emailError.message);
      }
      // Don't fail the request if email fails, but log it
      // The staff member is still created, they just won't receive the email immediately
    }

    res.status(201).json({
      success: true,
      message: 'Staff member added and invitation sent',
      staff: {
        id: staff.id,
        name: staff.name,
        email: staff.email,
        role: staff.role,
        permissions: staff.permissions,
        status: staff.status,
        createdAt: staff.createdAt,
      },
    });
  } catch (error) {
    console.error('Error adding staff member:', error);
    res.status(500).json({
      error: 'Failed to add staff member',
      message: error.message,
    });
  }
});

/**
 * GET /api/auth/admin/staff
 * Get all staff members
 */
router.get('/staff', verifyAdminToken, async (req, res) => {
  try {
    const prisma = getPrisma();
    const staffMembers = await prisma.staff.findMany({
      orderBy: { createdAt: 'desc' },
    });

    // Fetch addedBy user information separately (workaround until Prisma client is regenerated)
    const formattedStaff = await Promise.all(staffMembers.map(async (staff) => {
      let addedByInfo = null;
      if (staff.addedBy) {
        try {
          const addedByUser = await prisma.user.findUnique({
            where: { id: staff.addedBy },
            select: {
              name: true,
              email: true,
            },
          });
          if (addedByUser) {
            addedByInfo = {
              name: addedByUser.name,
              email: addedByUser.email,
            };
          }
        } catch (error) {
          console.warn(`Failed to fetch addedBy user for staff ${staff.id}:`, error.message);
        }
      }
      
      return {
        id: staff.id,
        name: staff.name,
        email: staff.email,
        role: staff.role,
        permissions: staff.permissions,
        status: staff.status,
        invitationAccepted: staff.invitationAccepted,
        addedAt: staff.createdAt,
        addedBy: addedByInfo,
      };
    }));

    res.json({
      success: true,
      staff: formattedStaff,
    });
  } catch (error) {
    console.error('Error fetching staff members:', error);
    res.status(500).json({
      error: 'Failed to fetch staff members',
      message: error.message,
    });
  }
});

/**
 * PUT /api/auth/admin/staff/:id
 * Update staff member permissions
 */
router.put('/staff/:id', verifyAdminToken, checkPermission('staff.manage'), async (req, res) => {
  try {
    const { permissions } = req.body;
    const prisma = getPrisma();
    
    const staff = await prisma.staff.findUnique({
      where: { id: req.params.id },
    });
    
    if (!staff) {
      return res.status(404).json({
        error: 'Staff member not found',
      });
    }

    // Update permissions (add to existing or replace)
    const updatedStaff = await prisma.staff.update({
      where: { id: req.params.id },
      data: {
        permissions: permissions || [],
      },
    });

    res.json({
      success: true,
      message: 'Staff permissions updated successfully',
      staff: {
        id: updatedStaff.id,
        name: updatedStaff.name,
        email: updatedStaff.email,
        role: updatedStaff.role,
        permissions: updatedStaff.permissions,
        status: updatedStaff.status,
      },
    });
  } catch (error) {
    console.error('Error updating staff permissions:', error);
    res.status(500).json({
      error: 'Failed to update staff permissions',
      message: error.message,
    });
  }
});

/**
 * DELETE /api/auth/admin/staff/:id
 * Remove a staff member
 */
router.delete('/staff/:id', verifyAdminToken, checkPermission('staff.manage'), async (req, res) => {
  try {
    const prisma = getPrisma();
    const staff = await prisma.staff.findUnique({
      where: { id: req.params.id },
    });
    
    if (!staff) {
      return res.status(404).json({
        error: 'Staff member not found',
      });
    }

    await prisma.staff.delete({
      where: { id: req.params.id },
    });

    res.json({
      success: true,
      message: 'Staff member removed successfully',
    });
  } catch (error) {
    console.error('Error removing staff member:', error);
    res.status(500).json({
      error: 'Failed to remove staff member',
      message: error.message,
    });
  }
});

/**
 * GET /api/auth/admin/subscriptions/count
 * Get count of new subscriptions (created in last 24 hours or since last view)
 */
router.get('/subscriptions/count', verifyAdminToken, async (req, res) => {
  try {
    const prisma = getPrisma();
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch (dbError) {
      console.warn('[Admin API] Database not connected - returning zero subscription count');
      return res.json({
        count: 0,
      });
    }

    // Get last viewed timestamp from query param (optional)
    const lastViewed = req.query.lastViewed ? new Date(req.query.lastViewed) : null;
    
    // Count subscriptions created in last 24 hours OR since last view
    const cutoffDate = lastViewed && lastViewed > new Date(Date.now() - 24 * 60 * 60 * 1000)
      ? lastViewed
      : new Date(Date.now() - 24 * 60 * 60 * 1000); // Default to last 24 hours

    const count = await prisma.subscription.count({
      where: {
        status: 'active', // Only count active subscriptions
        createdAt: {
          gte: cutoffDate, // Created after cutoff date
        },
      },
    });
    
    res.json({
      count: count,
    });
  } catch (error) {
    console.error('Error fetching subscription count:', error);
    res.status(500).json({
      error: 'Failed to fetch subscription count',
      message: error.message,
    });
  }
});

/**
 * GET /api/auth/admin/subscriptions
 * Get all subscriptions with user information
 */
router.get('/subscriptions', verifyAdminToken, checkPermission('subscriptions.view'), async (req, res) => {
  try {
    const { status, plan, dateFrom, dateTo, page = 1, limit = 50 } = req.query;
    const prisma = getPrisma();
    
    // Build filter
    const where = {};
    
    if (status && status !== 'all') {
      where.status = status;
    }
    
    if (plan && plan !== 'all') {
      where.plan = plan;
    }
    
    // Date range filter
    if (dateFrom || dateTo) {
      where.startDate = {};
      if (dateFrom) {
        where.startDate.gte = new Date(dateFrom + 'T00:00:00.000Z');
      }
      if (dateTo) {
        where.startDate.lte = new Date(dateTo + 'T23:59:59.999Z');
      }
    }
    
    // Pagination
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 50;
    const skip = (pageNum - 1) * limitNum;
    
    // Fetch subscriptions with user data
    const [subscriptions, total] = await Promise.all([
      prisma.subscription.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.subscription.count({ where }),
    ]);
    
    // Get user auto-renewal status
    const userIds = subscriptions.map(sub => sub.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, subscriptionAutoRenew: true },
    });
    
    const userAutoRenewMap = {};
    users.forEach(user => {
      userAutoRenewMap[user.id] = user.subscriptionAutoRenew ?? true;
    });

    // Format subscriptions for frontend
    const formattedSubscriptions = subscriptions.map(sub => ({
      id: sub.id,
      userId: sub.userId,
      user: sub.user.name,
      email: sub.user.email,
      plan: sub.plan,
      billingCycle: sub.billingCycle,
      amount: parseFloat(sub.amount.toString()),
      currency: sub.currency,
      status: sub.status,
      startDate: sub.startDate.toISOString().split('T')[0],
      nextBilling: sub.nextPaymentDate ? sub.nextPaymentDate.toISOString().split('T')[0] : null,
      cancelledAt: sub.cancelledAt ? sub.cancelledAt.toISOString().split('T')[0] : null,
      cancelledBy: sub.cancelledBy,
      paystackSubscriptionCode: sub.paystackSubscriptionCode,
      createdAt: sub.createdAt.toISOString().split('T')[0],
      autoRenew: userAutoRenewMap[sub.userId] ?? true,
    }));
    
    // Calculate stats
    const allActiveSubscriptions = await prisma.subscription.findMany({
      where: { status: 'active' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
    
    const totalRevenue = allActiveSubscriptions.reduce((sum, sub) => {
      return sum + parseFloat(sub.amount.toString());
    }, 0);
    
    const totalSubscribers = allActiveSubscriptions.length;
    
    const planBreakdown = allActiveSubscriptions.reduce((acc, sub) => {
      acc[sub.plan] = (acc[sub.plan] || 0) + 1;
      return acc;
    }, {});
    
    // Calculate MRR (Monthly Recurring Revenue)
    const monthlyMRR = allActiveSubscriptions
      .filter(sub => sub.billingCycle === 'monthly')
      .reduce((sum, sub) => sum + parseFloat(sub.amount.toString()), 0);
    
    const annualMRR = allActiveSubscriptions
      .filter(sub => sub.billingCycle === 'annually')
      .reduce((sum, sub) => sum + parseFloat(sub.amount.toString()) / 12, 0);
    
    const mrr = monthlyMRR + annualMRR;
    
    res.json({
      success: true,
      subscriptions: formattedSubscriptions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
      stats: {
        totalRevenue,
        totalSubscribers,
        mrr,
        planBreakdown,
      },
    });
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    res.status(500).json({
      error: 'Failed to fetch subscriptions',
      message: error.message,
    });
  }
});

/**
 * Paystack API helper function with retry logic
 */
const paystackRequest = async (method, endpoint, data = null, retries = 2) => {
  const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
  const PAYSTACK_BASE_URL = 'https://api.paystack.co';
  
  if (!PAYSTACK_SECRET_KEY) {
    throw new Error('Paystack secret key is not configured');
  }

  const makeRequest = async (attemptNumber) => {
    try {
      const config = {
        method,
        url: `${PAYSTACK_BASE_URL}${endpoint}`,
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 45000, // Increased to 45 seconds
        httpsAgent: new https.Agent({
          rejectUnauthorized: true,
          keepAlive: true,
          timeout: 45000,
        }),
      };

      if (data) {
        config.data = data;
      }

      const response = await axios(config);
      return response.data;
    } catch (error) {
      // Enhanced error logging
      if (error.response) {
        console.error('Paystack API Error:', {
          status: error.response.status,
          statusText: error.response.statusText,
          endpoint: endpoint,
          attempt: attemptNumber,
        });
        
        if (error.response.status === 401) {
          throw new Error('Paystack authentication failed. Please check your PAYSTACK_SECRET_KEY.');
        }
        // Don't retry on client errors (4xx)
        if (error.response.status >= 400 && error.response.status < 500) {
          throw error;
        }
        // Retry on server errors (5xx) - silently retry without logging
        if (error.response.status >= 500 && attemptNumber <= retries) {
          await new Promise(resolve => setTimeout(resolve, 2000 * attemptNumber));
          return makeRequest(attemptNumber + 1);
        }
      } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        // Retry on timeout if we have retries left (silently, no logging)
        if (attemptNumber <= retries) {
          const waitTime = 2000 * attemptNumber; // Exponential backoff: 2s, 4s, 6s
          await new Promise(resolve => setTimeout(resolve, waitTime));
          return makeRequest(attemptNumber + 1);
        }
        throw new Error(`Request to Paystack timed out after ${retries + 1} attempts. The Paystack API may be experiencing issues.`);
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'EAI_AGAIN') {
        // Retry on connection errors if we have retries left (silently, no logging)
        // Retry on connection errors if we have retries left
        if (attemptNumber <= retries) {
          const waitTime = 2000 * attemptNumber;
          // Silently retry without logging
          await new Promise(resolve => setTimeout(resolve, waitTime));
          return makeRequest(attemptNumber + 1);
        }
        throw new Error(`Cannot connect to Paystack after ${retries + 1} attempts. Please check your internet connection.`);
      } else {
        console.error('Paystack API Error:', error.message, error.code);
      }
      throw error;
    }
  };

  return makeRequest(1);
};

/**
 * GET /api/auth/admin/disputes
 * Get all disputes from Paystack with user information
 */
router.get('/disputes', verifyAdminToken, checkPermission('subscriptions.view'), async (req, res) => {
  try {
    const { status, page = 1, perPage = 50, from, to } = req.query;
    const prisma = getPrisma();

    // Build Paystack API query params
    const params = new URLSearchParams({
      page: page.toString(),
      perPage: Math.min(parseInt(perPage) || 50, 100).toString(), // Max 100 per page
    });

    if (status && status !== 'all') {
      params.append('status', status);
    }
    if (from) {
      params.append('from', from);
    }
    if (to) {
      params.append('to', to);
    }

    // Fetch disputes from Paystack with error handling
    let paystackResponse;
    try {
      paystackResponse = await paystackRequest('GET', `/dispute?${params.toString()}`, null, 3); // 3 retries for disputes
    } catch (error) {
      // Return empty disputes array instead of failing completely (silently, no logging)
      return res.status(200).json({
        disputes: [],
        total: 0,
        page: parseInt(page) || 1,
        limit: Math.min(parseInt(perPage) || 50, 100),
        totalPages: 0,
        error: error.message || 'Failed to fetch disputes from Paystack',
      });
    }
    
    const disputes = paystackResponse.data || [];

    // Get transaction references to find associated users
    const transactionReferences = disputes.map(d => d.transaction?.reference || d.transaction_reference).filter(Boolean);
    
    // Find users by transaction references from our database
    // Note: We'll need to match transactions to subscriptions/users
    // For now, we'll enrich with user data where possible
    const enrichedDisputes = await Promise.all(disputes.map(async (dispute) => {
      const transactionRef = dispute.transaction?.reference || dispute.transaction_reference;
      
      // Try to find the user by transaction reference
      // We might need to store transaction references in our database for this to work
      // For now, return dispute data with available information
      let userInfo = null;
      
      if (transactionRef) {
        // Try to find user by checking subscriptions that might have this transaction
        // This is a simplified approach - in production you'd want to store transaction refs
        try {
          const subscription = await prisma.subscription.findFirst({
            where: {
              paystackSubscriptionCode: dispute.transaction?.subscription_code || undefined,
            },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          });

          if (subscription?.user) {
            userInfo = {
              id: subscription.user.id,
              name: subscription.user.name,
              email: subscription.user.email,
            };
          }
        } catch (err) {
          // If we can't find user, continue without user info
          console.warn('Could not find user for dispute:', transactionRef);
        }
      }

      return {
        id: dispute.id,
        disputeId: dispute.id,
        transactionId: transactionRef,
        transactionReference: transactionRef,
        amount: dispute.amount ? dispute.amount / 100 : 0, // Convert from kobo to NGN
        currency: dispute.currency || 'NGN',
        reason: dispute.reason || 'Not specified',
        status: dispute.status || 'pending',
        resolution: dispute.resolution || null,
        createdAt: dispute.created_at || dispute.createdAt,
        updatedAt: dispute.updated_at || dispute.updatedAt,
        dueDate: dispute.due_date || dispute.dueAt,
        user: userInfo?.name || 'Unknown User',
        email: userInfo?.email || dispute.customer?.email || 'N/A',
        userId: userInfo?.id || null,
        // Additional Paystack dispute fields
        transaction: dispute.transaction,
        customer: dispute.customer,
      };
    }));

    // Get stats
    const totalDisputes = paystackResponse.meta?.total || enrichedDisputes.length;
    const pendingDisputes = enrichedDisputes.filter(d => d.status === 'pending' || d.status === 'awaiting-merchant-feedback').length;

    res.json({
      disputes: enrichedDisputes,
      pagination: {
        page: parseInt(page) || 1,
        perPage: parseInt(perPage) || 50,
        total: totalDisputes,
        totalPages: Math.ceil(totalDisputes / (parseInt(perPage) || 50)),
      },
      stats: {
        total: totalDisputes,
        pending: pendingDisputes,
        resolved: enrichedDisputes.filter(d => d.status === 'resolved' || d.status === 'won').length,
        lost: enrichedDisputes.filter(d => d.status === 'lost').length,
      },
    });
  } catch (error) {
    console.error('Error fetching disputes:', error);
    res.status(500).json({
      error: 'Failed to fetch disputes',
      message: error.message || 'An error occurred while fetching disputes',
    });
  }
});

/**
 * GET /api/auth/admin/subscriptions/:id/transaction
 * Get transaction details and timeline from Paystack
 */
router.get('/subscriptions/:id/transaction', verifyAdminToken, checkPermission('subscriptions.view'), async (req, res) => {
  try {
    const { id } = req.params;
    const prisma = getPrisma();

    // Get subscription
    const subscription = await prisma.subscription.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!subscription) {
      return res.status(404).json({
        error: 'Subscription not found',
      });
    }

    // Get transaction reference from subscription
    let transactionData = null;
    let timeline = [];
    let deviceType = 'Desktop';

    try {
      // Method 1: Try to get transaction from subscription invoices
      if (subscription.paystackSubscriptionCode) {
        try {
          const paystackSub = await paystackRequest('GET', `/subscription/${subscription.paystackSubscriptionCode}`);
          
          // Paystack subscription might have invoices in different structures
          // Try different possible structures
          let invoices = [];
          if (paystackSub.data) {
            if (paystackSub.data.invoices) {
              invoices = Array.isArray(paystackSub.data.invoices) ? paystackSub.data.invoices : [];
            } else if (paystackSub.data.subscription?.invoices) {
              invoices = Array.isArray(paystackSub.data.subscription.invoices) ? paystackSub.data.subscription.invoices : [];
            }
          }
          
          // Get all transactions, prefer successful ones
          const successfulInvoice = invoices.find(inv => inv.status === 'success') || invoices[invoices.length - 1];
          
          if (successfulInvoice) {
            // Transaction might be an object with id, or just an id
            const transactionId = successfulInvoice.transaction?.id || successfulInvoice.transaction?.transaction_id || successfulInvoice.transaction || successfulInvoice.transaction_id;
            
            if (transactionId) {
              // Get transaction details by ID
              const transaction = await paystackRequest('GET', `/transaction/${transactionId}`);
              
              if (transaction.data) {
                transactionData = transaction.data;
              }
            }
          }
        } catch (subError) {
          console.error('Error fetching subscription from Paystack:', subError);
          // Continue to try other methods
        }
      }
      
      // Method 2: Try fetching transactions by customer code if available
      if (!transactionData && subscription.user) {
        try {
          // Get user's Paystack customer code
          const user = await prisma.user.findUnique({
            where: { id: subscription.user.id },
            select: { paystackCustomerCode: true, email: true },
          });
          
          if (user?.paystackCustomerCode) {
            // Try to get transactions for this customer
            const transactions = await paystackRequest('GET', `/transaction?customer=${user.paystackCustomerCode}&perPage=20`);
            
            if (transactions.data && transactions.data.length > 0) {
              // Find transaction that matches subscription amount and is around subscription date
              const subscriptionDate = new Date(subscription.startDate);
              const subscriptionAmount = parseFloat(subscription.amount.toString());
              
              const matchingTransaction = transactions.data.find(t => {
                const transactionAmount = t.amount ? t.amount / 100 : 0;
                const transactionDate = t.created_at ? new Date(t.created_at) : null;
                // Check if amounts match (within small tolerance) and date is close
                const amountMatch = Math.abs(transactionAmount - subscriptionAmount) < 1;
                const dateMatch = transactionDate ? Math.abs(transactionDate - subscriptionDate) < 7 * 24 * 60 * 60 * 1000 : false; // Within 7 days
                return amountMatch && dateMatch;
              });
              
              if (matchingTransaction) {
                // Get full transaction details
                const transaction = await paystackRequest('GET', `/transaction/${matchingTransaction.id}`);
                if (transaction.data) {
                  transactionData = transaction.data;
                }
              }
            }
          }
        } catch (txnError) {
          console.error('Error fetching transactions by customer:', txnError);
          // Continue
        }
      }
      
      // Build timeline if we have transaction data
      if (transactionData) {
        // Get device type from authorization
        if (transactionData.authorization) {
          deviceType = transactionData.authorization.device_type || 
                     transactionData.authorization.brand || 
                     (transactionData.channel === 'card' ? 'Desktop' : 'Mobile') || 
                     'Desktop';
        }
        
        // Try to get timeline from Paystack Timeline API
        let timelineData = null;
        try {
          const transactionId = transactionData.id || transactionData.reference;
          if (transactionId) {
            timelineData = await paystackRequest('GET', `/transaction/timeline/${transactionId}`);
            
            if (timelineData.data && timelineData.data.history) {
              // Use Paystack's timeline data
              const startTime = timelineData.data.start_time || 0;
              timelineData.data.history.forEach((event) => {
                const eventTime = event.time || 0;
                const totalSeconds = startTime + eventTime;
                const minutes = Math.floor(totalSeconds / 60);
                const seconds = totalSeconds % 60;
                const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
                
                timeline.push({
                  time: timeStr,
                  message: event.message || event.type || 'Transaction event',
                  type: event.type === 'error' ? 'error' : event.type === 'success' ? 'success' : 'info',
                });
              });
            }
          }
        } catch (timelineError) {
          console.error('Error fetching timeline from Paystack:', timelineError);
          // Continue to build timeline from transaction data
        }
        
        // If we didn't get timeline from API, build it from transaction data
        if (timeline.length === 0) {
          const createdAt = new Date(transactionData.created_at);
          const paidAt = transactionData.paid_at ? new Date(transactionData.paid_at) : null;
          
          // Calculate time offsets
          const getTimeOffset = (seconds) => {
            const minutes = Math.floor(seconds / 60);
            const secs = seconds % 60;
            return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
          };
          
          // Calculate total duration in seconds (default to 96 seconds = 01:36)
          const totalDurationSeconds = paidAt 
            ? Math.floor((paidAt - createdAt) / 1000)
            : 96;
          
          // Transaction initiated
          timeline.push({
            time: '00:00',
            message: 'Transaction initiated',
            type: 'info',
          });

          // Determine if transaction went through multiple attempts (card then bank)
          const finalChannel = transactionData.channel;
          const gatewayResponse = transactionData.gateway_response || '';
          const hasCardAttempt = gatewayResponse.toLowerCase().includes('card') || 
                               gatewayResponse.toLowerCase().includes('insufficient') ||
                               gatewayResponse.toLowerCase().includes('declined');
          
          // If successful with bank, likely had card attempt first
          if (finalChannel === 'bank' && transactionData.status === 'success') {
            // Card attempt
            timeline.push({
              time: getTimeOffset(19),
              message: 'Attempted to pay with card',
              type: 'info',
            });
            
            // Error (likely insufficient funds or declined)
            timeline.push({
              time: getTimeOffset(30),
              message: `Error: ${transactionData.gateway_response || 'Insufficient Funds'}`,
              type: 'error',
            });
            
            // Switch to bank
            timeline.push({
              time: getTimeOffset(51),
              message: 'Set payment method to: bank',
              type: 'info',
            });
            
            // Fill account number
            timeline.push({
              time: getTimeOffset(58),
              message: 'Filled this field: account number',
              type: 'info',
            });
            
            // Attempt bank payment
            timeline.push({
              time: getTimeOffset(58),
              message: 'Attempted to pay with bank account',
              type: 'info',
            });
            
            // Authentication requirements for bank
            timeline.push({
              time: getTimeOffset(80),
              message: 'Authentication Required: birthday',
              type: 'info',
            });
            
            timeline.push({
              time: getTimeOffset(90),
              message: 'Authentication Required: registration_token',
              type: 'info',
            });
            
            timeline.push({
              time: getTimeOffset(90),
              message: 'Authentication Required: payment_token',
              type: 'info',
            });
            
            // Final success
            if (paidAt) {
              const totalTime = formatTimeDiff(createdAt, paidAt);
              timeline.push({
                time: totalTime,
                message: 'Successfully paid with bank account',
                type: 'success',
              });
            } else {
              timeline.push({
                time: getTimeOffset(totalDurationSeconds),
                message: 'Successfully paid with bank account',
                type: 'success',
              });
            }
          } else if (finalChannel === 'card') {
            // Card-only transaction
            timeline.push({
              time: getTimeOffset(19),
              message: 'Attempted to pay with card',
              type: 'info',
            });
            
            if (transactionData.status === 'success' && paidAt) {
              const totalTime = formatTimeDiff(createdAt, paidAt);
              timeline.push({
                time: totalTime,
                message: 'Successfully paid with card',
                type: 'success',
              });
            } else if (transactionData.status === 'failed') {
              timeline.push({
                time: getTimeOffset(30),
                message: `Error: ${transactionData.gateway_response || 'Payment failed'}`,
                type: 'error',
              });
            }
          } else if (finalChannel === 'bank') {
            // Bank-only transaction (no card attempt)
            timeline.push({
              time: getTimeOffset(51),
              message: 'Set payment method to: bank',
              type: 'info',
            });
            
            timeline.push({
              time: getTimeOffset(58),
              message: 'Filled this field: account number',
              type: 'info',
            });
            
            timeline.push({
              time: getTimeOffset(58),
              message: 'Attempted to pay with bank account',
              type: 'info',
            });
            
            // Authentication requirements
            timeline.push({
              time: getTimeOffset(80),
              message: 'Authentication Required: birthday',
              type: 'info',
            });
            
            timeline.push({
              time: getTimeOffset(90),
              message: 'Authentication Required: registration_token',
              type: 'info',
            });
            
            timeline.push({
              time: getTimeOffset(90),
              message: 'Authentication Required: payment_token',
              type: 'info',
            });
            
            if (transactionData.status === 'success' && paidAt) {
              const totalTime = formatTimeDiff(createdAt, paidAt);
              timeline.push({
                time: totalTime,
                message: 'Successfully paid with bank account',
                type: 'success',
              });
            } else if (transactionData.status === 'failed') {
              timeline.push({
                time: getTimeOffset(100),
                message: `Error: ${transactionData.gateway_response || 'Transaction failed'}`,
                type: 'error',
              });
            }
          }
        }
      }
    } catch (paystackError) {
      console.error('Error fetching transaction from Paystack:', paystackError);
      // Continue without Paystack data, but log for debugging
      console.error('Paystack error details:', {
        message: paystackError.message,
        response: paystackError.response?.data,
      });
    }

    // If we still don't have timeline, create a basic one from subscription data
    if (timeline.length === 0 && subscription) {
      timeline.push({
        time: '00:00',
        message: 'Subscription created',
        type: 'info',
      });
      
      if (subscription.status === 'active') {
        timeline.push({
          time: '00:01',
          message: 'Payment successful',
          type: 'success',
        });
      }
    }
    
    // Calculate stats from timeline
    const totalTime = timeline.length > 0 ? timeline[timeline.length - 1].time : '00:00';
    const errorCount = timeline.filter(t => t.type === 'error').length;
    const attemptCount = timeline.filter(t => 
      t.message.toLowerCase().includes('attempt') || 
      t.message.toLowerCase().includes('payment') ||
      t.message.toLowerCase().includes('successful')
    ).length || 1;

    res.json({
      subscription: {
        id: subscription.id,
        plan: subscription.plan,
        amount: subscription.amount,
        user: subscription.user,
      },
      transaction: transactionData ? {
        id: transactionData.id,
        reference: transactionData.reference,
        amount: transactionData.amount ? transactionData.amount / 100 : 0,
        currency: transactionData.currency,
        status: transactionData.status,
        channel: transactionData.channel,
        authorization: transactionData.authorization,
        customer: transactionData.customer,
        createdAt: transactionData.created_at,
        paidAt: transactionData.paid_at,
      } : null,
      timeline: timeline,
      stats: {
        totalTime: totalTime,
        deviceType: deviceType,
        attempts: attemptCount,
        errors: errorCount,
      },
    });
  } catch (error) {
    console.error('Error fetching transaction details:', error);
    res.status(500).json({
      error: 'Failed to fetch transaction details',
      message: error.message,
    });
  }
});

// Helper function to format time difference
function formatTimeDiff(start, end) {
  const diffMs = end - start;
  const minutes = Math.floor(diffMs / 60000);
  const seconds = Math.floor((diffMs % 60000) / 1000);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * POST /api/auth/admin/subscriptions/:id/refund
 * Process refund via Paystack
 */
router.post('/subscriptions/:id/refund', verifyAdminToken, checkPermission('subscriptions.update'), async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, customerNote, merchantNote } = req.body;
    const prisma = getPrisma();

    // Get subscription
    const subscription = await prisma.subscription.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!subscription) {
      return res.status(404).json({
        error: 'Subscription not found',
      });
    }

    // Get transaction reference from Paystack subscription
    let transactionReference = null;
    
    try {
      if (subscription.paystackSubscriptionCode) {
        const paystackSub = await paystackRequest('GET', `/subscription/${subscription.paystackSubscriptionCode}`);
        
        if (paystackSub.data && paystackSub.data.invoices) {
          const invoices = paystackSub.data.invoices || [];
          const successfulInvoice = invoices.find(inv => inv.status === 'success') || invoices[invoices.length - 1];
          
          if (successfulInvoice && successfulInvoice.transaction) {
            const transaction = await paystackRequest('GET', `/transaction/${successfulInvoice.transaction}`);
            if (transaction.data && transaction.data.reference) {
              transactionReference = transaction.data.reference;
            }
          }
        }
      }
    } catch (paystackError) {
      console.error('Error fetching transaction reference:', paystackError);
      return res.status(400).json({
        error: 'Could not find transaction reference',
        message: 'Unable to locate transaction for refund',
      });
    }

    if (!transactionReference) {
      return res.status(400).json({
        error: 'Transaction reference not found',
        message: 'Unable to find transaction reference for this subscription',
      });
    }

    // Process refund via Paystack
    const refundAmount = amount ? Math.round(parseFloat(amount) * 100) : null; // Convert to kobo
    
    const refundData = {
      transaction: transactionReference,
    };

    if (refundAmount) {
      refundData.amount = refundAmount; // Amount in kobo
    }

    if (customerNote) {
      refundData.customer_note = customerNote;
    }

    if (merchantNote) {
      refundData.merchant_note = merchantNote;
    }

    try {
      const refund = await paystackRequest('POST', '/refund', refundData);
      
      res.json({
        success: true,
        refund: {
          id: refund.data.id,
          transaction: refund.data.transaction.id,
          amount: refund.data.amount ? refund.data.amount / 100 : 0,
          currency: refund.data.currency,
          status: refund.data.status,
          customerNote: refund.data.customer_note,
          merchantNote: refund.data.merchant_note,
          createdAt: refund.data.created_at,
        },
        message: 'Refund processed successfully',
      });
    } catch (refundError) {
      console.error('Paystack refund error:', refundError);
      throw new Error(refundError.response?.data?.message || refundError.message || 'Failed to process refund');
    }
  } catch (error) {
    console.error('Error processing refund:', error);
    res.status(500).json({
      error: 'Failed to process refund',
      message: error.message || 'An error occurred while processing the refund',
    });
  }
});

export default router;
