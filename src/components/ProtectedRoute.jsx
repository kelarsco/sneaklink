import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { checkSession } from '@/services/api';

const ProtectedRoute = ({ children }) => {
  const [isValidating, setIsValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const location = useLocation();
  const token = localStorage.getItem('authToken');

  useEffect(() => {
    const validateSession = async () => {
      // No token - invalid
      if (!token) {
        setIsValid(false);
        setIsValidating(false);
        return;
      }

      // Check user status from API to see if they're suspended
      try {
        const { getCurrentUser } = await import('@/services/api');
        const currentUser = await getCurrentUser();
        
        // If user is suspended, redirect to login
        if (currentUser && (currentUser.accountStatus === 'suspended' || (!currentUser.isActive && currentUser.accountStatus === 'suspended'))) {
          localStorage.removeItem('authToken');
          localStorage.removeItem('lastLoginTime');
          if (typeof window !== 'undefined' && window.clearUserCache) {
            window.clearUserCache();
          }
          setIsValid(false);
          setIsValidating(false);
          window.location.href = '/login';
          return;
        }
      } catch (error) {
        // If we can't check, allow access (might be temporary network issue)
        console.warn('Could not validate user status:', error.message);
      }

      // If token exists and user is not suspended, allow access
      setIsValid(true);
      setIsValidating(false);
    };

    validateSession();
  }, [token, location.pathname]);

  // Show loading while validating
  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground text-sm">Verifying session...</p>
        </div>
      </div>
    );
  }

  // No valid session - redirect to login
  if (!isValid) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Valid session - render children
  return children;
};

export default ProtectedRoute;
