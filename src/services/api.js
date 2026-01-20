const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

/**
 * Fetch stores with filters
 */
export const fetchStores = async (filters = {}, page = 1, limit = 50) => {
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    // Add filter parameters
    if (filters.countries && filters.countries.length > 0) {
      filters.countries.forEach(country => params.append('countries', country));
    }
    if (filters.themes && filters.themes.length > 0) {
      filters.themes.forEach(theme => params.append('themes', theme));
    }
    if (filters.tags && filters.tags.length > 0) {
      filters.tags.forEach(tag => params.append('tags', tag));
    }
    if (filters.dateRange?.from) {
      params.append('dateFrom', filters.dateRange.from);
    }
    if (filters.dateRange?.to) {
      params.append('dateTo', filters.dateRange.to);
    }
    
    // Add filterCount parameter if provided (for usage tracking)
    if (filters.filterCount !== undefined && filters.filterCount > 0) {
      params.append('filterCount', filters.filterCount.toString());
    }

    // Include auth token if available (required for filtered queries)
    const token = localStorage.getItem('authToken');
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/stores?${params.toString()}`, {
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    });
    
    // Check for auth errors but don't log out
    // handleAuthError no longer logs users out
    if (!response.ok) {
      handleAuthError(response);
    }
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // Check if it's a rate limit error - handle gracefully
      if (response.status === 429 || errorData.error === 'Too many requests') {
        throw new Error('Too many requests from this IP, please try again later.');
      }
      
      // Check if it's a filter restriction error (upgrade required)
      if (errorData.error === 'Upgrade required' || errorData.requiresUpgrade) {
        // If filters were used, retry without filters for free users
        if (filters && Object.keys(filters).length > 0) {
          console.warn('Filter not available on plan, retrying without filters');
          // Retry without filters
          const retryParams = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
          });
          const retryResponse = await fetch(`${API_BASE_URL}/stores?${retryParams.toString()}`, {
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            }
          });
          if (retryResponse.ok) {
            const retryData = await retryResponse.json();
            // Add upgrade message to response
            return {
              ...retryData,
              filterRestricted: true,
              upgradeMessage: errorData.message,
            };
          }
        }
        throw new Error(errorData.message || 'Upgrade required to use filters');
      }
      
      // Check if it's a database connection error
      if (errorData.message && (
        errorData.message.includes('Database not connected') ||
        errorData.message.includes('MongoDB') ||
        errorData.message.includes('database')
      )) {
        // Don't throw - just return empty data silently
        console.warn('Database connection issue - returning empty data');
        return { stores: [], pagination: { totalPages: 1, total: 0 } };
      }
      throw new Error(errorData.message || 'Failed to fetch stores');
    }

    return await response.json();
  } catch (error) {
    // Suppress network/database errors - don't show to users
    if (error.message.includes('Failed to fetch') || 
        error.message.includes('Network') ||
        error.message.includes('database') ||
        error.message.includes('MongoDB')) {
      console.warn('Connection issue - returning empty data:', error.message);
      return { stores: [], pagination: { totalPages: 1, total: 0 } };
    }
    console.error('Error fetching stores:', error);
    throw error;
  }
};

/**
 * Start scraping job
 */
export const startScraping = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/stores/scrape`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to start scraping');
    }

    return await response.json();
  } catch (error) {
    console.error('Error starting scraping:', error);
    throw error;
  }
};

/**
 * Add a store manually
 */
export const addStore = async (url) => {
  try {
    const response = await fetch(`${API_BASE_URL}/stores`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url, source: 'Manual' }),
    });

    if (!response.ok) {
      throw new Error('Failed to add store');
    }

    return await response.json();
  } catch (error) {
    console.error('Error adding store:', error);
    throw error;
  }
};

/**
 * Check API health
 */
