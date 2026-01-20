import express from 'express';
import { sendContactEmail } from '../services/emailService.js';
import { writeLimiter } from '../middleware/rateLimiter.js';
import { getPrisma } from '../config/postgres.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

/**
 * POST /api/contact
 * Send contact form message via email
 * If user is authenticated and source is 'account', create a support ticket
 */
router.post('/', writeLimiter, async (req, res) => {
  try {
    const { name, email, message, subject, source } = req.body;

    // Validate required fields
    if (!name || !email || !message) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Name, email, and message are required',
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Invalid email format',
        message: 'Please provide a valid email address',
      });
    }

    // Sanitize inputs (basic)
    const sanitizedName = name.trim().substring(0, 200);
    const sanitizedEmail = email.trim().substring(0, 200);
    const sanitizedMessage = message.trim().substring(0, 5000);
    const sanitizedSubject = subject ? subject.trim().substring(0, 200) : 'Contact Form Inquiry';

    // If source is 'account' or 'homepage', create a support ticket
    // For 'homepage', only create ticket if email matches suspended/deactivated account
    if (source === 'account' || source === 'homepage') {
      const prisma = getPrisma();
      let finalUserId = null;
      
      // For homepage source, validate email belongs to suspended/deactivated account
      if (source === 'homepage') {
        try {
          const existingUser = await prisma.user.findUnique({
            where: { email: sanitizedEmail.toLowerCase() },
            select: { 
              id: true,
              accountStatus: true,
              isActive: true,
            },
          });
          
          // Only allow ticket creation if user exists and is suspended/deactivated
          if (!existingUser) {
            return res.status(400).json({
              error: 'Email not found',
              message: 'This email is not linked to any suspended or deactivated account. Please verify you are using the correct email address associated with your account.',
            });
          }
          
          // Check if account is actually suspended or deactivated
          if (existingUser.isActive || (existingUser.accountStatus !== 'suspended' && existingUser.accountStatus !== 'deactivated')) {
            return res.status(400).json({
              error: 'Account not suspended',
              message: 'This email is not linked to any suspended or deactivated account. Please verify you are using the correct email address.',
            });
          }
          
          // User exists and is suspended/deactivated - proceed with ticket creation
          finalUserId = existingUser.id;
        } catch (validationError) {
          console.error('Error validating email for homepage support:', validationError);
          return res.status(500).json({
            error: 'Validation error',
            message: 'Unable to verify email. Please try again or contact support directly.',
          });
        }
      }
      
      // For 'account' source, try to get user from token or email
      if (source === 'account') {
        // Try to get user from token if provided
        const token = req.headers.authorization?.replace('Bearer ', '');
        
        if (token) {
          try {
            const decoded = jwt.verify(
              token,
              process.env.JWT_SECRET || 'your-secret-key-change-in-production'
            );
            finalUserId = decoded.userId;
            // User found from token - log removed to prevent terminal clutter
          } catch (err) {
            console.log('⚠️ Token invalid or expired, will find/create user by email');
            // Token invalid, continue without user ID
          }
        }

        // If no userId from token, try to find user by email
        if (!finalUserId) {
        try {
          const existingUser = await prisma.user.findUnique({
            where: { email: sanitizedEmail.toLowerCase() },
          });
          if (existingUser) {
            finalUserId = existingUser.id;
            console.log(`👤 Found existing user by email: ${finalUserId}`);
          } else {
            // Create a new user if they don't exist (for ticket tracking)
            console.log(`➕ Creating new user for email: ${sanitizedEmail}`);
            try {
              const newUser = await prisma.user.create({
                data: {
                  email: sanitizedEmail.toLowerCase(),
                  name: sanitizedName,
                  provider: 'email',
                },
              });
              finalUserId = newUser.id;
              console.log(`✅ Created new user: ${finalUserId}`);
            } catch (createUserError) {
              // If user creation fails (e.g., duplicate email), try to find again
              console.log('⚠️ User creation failed, trying to find existing user:', createUserError.message);
              const existingUser = await prisma.user.findUnique({
                where: { email: sanitizedEmail.toLowerCase() },
              });
              if (existingUser) {
                finalUserId = existingUser.id;
                console.log(`✅ Found existing user after creation error: ${finalUserId}`);
              } else {
                console.error('❌ Could not create or find user:', createUserError);
                // Continue without userId - ticket will still be created with email
              }
            }
          }
        } catch (userError) {
          console.error('❌ Error finding/creating user:', userError);
          // Continue without userId - ticket will still be created with email
        }
        }
      }

      // Get user's plan and account status if userId exists
      let userPlan = 'free';
      let accountStatus = null;
      if (finalUserId) {
        try {
          const user = await prisma.user.findUnique({
            where: { id: finalUserId },
            select: { subscriptionPlan: true, accountStatus: true },
          });
          if (user) {
            if (user.subscriptionPlan) {
              userPlan = user.subscriptionPlan;
            }
            // Only set accountStatus if user is suspended or deactivated
            if (user.accountStatus === 'suspended' || user.accountStatus === 'deactivated') {
              accountStatus = user.accountStatus;
            }
          }
        } catch (planError) {
          console.log('⚠️ Could not fetch user plan/status, defaulting to free:', planError.message);
        }
      }

      // Create support ticket - ALWAYS create even if userId is null
      try {
        // Validate userId is a valid UUID if provided
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (finalUserId && !uuidRegex.test(finalUserId)) {
          console.error('❌ Invalid userId format:', finalUserId);
          finalUserId = null; // Set to null if invalid
        }

        // Ensure userPlan is valid
        const validPlans = ['free', 'starter', 'pro', 'enterprise'];
        if (!validPlans.includes(userPlan)) {
          console.warn(`⚠️ Invalid userPlan "${userPlan}", defaulting to "free"`);
          userPlan = 'free';
        }

        // Generate unique ticket ID before creating the document
        let ticketId;
        let isUnique = false;
        let attempts = 0;
        const maxAttempts = 20;
        
        while (!isUnique && attempts < maxAttempts) {
          const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
          ticketId = `TKT-${randomNum}`;
          
          // Check if ticketId already exists
          const existing = await prisma.supportTicket.findUnique({
            where: { ticketId },
          });
          if (!existing) {
            isUnique = true;
          }
          attempts++;
        }
        
        if (!isUnique) {
          throw new Error('Failed to generate unique ticket ID after multiple attempts');
        }

        // Prepare ticket data
        const ticketData = {
          ticketId: ticketId, // Set ticketId before creating document
          userEmail: sanitizedEmail,
          userName: sanitizedName,
          userPlan: userPlan,
          subject: sanitizedSubject,
          message: sanitizedMessage,
          status: 'open',
          replies: [],
        };

        // Only add userId if it's valid
        if (finalUserId) {
          ticketData.userId = finalUserId;
        }

        // Add account status if user is suspended or deactivated
        if (accountStatus) {
          ticketData.accountStatus = accountStatus;
        }

        // Create ticket using Prisma
        const ticket = await prisma.supportTicket.create({
          data: ticketData,
        });

        // Send email notification to admin about new ticket
        try {
          const { sendNewTicketNotification } = await import('../services/emailService.js');
          await sendNewTicketNotification({
            ticketId: ticket.ticketId,
            userName: sanitizedName,
            userEmail: sanitizedEmail,
            subject: sanitizedSubject,
            message: sanitizedMessage,
          });
        } catch (emailError) {
          console.error('❌ Error sending admin notification:', emailError);
          // Don't fail ticket creation if email fails
        }

        // Note: Suspended user automation removed - ticket creation continues normally

        // Note: Removed sendContactEmail call - only sending support ticket notification

        // Return ticket data for frontend
        return res.json({
          success: true,
          ticketId: ticket.ticketId,
          ticket: {
            id: ticket.id,
            ticketId: ticket.ticketId,
            subject: ticket.subject,
            message: ticket.message,
            status: ticket.status,
            userPlan: ticket.userPlan,
            createdAt: ticket.createdAt,
            replies: ticket.replies || [],
          },
          message: 'Support ticket created successfully. We\'ll get back to you soon!',
        });
      } catch (ticketError) {
        console.error('❌ CRITICAL: Error creating support ticket:', ticketError);
        console.error('Ticket error details:', {
          message: ticketError.message,
          name: ticketError.name,
          code: ticketError.code,
          stack: ticketError.stack,
          userId: finalUserId,
          userPlan: userPlan,
          email: sanitizedEmail,
          subject: sanitizedSubject,
        });
        
        // Check for specific error types
        let errorMessage = 'Your message was received but we encountered an error creating a ticket. Please contact support directly.';
        
        if (ticketError.name === 'ValidationError') {
          console.error('Validation errors:', ticketError.errors);
          errorMessage = `Validation error: ${Object.values(ticketError.errors).map(e => e.message).join(', ')}`;
        } else if (ticketError.name === 'MongoServerError' && ticketError.code === 11000) {
          errorMessage = 'A ticket with this ID already exists. Please try again.';
        } else if (ticketError.message) {
          errorMessage = `Error: ${ticketError.message}`;
        }
        
        // Return error but don't fail completely - still send email
        return res.status(500).json({
          success: false,
          error: 'Failed to create support ticket',
          message: errorMessage,
          details: process.env.NODE_ENV === 'development' ? ticketError.message : undefined,
        });
      }
    }

    // Send email (fallback for non-account/homepage sources)
    await sendContactEmail({
      name: sanitizedName,
      email: sanitizedEmail,
      message: sanitizedMessage,
      subject: sanitizedSubject,
      source: source || 'homepage',
    });

    res.json({
      success: true,
      message: 'Your message has been sent successfully. We\'ll get back to you soon!',
    });
  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({
      error: 'Failed to send message',
      message: 'An error occurred while sending your message. Please try again later.',
    });
  }
});

/**
 * POST /api/contact/validate-email
 * Validate if email belongs to a suspended or deactivated account
 */
router.post('/validate-email', writeLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: 'Email required',
        message: 'Email address is required',
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Invalid email format',
        message: 'Please provide a valid email address',
      });
    }

    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        accountStatus: true,
        isActive: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        error: 'Email not found',
        message: 'This email is not linked to any suspended or deactivated account. Please verify you are using the correct email address associated with your account.',
      });
    }

    // Check if account is suspended or deactivated
    if (user.isActive || (user.accountStatus !== 'suspended' && user.accountStatus !== 'deactivated')) {
      return res.status(400).json({
        error: 'Account not suspended',
        message: 'This email is not linked to any suspended or deactivated account. Please verify you are using the correct email address.',
      });
    }

    // Email is valid and account is suspended/deactivated
    res.json({
      success: true,
      valid: true,
      accountStatus: user.accountStatus,
    });
  } catch (error) {
    console.error('Error validating email:', error);
    res.status(500).json({
      error: 'Validation error',
      message: 'Unable to verify email. Please try again.',
    });
  }
});

export default router;
