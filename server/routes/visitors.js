/**
 * Visitor Tracking Routes
 * Handles authentic visitor tracking with multi-layer validation
 */

import express from 'express';
import { trackAuthenticVisitor } from '../services/authenticVisitorTracker.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Rate limiting for visitor tracking (prevent abuse)
const trackingLimiter = rateLimit({
  windowMs: 2 * 1000, // 2 seconds
  max: 1, // 1 request per 2 seconds per IP
  message: 'Too many tracking requests',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * POST /api/visitors/track
 * Track an authentic visitor
 * Called from frontend after behavior validation
 */
router.post('/track', trackingLimiter, async (req, res) => {
  try {
    const {
      hasScroll,
      hasMouseMove,
      hasClick,
      hasInteraction,
      timezone,
      screenResolution,
    } = req.body;
    
    const interactionData = {
      hasScroll: hasScroll || false,
      hasMouseMove: hasMouseMove || false,
      hasClick: hasClick || false,
      hasInteraction: hasInteraction || false,
      timezone: timezone || '',
      screenResolution: screenResolution || '',
    };
    
    const result = await trackAuthenticVisitor(req, interactionData);
    
    // Return minimal response (privacy-first)
    res.json({
      success: result.tracked,
      isNew: result.isNew || false,
      sessionId: result.sessionId || null,
    });
  } catch (error) {
    console.error('Error in visitor tracking:', error);
    // Fail silently - don't expose errors to prevent abuse
    res.status(200).json({
      success: false,
      error: 'Tracking failed',
    });
  }
});

export default router;