export const checkHealth = async () => {
  try {
    // Health endpoint is at root, not under /api
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    // Remove /api if present to get base URL
    const baseUrl = apiUrl.replace(/\/api\/?$/, '') || 'http://localhost:3000';
    
    // Use AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    try {
      const response = await fetch(`${baseUrl}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response.ok;
    } catch (fetchError) {
      clearTimeout(timeoutId);
      // Don't log connection refused errors - they're expected when server isn't running
      if (fetchError.name !== 'AbortError' && !fetchError.message.includes('Failed to fetch')) {
        console.warn('Health check failed:', fetchError.message);
      }
      return false;
    }
  } catch (error) {
    // Silently fail - don't spam console when server isn't running
    return false;
  }
};

/**
 * Get Google OAuth URL
 */
export const getGoogleAuthUrl = async () => {
  try {
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    const response = await fetch(`${API_BASE_URL}/auth/google/url`);
    
    if (!response.ok) {
      throw new Error('Failed to get Google auth URL');
    }

    const data = await response.json();
    return data.authUrl;
  } catch (error) {
    console.error('Error getting Google auth URL:', error);
    throw error;
  }
};

/**
 * Verify Google ID token
 */
export const verifyGoogleToken = async (idToken, deviceId) => {
  try {
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    
    // Create abort controller for better timeout control
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
    
    try {
      const response = await fetch(`${API_BASE_URL}/auth/google/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idToken, deviceId }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorMessage = 'Failed to verify Google token';
        let errorData = {};
        try {
          errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
          
          // Handle account suspension/deactivation (403 status)
          if (response.status === 403) {
            // Check if it's a suspension or deactivation error
            if (errorData.error === 'Account suspended' || errorData.error === 'Account deactivated') {
              // Create a custom error with suspension flag
              const suspensionError = new Error(errorMessage);
              suspensionError.isSuspended = true;
              suspensionError.accountStatus = errorData.error === 'Account deactivated' ? 'deactivated' : 'suspended';
              throw suspensionError;
            }
            // Other 403 errors (like device limit)
            throw new Error(errorMessage);
          }
          
          // Provide more specific error messages for 401
          if (response.status === 401) {
            if (errorMessage.includes('Token verification failed') || errorMessage.includes('Invalid or expired')) {
              errorMessage = 'Google token verification failed. Please try signing in again.';
            } else if (errorMessage.includes('timeout')) {
              errorMessage = 'Request timed out. Please try again.';
            } else {
              errorMessage = 'Authentication failed. Please try signing in again.';
            }
          }
        } catch (e) {
          // If it's already a suspension error, re-throw it
          if (e.isSuspended) {
            throw e;
          }
          // If response is not JSON, use status text
          errorMessage = response.statusText || errorMessage;
          if (response.status === 401) {
            errorMessage = 'Authentication failed. Please try signing in again.';
          } else if (response.status === 403) {
            errorMessage = 'Access denied. Your account may be suspended or deactivated.';
          }
        }
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      // Re-throw if it's already an Error with message
      if (fetchError.name === 'AbortError') {
        throw new Error('Request timed out. The server is taking too long to respond. Please try again.');
      }
      throw fetchError;
    }
  } catch (error) {
    console.error('Error verifying Google token:', error);
    
    // Provide more helpful error messages
    if (error.name === 'AbortError' || error.message.includes('timeout') || error.message.includes('timed out')) {
      throw new Error('Request timed out. The server may be slow or overloaded. Please try again in a moment.');
    }
    
    if (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_REFUSED') || error.message.includes('NetworkError')) {
      throw new Error('Cannot connect to backend server. Please make sure the server is running on port 3000. Start it with: cd server && npm start');
    }
    
    throw error;
  }
};

// Request deduplication cache (must be defined before handleAuthError)
let pendingUserRequest = null;
let userCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 30000; // 30 seconds cache

/**
 * Helper function to handle authentication errors - NON-DESTRUCTIVE
 * Don't automatically log users out - let them stay logged in
 */
const handleAuthError = (response) => {
  if (response.status === 401 || response.status === 403) {
    // Don't clear tokens or redirect - keep users logged in
    // The backend will handle session validation
    // Frontend should trust the token and keep user logged in
    console.warn('Authentication error detected, but keeping user logged in');
    return false; // Don't handle as error - keep user logged in
  }
  return false; // No auth error
};

/**
 * Get current user with request deduplication and caching
 */
