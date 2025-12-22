import { createContext, useContext, useState, useEffect } from 'react';
import { getCurrentUser, logout as logoutApi, checkSession } from '@/services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  // Start with loading false if no token exists (instant render)
  const [loading, setLoading] = useState(() => {
    const token = localStorage.getItem('authToken');
    return !!token; // Only loading if token exists
  });

  // Check if user is logged in on mount - LENIENT: Keep users logged in
  useEffect(() => {
    let mounted = true;
    
    const performAuthCheck = async () => {
      const token = localStorage.getItem('authToken');
      if (!token) {
        if (mounted) {
          setLoading(false);
          setUser(null);
        }
        return;
      }
      
      // Try to get user data - but don't log out on errors
      // Keep users logged in even if there are temporary network issues
      try {
        const currentUser = await getCurrentUser();
        if (mounted) {
          if (currentUser) {
            // Check if user is suspended - force redirect to login
            if (currentUser.accountStatus === 'suspended' || (!currentUser.isActive && currentUser.accountStatus === 'suspended')) {
              // Clear user data and token, redirect to login
              setUser(null);
              localStorage.removeItem('authToken');
              localStorage.removeItem('lastLoginTime');
              if (typeof window !== 'undefined' && window.clearUserCache) {
                window.clearUserCache();
              }
              window.location.href = '/login';
              return;
            }
            setUser(currentUser);
          } else {
            // If we can't get user, don't log out - might be temporary
            // Keep the token and let user stay logged in
            console.warn('User data not available, but keeping session active');
          }
        }
      } catch (error) {
        // Don't log out on errors - keep user logged in
        // Errors might be temporary network issues
        console.warn('Auth check error (keeping session):', error.message);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    // Start auth check immediately
    performAuthCheck();
    
    return () => {
      mounted = false;
    };
  }, []);

  // REMOVED: Periodic session checking that logs users out
  // Users will stay logged in until they explicitly log out
  // Sessions are managed by the backend and don't need constant validation

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setLoading(false);
        setUser(null);
        return;
      }
      
      // Try to get user data
      try {
        const currentUser = await getCurrentUser();
        if (currentUser) {
          // Check if user is suspended - force redirect to login
          if (currentUser.accountStatus === 'suspended' || (!currentUser.isActive && currentUser.accountStatus === 'suspended')) {
            // Clear user data and token, redirect to login
            setUser(null);
            localStorage.removeItem('authToken');
            localStorage.removeItem('lastLoginTime');
            if (typeof window !== 'undefined' && window.clearUserCache) {
              window.clearUserCache();
            }
            if (typeof window !== 'undefined') {
              window.location.href = '/login';
            }
            return;
          }
          setUser(currentUser);
        }
        // If currentUser is null (user suspended), getCurrentUser already handled redirect
      } catch (error) {
        // If error indicates suspension, getCurrentUser should have handled redirect
        // Otherwise, don't log out on other errors - might be temporary network issues
        if (!error.message?.includes('suspended') && !error.message?.includes('deactivated')) {
          console.warn('Auth check error (keeping session):', error.message);
        }
      }
    } catch (error) {
      // Don't log out on errors - keep user logged in
      console.warn('Auth check error (keeping session):', error.message);
    } finally {
      setLoading(false);
    }
  };

  const login = (userData, token) => {
    localStorage.setItem('authToken', token);
    localStorage.setItem('lastLoginTime', Date.now().toString()); // Track login time
    setUser(userData);
    // Clear any cached user data
    if (typeof window !== 'undefined' && window.clearUserCache) {
      window.clearUserCache();
    }
  };

  const logout = async () => {
    try {
      await logoutApi();
      setUser(null);
      localStorage.removeItem('authToken');
      localStorage.removeItem('lastLoginTime'); // Clear login timestamp
      // Clear user cache
      if (typeof window !== 'undefined' && window.clearUserCache) {
        window.clearUserCache();
      }
      // Navigation will be handled by the component
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear user state even if API call fails
      setUser(null);
      localStorage.removeItem('authToken');
      localStorage.removeItem('lastLoginTime'); // Clear login timestamp
      // Clear user cache
      if (typeof window !== 'undefined' && window.clearUserCache) {
        window.clearUserCache();
      }
    }
  };

  const value = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
