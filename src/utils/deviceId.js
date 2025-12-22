/**
 * Generate a unique device ID based on browser, OS, screen size, timezone, and user agent
 * This creates a fingerprint that identifies a device without relying on IP addresses
 */
export const generateDeviceId = () => {
  try {
    // Collect device information
    const navigator = window.navigator;
    const screen = window.screen;
    
    // Browser detection
    const getBrowser = () => {
      const ua = navigator.userAgent;
      if (ua.indexOf('Chrome') > -1 && ua.indexOf('Edg') === -1) return 'Chrome';
      if (ua.indexOf('Firefox') > -1) return 'Firefox';
      if (ua.indexOf('Safari') > -1 && ua.indexOf('Chrome') === -1) return 'Safari';
      if (ua.indexOf('Edg') > -1) return 'Edge';
      if (ua.indexOf('Opera') > -1 || ua.indexOf('OPR') > -1) return 'Opera';
      return 'Unknown';
    };
    
    // OS detection
    const getOS = () => {
      const ua = navigator.userAgent;
      const platform = navigator.platform.toLowerCase();
      
      if (platform.indexOf('win') > -1) return 'Windows';
      if (platform.indexOf('mac') > -1) return 'macOS';
      if (platform.indexOf('linux') > -1) return 'Linux';
      if (ua.indexOf('Android') > -1) return 'Android';
      if (ua.indexOf('iPhone') > -1 || ua.indexOf('iPad') > -1) return 'iOS';
      return 'Unknown';
    };
    
    // Collect fingerprint data
    const fingerprint = {
      browser: getBrowser(),
      os: getOS(),
      screenWidth: screen.width,
      screenHeight: screen.height,
      screenColorDepth: screen.colorDepth,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      platform: navigator.platform,
      userAgent: navigator.userAgent,
      // Additional stable identifiers
      hardwareConcurrency: navigator.hardwareConcurrency || 0,
      maxTouchPoints: navigator.maxTouchPoints || 0,
      deviceMemory: navigator.deviceMemory || 0, // May be undefined in some browsers
    };
    
    // Create a stable string from fingerprint
    const fingerprintString = JSON.stringify(fingerprint);
    
    // Generate hash using a simple hash function (since we can't use crypto in browser easily)
    // Using a combination of character codes to create a hash-like string
    let hash = 0;
    for (let i = 0; i < fingerprintString.length; i++) {
      const char = fingerprintString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Create a more stable hash using base64-like encoding
    // Convert to positive number and encode
    const hashStr = Math.abs(hash).toString(36);
    
    // Create a more unique ID by combining with timestamp of first visit (stored in localStorage)
    const STORAGE_KEY = 'sneaklink_device_id_seed';
    let seed = localStorage.getItem(STORAGE_KEY);
    if (!seed) {
      seed = Date.now().toString(36);
      localStorage.setItem(STORAGE_KEY, seed);
    }
    
    // Combine hash with seed for uniqueness
    const deviceId = `${hashStr}_${seed}`.substring(0, 64); // Limit to 64 chars to match DB schema
    
    return deviceId;
  } catch (error) {
    console.error('Error generating device ID:', error);
    // Fallback to a random ID if generation fails
    const fallbackId = `fallback_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    return fallbackId.substring(0, 64);
  }
};

/**
 * Get device ID (generates if not exists, stores in localStorage for persistence)
 */
export const getDeviceId = () => {
  const STORAGE_KEY = 'sneaklink_device_id';
  let deviceId = localStorage.getItem(STORAGE_KEY);
  
  if (!deviceId) {
    deviceId = generateDeviceId();
    localStorage.setItem(STORAGE_KEY, deviceId);
  }
  
  return deviceId;
};