export const getCurrentUser = async () => {
  try {
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    const token = localStorage.getItem('authToken');
    
    if (!token) {
      return null;
    }

    // Check cache first
    const now = Date.now();
    if (userCache && cacheTimestamp && (now - cacheTimestamp) < CACHE_DURATION) {
      return userCache;
    }

    // If there's already a pending request, wait for it
    if (pendingUserRequest) {
      return await pendingUserRequest;
    }

    // Create new request
    pendingUserRequest = (async () => {
      try {
        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

        try {
          const response = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            if (response.status === 403) {
              // Check if it's a suspended/deactivated account
              try {
                const errorData = await response.json();
                if (errorData.error === 'Account suspended' || errorData.error === 'Account deactivated') {
                  // Clear tokens and redirect to login for suspended users
                  localStorage.removeItem('authToken');
                  localStorage.removeItem('lastLoginTime');
                  userCache = null;
                  cacheTimestamp = null;
                  if (typeof window !== 'undefined') {
                    window.location.href = '/login';
                  }
                  return null;
                }
              } catch (e) {
                // If we can't parse error, still clear cache
              }
              // Other 403 errors - clear cache but might be temporary
              userCache = null;
              cacheTimestamp = null;
              return null;
            } else if (response.status === 401) {
              // Unauthorized - clear tokens and cache
              localStorage.removeItem('authToken');
              localStorage.removeItem('lastLoginTime');
              userCache = null;
              cacheTimestamp = null;
              return null;
            } else if (response.status === 429) {
              // Rate limit error
              console.warn('Rate limit exceeded. Please wait before making more requests.');
              throw new Error('Too many requests. Please wait a moment and try again.');
            }
            return null;
          }

          const data = await response.json();
          
          // Check if user is suspended before caching
          if (data.user && (data.user.accountStatus === 'suspended' || (!data.user.isActive && data.user.accountStatus === 'suspended'))) {
            // Clear tokens and redirect to login
            localStorage.removeItem('authToken');
            localStorage.removeItem('lastLoginTime');
            userCache = null;
            cacheTimestamp = null;
            if (typeof window !== 'undefined') {
              window.location.href = '/login';
            }
            return null;
          }
          
          // Update cache
          userCache = data.user;
          cacheTimestamp = now;
          
          return data.user;
        } catch (fetchError) {
          clearTimeout(timeoutId);
          
          // Network error or timeout
          if (fetchError.name === 'AbortError') {
            console.warn('Request timeout - backend may not be running');
          } else if (fetchError.name === 'TypeError' && fetchError.message.includes('fetch')) {
            console.warn('Network error - backend may not be running');
          } else {
            console.warn('Error getting current user:', fetchError.message);
          }
          return null;
        }
      } finally {
        // Clear pending request after a short delay to allow concurrent calls to use cache
        setTimeout(() => {
          pendingUserRequest = null;
        }, 1000);
      }
    })();

    return await pendingUserRequest;
  } catch (error) {
    // Handle any unexpected errors gracefully
    console.warn('Unexpected error in getCurrentUser:', error.message);
    return null;
  }
};

/**
 * Clear user cache (call this after login/logout)
 */
export const clearUserCache = () => {
  userCache = null;
  cacheTimestamp = null;
  pendingUserRequest = null;
};

/**
 * Check if current session is still valid
 */
export const checkSession = async () => {
  try {
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    const token = localStorage.getItem('authToken');
    
    if (!token) {
      return { valid: false };
    }

    const response = await fetch(`${API_BASE_URL}/auth/session/check`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    // If response is not ok, don't clear tokens - might be temporary network issue
    if (!response.ok) {
      // Don't clear tokens on errors - keep user logged in
      // Only return invalid status, don't log user out
      console.warn('Session check failed, but keeping user logged in');
      return { valid: false };
    }

    const data = await response.json();
    
    // Don't clear tokens even if session is invalid
    // Let the backend handle session management
    // Frontend should trust the token and keep user logged in
    
    return data;
  } catch (error) {
    // Don't clear tokens on errors - keep user logged in
    // Errors might be temporary network issues
    console.warn('Error checking session (keeping user logged in):', error.message);
    return { valid: true }; // Assume valid to keep user logged in
  }
};

/**
 * Verify email verification code
 */
export const verifyEmailCode = async (email, code, deviceId) => {
  try {
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    const response = await fetch(`${API_BASE_URL}/auth/email/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, code, deviceId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to verify email code');
    }

    return await response.json();
  } catch (error) {
    console.error('Error verifying email code:', error);
    throw error;
  }
};

/**
 * Send contact form message
 * If source is 'account', includes auth token to create support ticket
 */
export const sendContactMessage = async (contactData) => {
  try {
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    const token = localStorage.getItem('authToken');
    
    const headers = {
      'Content-Type': 'application/json',
    };
    
    // Include auth token if available (for account support tickets)
    if (token && contactData.source === 'account') {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(`${API_BASE_URL}/contact`, {
      method: 'POST',
      headers,
      body: JSON.stringify(contactData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || error.error || 'Failed to send message');
    }

    return await response.json();
  } catch (error) {
    console.error('Error sending contact message:', error);
    throw error;
  }
};

/**
 * Verify TOTP code for admin login
 */
export const verifyAdminTotp = async (code) => {
  try {
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    const response = await fetch(`${API_BASE_URL}/auth/admin/verify-totp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || error.error || 'Failed to verify TOTP code');
    }

    return await response.json();
  } catch (error) {
    console.error('Error verifying TOTP:', error);
    
    // Provide more helpful error messages
    if (error.message?.includes('Failed to fetch') || error.message?.includes('ERR_CONNECTION_REFUSED')) {
      throw new Error('Cannot connect to server. Please make sure the backend server is running on port 3000.');
    }
    
    throw error;
  }
};

/**
 * Get admin analytics
 */
