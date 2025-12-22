import { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";

const NavigationLoader = ({ children }) => {
  const location = useLocation();
  const [isNavigating, setIsNavigating] = useState(false);
  const prevPathRef = useRef(location.pathname);
  const timeoutRef = useRef(null);

  useEffect(() => {
    // Check if we're navigating away from the homepage
    const wasHomePage = prevPathRef.current === "/";
    const isDifferentPath = location.pathname !== prevPathRef.current;

    if (wasHomePage && isDifferentPath) {
      setIsNavigating(true);
      
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Hide preloader after page has time to render
      timeoutRef.current = setTimeout(() => {
        setIsNavigating(false);
        prevPathRef.current = location.pathname;
      }, 600);
    } else {
      // If we're already on a different page, update the ref immediately
      prevPathRef.current = location.pathname;
      setIsNavigating(false);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [location.pathname]);

  return (
    <>
      {isNavigating && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/95 backdrop-blur-sm animate-fade-in">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground text-sm">Loading...</p>
          </div>
        </div>
      )}
      {children}
    </>
  );
};

export default NavigationLoader;

