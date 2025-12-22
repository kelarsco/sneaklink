/**
 * Authentic Visitor Tracking Script
 * Frontend implementation for tracking genuine human visitors
 * 
 * Features:
 * - Behavior validation (scroll, mouse movement, click)
 * - Privacy-compliant fingerprinting
 * - Ad blocker detection (graceful handling)
 * - Performance-optimized
 */

(function() {
  'use strict';
  
  // Configuration
  const CONFIG = {
    API_URL: '/api/visitors/track',
    MIN_SCROLL_PERCENT: 5, // Minimum 5% scroll to count
    MIN_TIME_ON_PAGE: 2000, // Minimum 2 seconds on page
    DEBOUNCE_DELAY: 2000, // 2 seconds between tracking attempts
  };
  
  // State
  let hasTracked = false;
  let hasScroll = false;
  let hasMouseMove = false;
  let hasClick = false;
  let interactionData = {
    hasScroll: false,
    hasMouseMove: false,
    hasClick: false,
    hasInteraction: false,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
    screenResolution: `${window.screen.width}x${window.screen.height}`,
  };
  let lastTrackTime = 0;
  let pageLoadTime = Date.now();
  
  // Check if JavaScript is enabled (basic bot detection)
  if (typeof window === 'undefined' || !window.document) {
    return; // No-JS environment, don't track
  }
  
  // Check for ad blocker (graceful handling - don't fail)
  const detectAdBlocker = () => {
    try {
      // Create a test element that ad blockers typically block
      const testDiv = document.createElement('div');
      testDiv.innerHTML = '&nbsp;';
      testDiv.className = 'adsbox';
      testDiv.style.position = 'absolute';
      testDiv.style.left = '-9999px';
      document.body.appendChild(testDiv);
      
      setTimeout(() => {
        const isBlocked = testDiv.offsetHeight === 0;
        document.body.removeChild(testDiv);
        
        if (isBlocked) {
          // Ad blocker detected - log but don't count as error
          console.log('[Visitor Tracker] Ad blocker detected - partial tracking only');
        }
      }, 100);
    } catch (e) {
      // Ignore errors
    }
  };
  
  // Track scroll interaction
  const handleScroll = () => {
    if (hasScroll) return;
    
    const scrollPercent = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
    
    if (scrollPercent >= CONFIG.MIN_SCROLL_PERCENT) {
      hasScroll = true;
      interactionData.hasScroll = true;
      interactionData.hasInteraction = true;
      attemptTracking();
    }
  };
  
  // Track mouse movement
  const handleMouseMove = () => {
    if (hasMouseMove) return;
    
    hasMouseMove = true;
    interactionData.hasMouseMove = true;
    interactionData.hasInteraction = true;
    
    // Remove listener after first movement
    document.removeEventListener('mousemove', handleMouseMove);
    attemptTracking();
  };
  
  // Track click interaction
  const handleClick = () => {
    if (hasClick) return;
    
    hasClick = true;
    interactionData.hasClick = true;
    interactionData.hasInteraction = true;
    attemptTracking();
  };
  
  // Attempt to track visitor
  const attemptTracking = () => {
    // Debounce: Don't track if called too soon
    const now = Date.now();
    if (now - lastTrackTime < CONFIG.DEBOUNCE_DELAY) {
      return;
    }
    
    // Don't track if already tracked
    if (hasTracked) {
      return;
    }
    
    // Require minimum time on page
    if (Date.now() - pageLoadTime < CONFIG.MIN_TIME_ON_PAGE) {
      return;
    }
    
    // Require at least one interaction
    if (!interactionData.hasInteraction) {
      return;
    }
    
    lastTrackTime = now;
    hasTracked = true;
    
    // Send tracking request
    fetch(CONFIG.API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(interactionData),
      keepalive: true, // Send even if page is unloading
    }).catch(() => {
      // Fail silently - don't impact user experience
    });
  };
  
  // Initialize tracking when DOM is ready
  const init = () => {
    // Wait for page to be interactive
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
      return;
    }
    
    // Set up event listeners
    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('click', handleClick, { passive: true });
    
    // Track on page visibility change (user returns to tab)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && interactionData.hasInteraction && !hasTracked) {
        attemptTracking();
      }
    });
    
    // Fallback: Track after minimum time if user has interacted
    setTimeout(() => {
      if (interactionData.hasInteraction && !hasTracked) {
        attemptTracking();
      }
    }, CONFIG.MIN_TIME_ON_PAGE + 1000);
    
    // Detect ad blocker (non-blocking)
    detectAdBlocker();
  };
  
  // Start tracking
  init();
  
  // Track on page unload (if not already tracked)
  window.addEventListener('beforeunload', () => {
    if (!hasTracked && interactionData.hasInteraction) {
      // Use sendBeacon for reliable delivery on page unload
      if (navigator.sendBeacon) {
        navigator.sendBeacon(
          CONFIG.API_URL,
          JSON.stringify(interactionData)
        );
      }
    }
  });
})();

