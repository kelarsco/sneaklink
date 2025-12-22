/**
 * In-memory store for verification codes
 * In production, use Redis or a database for better scalability
 */

const codeStore = new Map();

/**
 * Generate a 6-digit verification code
 */
export const generateCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Store verification code with expiration (5 minutes)
 */
export const storeCode = (email, code) => {
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
  
  codeStore.set(email.toLowerCase(), {
    code,
    expiresAt,
    attempts: 0,
  });

  // Clean up expired codes periodically
  setTimeout(() => {
    codeStore.delete(email.toLowerCase());
  }, 5 * 60 * 1000);

  return code;
};

/**
 * Verify code for email
 */
export const verifyCode = (email, code) => {
  const stored = codeStore.get(email.toLowerCase());

  if (!stored) {
    return { valid: false, error: 'No verification code found. Please request a new code.' };
  }

  if (Date.now() > stored.expiresAt) {
    codeStore.delete(email.toLowerCase());
    return { valid: false, error: 'Verification code has expired. Please request a new code.' };
  }

  if (stored.attempts >= 5) {
    codeStore.delete(email.toLowerCase());
    return { valid: false, error: 'Too many failed attempts. Please request a new code.' };
  }

  if (stored.code !== code) {
    stored.attempts += 1;
    return { valid: false, error: 'Invalid verification code. Please try again.' };
  }

  // Code is valid, remove it
  codeStore.delete(email.toLowerCase());
  return { valid: true };
};

/**
 * Check if email has a pending code
 */
export const hasPendingCode = (email) => {
  const stored = codeStore.get(email.toLowerCase());
  if (!stored) return false;
  if (Date.now() > stored.expiresAt) {
    codeStore.delete(email.toLowerCase());
    return false;
  }
  return true;
};