export const getAdminAnalytics = async (dateFrom = null, dateTo = null) => {
  try {
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    const token = localStorage.getItem('adminToken');
    
    if (!token) {
      throw new Error('Admin token required');
    }

    // Build query params with date range if provided
    const params = new URLSearchParams();
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    const queryString = params.toString();
    const url = `${API_BASE_URL}/auth/admin/analytics${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      // Check if it's a permission error
      if (response.status === 403 || error.message?.includes('Permission required') || error.message?.includes('permission')) {
        // Return empty data for permission errors instead of throwing
        // This allows the UI to handle it gracefully
        return {
          totalUsers: 0,
          activeUsers: 0,
          premiumUsers: 0,
          totalVisitors: 0,
          linksGenerated: 0,
          recentSignups: 0,
          permissionError: true,
        };
      }
      throw new Error(error.message || error.error || 'Failed to fetch analytics');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching admin analytics:', error);
    throw error;
  }
};

/**
 * Get admin users
 */
export const getAdminUsers = async (params = {}) => {
  try {
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    const token = localStorage.getItem('adminToken');
    
    if (!token) {
      throw new Error('Admin token required');
    }

    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.search) queryParams.append('search', params.search);
    if (params.plan) queryParams.append('plan', params.plan);
    if (params.status) queryParams.append('status', params.status);

    const response = await fetch(`${API_BASE_URL}/auth/admin/users?${queryParams.toString()}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }));
      // Don't throw for rate limit or permission errors - return empty data instead
      if (response.status === 429 || error.message?.includes('Too many requests') || error.error?.includes('Too many requests')) {
        // Silently return empty data - don't log to avoid console spam
        return { users: [], pagination: { page: 1, limit: 50, total: 0, totalPages: 1 } };
      }
      if (response.status === 403 || error.message?.includes('Permission required') || error.message?.includes('Admin access required')) {
        // Permission denied - return empty data silently
        return { users: [], pagination: { page: 1, limit: 50, total: 0, totalPages: 1 } };
      }
      throw new Error(error.message || error.error || 'Failed to fetch users');
    }

    return await response.json();
  } catch (error) {
    // Don't throw for rate limit errors - return empty data instead
    if (error.message?.includes('Too many requests')) {
      console.warn('[API] Rate limited - returning empty data for admin users');
      return { users: [], pagination: { page: 1, limit: 50, total: 0, totalPages: 1 } };
    }
    console.error('Error fetching admin users:', error);
    throw error;
  }
};

/**
 * Get warned users
 */
export const getWarnedUsers = async (type = 'warned') => {
  try {
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    const token = localStorage.getItem('adminToken');
    
    if (!token) {
      throw new Error('Admin token required');
    }

    const response = await fetch(`${API_BASE_URL}/auth/admin/warned-users?type=${type}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }));
      // Don't throw for rate limit or permission errors - return empty data instead
      if (response.status === 429 || error.message?.includes('Too many requests') || error.error?.includes('Too many requests')) {
        // Silently return empty data - don't log to avoid console spam
        return { users: [], total: 0 };
      }
      if (response.status === 403 || error.message?.includes('Permission required') || error.message?.includes('Admin access required')) {
        // Permission denied - return empty data silently
        return { users: [], total: 0 };
      }
      throw new Error(error.message || error.error || 'Failed to fetch warned users');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    // Only log network errors, not auth errors
    if (error.message.includes('Failed to fetch') || error.message.includes('Network')) {
      console.warn(`[API] Network error fetching ${type} users (backend may be offline):`, error.message);
    } else {
    console.error('Error fetching warned users:', error);
    }
    throw error;
  }
};

/**
 * Create a new user (admin only)
 */
export const createUser = async (userData) => {
  try {
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    const token = localStorage.getItem('adminToken');
    
    if (!token) {
      throw new Error('Admin token required');
    }

    const response = await fetch(`${API_BASE_URL}/auth/admin/users`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || error.error || 'Failed to create user');
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

/**
 * Update a user (admin only)
 */
export const updateUser = async (userId, userData) => {
  try {
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    const token = localStorage.getItem('adminToken');
    
    if (!token) {
      throw new Error('Admin token required');
    }

    const response = await fetch(`${API_BASE_URL}/auth/admin/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || error.error || 'Failed to update user');
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
};

/**
 * Suspend a user (admin only)
 */
export const suspendUser = async (userId) => {
  try {
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    const token = localStorage.getItem('adminToken');
    
    if (!token) {
      throw new Error('Admin token required');
    }

    const response = await fetch(`${API_BASE_URL}/auth/admin/users/${userId}/suspend`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || error.error || 'Failed to suspend user');
    }

    return await response.json();
  } catch (error) {
    console.error('Error suspending user:', error);
    throw error;
  }
};

/**
 * Deactivate a user (admin only)
 */
export const deactivateUser = async (userId) => {
  try {
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    const token = localStorage.getItem('adminToken');
    
    if (!token) {
      throw new Error('Admin token required');
    }

    const response = await fetch(`${API_BASE_URL}/auth/admin/users/${userId}/deactivate`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || error.error || 'Failed to deactivate user');
    }

    return await response.json();
  } catch (error) {
    console.error('Error deactivating user:', error);
    throw error;
  }
};

/**
 * Delete a user permanently from the database (admin only)
 */
