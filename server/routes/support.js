import express from 'express';
import { getPrisma } from '../config/postgres.js';
import { authenticateJWT } from '../middleware/auth.js';
import { writeLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

/**
 * POST /api/support/tickets
 * Create a new support ticket (requires authentication)
 */
router.post('/tickets', authenticateJWT, writeLimiter, async (req, res) => {
  try {
    const { subject, message } = req.body;
    const userId = req.user.id;

    if (!subject || !message) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Subject and message are required',
      });
    }

    // Get user details
    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate unique ticket ID
    let ticketId;
    let isUnique = false;
    let attempts = 0;
    while (!isUnique && attempts < 20) {
      const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      ticketId = `TKT-${randomNum}`;
      const existing = await prisma.supportTicket.findUnique({
        where: { ticketId },
      });
      if (!existing) {
        isUnique = true;
      }
      attempts++;
    }

    // Create ticket
    const ticket = await prisma.supportTicket.create({
      data: {
        userId: user.id,
        userEmail: user.email,
        userName: user.name,
        ticketId: ticketId,
        subject: subject.trim(),
        message: message.trim(),
        status: 'open',
        replies: null,
      },
    });

    res.json({
      success: true,
      ticket: {
        id: ticket.id,
        ticketId: ticket.ticketId,
        subject: ticket.subject,
        message: ticket.message,
        status: ticket.status,
        createdAt: ticket.createdAt,
      },
      message: 'Support ticket created successfully',
    });
  } catch (error) {
    console.error('Error creating support ticket:', error);
    res.status(500).json({
      error: 'Failed to create ticket',
      message: error.message,
    });
  }
});

/**
 * GET /api/support/tickets
 * Get user's support tickets (requires authentication)
 */
router.get('/tickets', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const { status } = req.query;

    const prisma = getPrisma();
    const where = { userId };
    if (status && status !== 'all') {
      where.status = status;
    }

    const tickets = await prisma.supportTicket.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const transformedTickets = tickets.map(ticket => ({
      id: ticket.id,
      ticketId: ticket.ticketId,
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

    res.json({ tickets: transformedTickets });
  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({
      error: 'Failed to fetch tickets',
      message: error.message,
    });
  }
});

/**
 * GET /api/support/tickets/:id
 * Get a specific ticket (requires authentication)
 */
router.get('/tickets/:id', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const ticketId = req.params.id;

    const prisma = getPrisma();
    const ticket = await prisma.supportTicket.findFirst({
      where: {
        id: ticketId,
        userId: userId,
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
 * POST /api/support/tickets/:id/reply
 * Reply to a ticket (requires authentication)
 */
router.post('/tickets/:id/reply', authenticateJWT, writeLimiter, async (req, res) => {
  try {
    const userId = req.user.id;
    const ticketId = req.params.id;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        error: 'Message is required',
      });
    }

    const prisma = getPrisma();
    const ticket = await prisma.supportTicket.findFirst({
      where: {
        id: ticketId,
        userId: userId,
      },
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Add reply
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

export default router;
