import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

const AdminProtectedRoute = ({ children }) => {
  const location = useLocation();
  const [isValidating, setIsValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const adminToken = localStorage.getItem('adminToken');
  const adminUser = localStorage.getItem('adminUser');

  useEffect(() => {
    const validateAdminSession = async () => {
      // No token or user - invalid
      if (!adminToken || !adminUser) {
        setIsValid(false);
        setIsValidating(false);
        return;
      }

      // If token and user exist, trust them and allow access
      // Don't validate with backend - keep admin logged in
      // Only check if token exists, not if it's valid
      setIsValid(true);
      setIsValidating(false);
    };

    validateAdminSession();
  }, [adminToken, adminUser, location.pathname]);

  // Show loading while validating
  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground text-sm">Verifying admin session...</p>
        </div>
      </div>
    );
  }

  if (!isValid) {
    // Redirect to admin login with return URL
    return <Navigate to="/manager/login" state={{ from: location }} replace />;
  }

  return children;
};

export default AdminProtectedRoute;