export const deleteUser = async (userId) => {
  try {
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    const token = localStorage.getItem('adminToken');
    
    if (!token) {
      throw new Error('Admin token required');
    }

    const response = await fetch(`${API_BASE_URL}/auth/admin/users/${userId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || error.error || 'Failed to delete user');
    }

    return await response.json();
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
};

/**
 * Restore a user (admin only)
 */
export const restoreUser = async (userId) => {
  try {
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    const token = localStorage.getItem('adminToken');
    
    if (!token) {
      throw new Error('Admin token required');
    }

    const response = await fetch(`${API_BASE_URL}/auth/admin/users/${userId}/restore`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || error.error || 'Failed to restore user');
    }

    return await response.json();
  } catch (error) {
    console.error('Error restoring user:', error);
    throw error;
  }
};

/**
 * Restore all suspended and deactivated users (admin only)
 */
export const restoreAllUsers = async () => {
  try {
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    const token = localStorage.getItem('adminToken');
    
    if (!token) {
      throw new Error('Admin token required');
    }

    const response = await fetch(`${API_BASE_URL}/auth/admin/users/restore-all`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || error.error || 'Failed to restore all users');
    }

    return await response.json();
  } catch (error) {
    console.error('Error restoring all users:', error);
    throw error;
  }
};

/**
 * Activate ALL users (force all users to active status) (admin only)
 */
export const activateAllUsers = async () => {
  try {
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    const token = localStorage.getItem('adminToken');
    
    if (!token) {
      throw new Error('Admin token required');
    }

    const response = await fetch(`${API_BASE_URL}/auth/admin/users/activate-all`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || error.error || 'Failed to activate all users');
    }

    return await response.json();
  } catch (error) {
    console.error('Error activating all users:', error);
    throw error;
  }
};

/**
 * Debug endpoint to check all users and their statuses (admin only)
 */
export const getUsersDebug = async () => {
  try {
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    const token = localStorage.getItem('adminToken');
    
    if (!token) {
      throw new Error('Admin token required');
    }

    const response = await fetch(`${API_BASE_URL}/auth/admin/users/debug`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || error.error || 'Failed to fetch debug info');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching debug info:', error);
    throw error;
  }
};

/**
 * Get recent users
 */
export const getRecentUsers = async (limit = 5, dateFrom = null, dateTo = null) => {
  try {
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    const token = localStorage.getItem('adminToken');
    
    if (!token) {
      throw new Error('Admin token required');
    }

    // Build query params with date range if provided
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);

    const response = await fetch(`${API_BASE_URL}/auth/admin/recent-users?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      // Handle permission errors gracefully
      if (response.status === 403 || error.message?.includes('Permission required') || error.message?.includes('Admin access required')) {
        return { users: [], permissionError: true };
      }
      throw new Error(error.message || error.error || 'Failed to fetch recent users');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching recent users:', error);
    throw error;
  }
};

/**
 * Get user's support tickets
 */
export const getUserTickets = async () => {
  try {
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    const token = localStorage.getItem('authToken');
    
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await fetch(`${API_BASE_URL}/auth/tickets`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || error.error || 'Failed to fetch tickets');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching user tickets:', error);
    throw error;
  }
};

/**
 * Get a specific ticket
 */
export const getTicket = async (ticketId) => {
  try {
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    const token = localStorage.getItem('authToken');
    
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await fetch(`${API_BASE_URL}/auth/tickets/${ticketId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || error.error || 'Failed to fetch ticket');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching ticket:', error);
    throw error;
  }
};

/**
 * Reply to a ticket
 */
export const replyToTicket = async (ticketId, message) => {
  try {
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    const token = localStorage.getItem('authToken');
    
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await fetch(`${API_BASE_URL}/auth/tickets/${ticketId}/reply`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || error.error || 'Failed to send reply');
    }

    return await response.json();
  } catch (error) {
    console.error('Error replying to ticket:', error);
    throw error;
  }
};

/**
 * Get admin support tickets
 */
export const getAdminTickets = async (params = {}) => {
  try {
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    const token = localStorage.getItem('adminToken');
    
    if (!token) {
      console.error('❌ No admin token found in localStorage');
      throw new Error('Admin token required. Please log in again.');
    }

    const queryParams = new URLSearchParams();
    if (params.status) queryParams.append('status', params.status);
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);

    const url = `${API_BASE_URL}/auth/admin/support/tickets?${queryParams.toString()}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      if (response.status === 401) {
        // Token expired or invalid
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        throw new Error('Session expired. Please log in again.');
      }
      if (response.status === 403 || error.message?.includes('Permission required') || error.message?.includes('Admin access required')) {
        // Permission denied - return empty data silently
        return { tickets: [], pagination: { page: 1, limit: 50, total: 0, totalPages: 1 } };
      }
      console.error('❌ Failed to fetch tickets:', error);
      throw new Error(error.message || error.error || 'Failed to fetch tickets');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('❌ Error fetching admin tickets:', error);
    throw error;
  }
};

/**
 * Admin reply to a ticket
 */
export const adminReplyToTicket = async (ticketId, message) => {
  try {
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    const token = localStorage.getItem('adminToken');
    
    if (!token) {
      throw new Error('Admin token required');
    }

    const response = await fetch(`${API_BASE_URL}/auth/admin/support/tickets/${ticketId}/reply`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || error.error || 'Failed to send reply');
    }

    return await response.json();
  } catch (error) {
    console.error('Error replying to ticket:', error);
    throw error;
  }
};

/**
 * Delete a single ticket (admin only)
 */
export const deleteTicket = async (ticketId) => {
  try {
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    const token = localStorage.getItem('adminToken');
    
    if (!token) {
      throw new Error('Admin token required');
    }

    const response = await fetch(`${API_BASE_URL}/auth/admin/support/tickets/${ticketId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || error.error || 'Failed to delete ticket');
    }

    return await response.json();
  } catch (error) {
    console.error('Error deleting ticket:', error);
    throw error;
  }
};

/**
 * Delete multiple tickets or all tickets (admin only)
 */
export const deleteTickets = async (ticketIds = null, deleteAll = false) => {
  try {
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    const token = localStorage.getItem('adminToken');
    
    if (!token) {
      throw new Error('Admin token required');
    }

    const response = await fetch(`${API_BASE_URL}/auth/admin/support/tickets`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ticketIds, deleteAll }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || error.error || 'Failed to delete tickets');
    }

    return await response.json();
  } catch (error) {
    console.error('Error deleting tickets:', error);
    throw error;
  }
};

/**
 * Get count of new/unread tickets (admin only)
 */
export const getNewTicketsCount = async () => {
  try {
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    const token = localStorage.getItem('adminToken');
    
    if (!token) {
      throw new Error('Admin token required');
    }

    const response = await fetch(`${API_BASE_URL}/auth/admin/support/tickets/count`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || error.error || 'Failed to fetch ticket count');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching ticket count:', error);
    throw error;
  }
};

/**
 * Update ticket status (admin only)
 */
export const updateTicketStatus = async (ticketId, status) => {
  try {
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    const token = localStorage.getItem('adminToken');
    
    if (!token) {
      throw new Error('Admin token required');
    }

    const response = await fetch(`${API_BASE_URL}/auth/admin/support/tickets/${ticketId}/status`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || error.error || 'Failed to update ticket status');
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating ticket status:', error);
    throw error;
  }
};

/**
 * Add staff member
 */
export const addStaff = async (staffData) => {
  try {
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    const token = localStorage.getItem('adminToken');
    
    if (!token) {
      throw new Error('Admin token required');
    }

    const response = await fetch(`${API_BASE_URL}/auth/admin/staff`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(staffData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to add staff member');
    }

    return await response.json();
  } catch (error) {
    console.error('Error adding staff member:', error);
    throw error;
  }
};

/**
 * Get count of new subscriptions
 */
export const getNewSubscribersCount = async () => {
  try {
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    const token = localStorage.getItem('adminToken');
    
    if (!token) {
      throw new Error('Admin token required');
    }

    // Get last viewed timestamp from localStorage
    const lastViewed = localStorage.getItem('subscriptionsLastViewed');
    const queryParams = new URLSearchParams();
    if (lastViewed) {
      queryParams.append('lastViewed', lastViewed);
    }

    const response = await fetch(`${API_BASE_URL}/auth/admin/subscriptions/count?${queryParams.toString()}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || error.error || 'Failed to fetch subscription count');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching subscription count:', error);
    throw error;
  }
};

/**
 * Get all staff members
 */
export const getStaffMembers = async () => {
  try {
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    const token = localStorage.getItem('adminToken');
    
    if (!token) {
      throw new Error('Admin token required');
    }

    const response = await fetch(`${API_BASE_URL}/auth/admin/staff`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      // Handle permission errors silently
      if (response.status === 403 || errorData.message?.includes('Permission required') || errorData.message?.includes('Admin access required')) {
        return { success: true, staff: [] };
      }
      throw new Error(errorData.message || 'Failed to fetch staff members');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching staff members:', error);
    throw error;
  }
};

/**
 * Get admin subscriptions
 */
export const getAdminSubscriptions = async (params = {}) => {
  try {
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    const token = localStorage.getItem('adminToken');
    
    if (!token) {
      throw new Error('Admin token required');
    }

    const queryParams = new URLSearchParams();
    if (params.status) queryParams.append('status', params.status);
    if (params.plan) queryParams.append('plan', params.plan);
    if (params.dateFrom) queryParams.append('dateFrom', params.dateFrom);
    if (params.dateTo) queryParams.append('dateTo', params.dateTo);
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);

    const url = `${API_BASE_URL}/auth/admin/subscriptions?${queryParams.toString()}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      if (response.status === 401) {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        throw new Error('Session expired. Please log in again.');
      }
      if (response.status === 403 || error.message?.includes('Permission required') || error.message?.includes('Admin access required')) {
        return { success: true, subscriptions: [], stats: {}, pagination: { page: 1, limit: 50, total: 0, totalPages: 1 }, permissionError: true };
      }
      throw new Error(error.message || error.error || 'Failed to fetch subscriptions');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching admin subscriptions:', error);
    throw error;
  }
};

/**
 * Get admin disputes from Paystack
 */
export const getAdminDisputes = async (params = {}) => {
  try {
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    const token = localStorage.getItem('adminToken');
    
    if (!token) {
      throw new Error('Admin token required');
    }

    const queryParams = new URLSearchParams();
    if (params.status) queryParams.append('status', params.status);
    if (params.dateFrom) queryParams.append('from', params.dateFrom);
    if (params.dateTo) queryParams.append('to', params.dateTo);
    if (params.page) queryParams.append('page', params.page);
    if (params.perPage) queryParams.append('perPage', params.perPage);

    const url = `${API_BASE_URL}/auth/admin/disputes?${queryParams.toString()}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      if (response.status === 401) {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        throw new Error('Session expired. Please log in again.');
      }
      if (response.status === 403 || error.message?.includes('Permission required') || error.message?.includes('Admin access required')) {
        return { success: true, disputes: [], stats: {}, pagination: { page: 1, perPage: 50, total: 0, totalPages: 1 }, permissionError: true };
      }
      throw new Error(error.message || error.error || 'Failed to fetch disputes');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching admin disputes:', error);
    throw error;
  }
};

/**
 * Get transaction details for a subscription
 */
export const getSubscriptionTransaction = async (subscriptionId) => {
  try {
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    const token = localStorage.getItem('adminToken');
    
    if (!token) {
      throw new Error('Admin token required');
    }

    const url = `${API_BASE_URL}/auth/admin/subscriptions/${subscriptionId}/transaction`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      if (response.status === 401) {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        throw new Error('Session expired. Please log in again.');
      }
      throw new Error(error.message || error.error || 'Failed to fetch transaction details');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching transaction details:', error);
    throw error;
  }
};

/**
 * Process refund for a subscription
 */
export const refundSubscription = async (subscriptionId, refundData) => {
  try {
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    const token = localStorage.getItem('adminToken');
    
    if (!token) {
      throw new Error('Admin token required');
    }

    const url = `${API_BASE_URL}/auth/admin/subscriptions/${subscriptionId}/refund`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(refundData),
    });

    if (!response.ok) {
      const error = await response.json();
      if (response.status === 401) {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        throw new Error('Session expired. Please log in again.');
      }
      throw new Error(error.message || error.error || 'Failed to process refund');
    }

    return await response.json();
  } catch (error) {
    console.error('Error processing refund:', error);
    throw error;
  }
};

/**
 * Update staff member permissions
 */
export const updateStaffPermissions = async (staffId, permissions) => {
  try {
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    const token = localStorage.getItem('adminToken');
    
    if (!token) {
      throw new Error('Admin token required');
    }

    const response = await fetch(`${API_BASE_URL}/auth/admin/staff/${staffId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ permissions }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to update staff permissions');
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating staff permissions:', error);
    throw error;
  }
};

/**
 * Delete staff member
 */
export const deleteStaff = async (staffId) => {
  try {
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    const token = localStorage.getItem('adminToken');
    
    if (!token) {
      throw new Error('Admin token required');
    }

    const response = await fetch(`${API_BASE_URL}/auth/admin/staff/${staffId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to delete staff member');
    }

    return await response.json();
  } catch (error) {
    console.error('Error deleting staff member:', error);
    throw error;
  }
};

/**
 * Accept staff invitation
 */
export const acceptStaffInvitation = async (token) => {
  try {
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

    const response = await fetch(`${API_BASE_URL}/auth/staff/accept-invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to accept invitation');
    }

    return await response.json();
  } catch (error) {
    console.error('Error accepting staff invitation:', error);
    throw error;
  }
};

/**
 * Staff login (no password required)
 */
export const staffLogin = async (email) => {
  try {
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

    const response = await fetch(`${API_BASE_URL}/auth/staff/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Staff login failed');
    }

    const data = await response.json();
    
    // Store token
    if (data.token) {
      localStorage.setItem('authToken', data.token);
    }

    return data;
  } catch (error) {
    console.error('Error in staff login:', error);
    throw error;
  }
};

/**
 * Logout user
 */
export const logout = async () => {
  try {
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    const token = localStorage.getItem('authToken');
    
    // Clear user cache first
    clearUserCache();
    
    // Call logout endpoint (optional, but good for consistency)
    if (token) {
      try {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      } catch (error) {
        // Ignore errors from logout endpoint
        console.log('Logout endpoint error (ignored):', error);
      }
    }
    
    // Remove token from localStorage
    localStorage.removeItem('authToken');
    localStorage.removeItem('rememberMe');
    
    return { success: true };
  } catch (error) {
    console.error('Error logging out:', error);
    // Still remove token even if API call fails
    clearUserCache();
    localStorage.removeItem('authToken');
    localStorage.removeItem('rememberMe');
    return { success: true };
  }
};

/**
 * Export stores to CSV
 */
export const exportStoresToCSV = async (storeIds) => {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await fetch(`${API_BASE_URL}/stores/export/csv`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ storeIds }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.message || 'Failed to export CSV';
      
      // Check if it's a limit reached error (subscribed user who hit limit)
      if (errorData.limitReached) {
        const error = new Error(errorMessage);
        error.isLimitReached = true;
        throw error;
      }
      
      // Check if it's a free user restriction
      if (errorMessage.includes('Free plan') || errorMessage.includes('not available') || errorMessage.includes('upgrade')) {
        const error = new Error(errorMessage);
        error.isUpgradeRequired = true;
        throw error;
      }
      
      throw new Error(errorMessage);
    }

    // Get the CSV content from response
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `store_links_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    return { success: true };
  } catch (error) {
    console.error('Error exporting CSV:', error);
    throw error;
  }
};

/**
 * Copy store links to clipboard
 */
export const copyStoreLinks = async (storeIds) => {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await fetch(`${API_BASE_URL}/stores/copy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ storeIds }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      // Don't throw error with "Free plan" message - handle it gracefully in component
      const errorMessage = errorData.message || 'Failed to copy links';
      if (errorMessage.includes('Free plan') || errorMessage.includes('not available') || errorMessage.includes('upgrade')) {
        // Return a special error that won't show red card
        const error = new Error(errorMessage);
        error.isUpgradeRequired = true;
        throw error;
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    
    // Copy to clipboard
    await navigator.clipboard.writeText(data.links);
    
    return { success: true, count: data.count };
  } catch (error) {
    console.error('Error copying links:', error);
    throw error;
  }
};

/**
 * Initialize Paystack subscription payment
 */
export const initializeSubscription = async (plan, email, billingCycle = 'monthly') => {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) {
      throw new Error('Authentication required');
    }

    // Add timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); // 25 second timeout

    try {
      const response = await fetch(`${API_BASE_URL}/subscriptions/initialize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ plan, email, billingCycle }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        // Don't throw "Session terminated" error - keep user logged in
        // Just show a generic error message
        const errorMessage = errorData.message || 'Failed to initialize subscription';
        if (errorMessage.includes('Session') || errorMessage.includes('terminated') || errorMessage.includes('log in')) {
          throw new Error('Payment initialization failed. Please try again.');
        }
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        throw new Error('Request timed out. Please try again.');
      }
      throw fetchError;
    }
  } catch (error) {
    console.error('Error initializing subscription:', error);
    
    // Provide more helpful error messages for connection issues
    if (error.message?.includes('timed out') || error.message?.includes('timeout') || error.name === 'AbortError') {
      throw new Error('Request timed out. Please check your connection and try again.');
    } else if (error.message?.includes('Failed to fetch') || 
        error.message?.includes('ERR_CONNECTION_REFUSED') ||
        error.message?.includes('NetworkError') ||
        error.message?.includes('ERR_SSL') ||
        error.name === 'TypeError') {
      throw new Error('Cannot connect to payment server. Please check your internet connection and try again.');
    }
    
    throw error;
  }
};

/**
 * Verify Paystack payment
 */
export const verifySubscription = async (reference, billingCycle = 'monthly') => {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await fetch(`${API_BASE_URL}/subscriptions/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ reference, billingCycle }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to verify subscription');
    }

    return await response.json();
  } catch (error) {
    console.error('Error verifying subscription:', error);
    throw error;
  }
};

/**
 * Toggle auto-renewal for subscription
 */
export const toggleAutoRenew = async () => {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) {
      throw new Error('Authentication required');
    }

    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

    const response = await fetch(`${API_BASE_URL}/subscriptions/toggle-auto-renew`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to toggle auto-renewal');
    }

    return await response.json();
  } catch (error) {
    console.error('Error toggling auto-renewal:', error);
    throw error;
  }
};

/**
 * Cancel subscription
 */
export const cancelSubscription = async () => {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await fetch(`${API_BASE_URL}/subscriptions/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to cancel subscription');
    }

    return await response.json();
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    throw error;
  }
};

/**
 * Get current subscription
 */
export const getCurrentSubscription = async () => {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) {
      return null;
    }

    const response = await fetch(`${API_BASE_URL}/subscriptions/current`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return null;
  }
};
