import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Mail, Loader2 } from "lucide-react";
import { verifyGoogleToken } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { getDeviceId } from "@/utils/deviceId";

const Login = () => {
  // ALL HOOKS MUST BE CALLED FIRST - before any conditional returns
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { login, isAuthenticated, loading: authLoading } = useAuth();

  // Handle Google OAuth callback - use useCallback to ensure stable reference
  const handleGoogleCallback = useCallback(async (idToken) => {
    setGoogleLoading(true);
    try {
      const deviceId = getDeviceId();
      const response = await verifyGoogleToken(idToken, deviceId);
      
      // Use auth context to login
      login(response.user, response.token);

      // Show warning if device limit warning was triggered
      if (response.warning) {
        toast({
          title: "Device Limit Warning",
          description: response.warning,
          variant: "default",
        });
      } else {
        toast({
          title: "Welcome back!",
          description: `Logged in as ${response.user.name}`,
        });
      }

      // Small delay to ensure state is set before navigation
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Navigate to dashboard
      navigate("/dashboard", { replace: true });
    } catch (error) {
      console.error('Google auth error:', error);
      
      // Check if this is a suspension/deactivation error
      if (error.isSuspended || error.accountStatus === 'suspended' || error.accountStatus === 'deactivated') {
        const isDeactivated = error.accountStatus === 'deactivated';
        toast({
          title: isDeactivated ? "Account Deactivated" : "Account Suspended",
          description: error.message || (isDeactivated 
            ? "Your account has been deactivated. You are not allowed to login. Please contact support for assistance."
            : "Your account has been suspended. You are not allowed to use our platform at the moment. Please contact support for assistance."),
          variant: "destructive",
          duration: 10000, // Show for 10 seconds to ensure user sees it
        });
        // Don't navigate - keep user on login page
        return;
      }
      
      // Provide more specific error messages for other errors
      let errorMessage = error.message || "Failed to authenticate with Google";
      
      // Check for specific error types
      if (error.message?.includes('origin') || error.message?.includes('client ID') || error.message?.includes('not allowed')) {
        errorMessage = "Google OAuth origin not configured. Please add http://localhost:8080 to Google Cloud Console. See FIX_GOOGLE_OAUTH_ORIGIN_ERROR.md for instructions.";
      } else if (error.message?.includes('timeout') || error.message?.includes('timed out')) {
        errorMessage = "Request timed out. The server is taking too long to respond. Please try again.";
      } else if (error.message?.includes('Failed to fetch') || error.message?.includes('ERR_CONNECTION_REFUSED')) {
        errorMessage = "Cannot connect to server. Please make sure the backend server is running on port 3000.";
      } else if (error.message?.includes('Token verification failed') || error.message?.includes('Invalid or expired')) {
        errorMessage = "Google token verification failed. Please try signing in again.";
      } else if (error.message?.includes('suspended') || error.message?.includes('deactivated')) {
        // Fallback for suspension messages that might not have the flag
        errorMessage = error.message;
      }
      
      toast({
        title: "Authentication failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setGoogleLoading(false);
    }
  }, [login, navigate, toast]);

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, authLoading, navigate]);

  // Preload Google Identity Services script
  useEffect(() => {
    if (!window.google && !document.querySelector('script[src="https://accounts.google.com/gsi/client"]')) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  }, []);

  // Handle Google OAuth callback from URL params
  useEffect(() => {
    const idToken = searchParams.get('id_token');
    const error = searchParams.get('error');

    if (error) {
      toast({
        title: "Authentication failed",
        description: error,
        variant: "destructive",
      });
      return;
    }

    if (idToken) {
      handleGoogleCallback(idToken);
    }
  }, [searchParams, toast, handleGoogleCallback]);

  // Define all handler functions BEFORE conditional return
  const handleGoogleLogin = () => {
    setGoogleLoading(true);
    
    // Wait for Google script to load if not ready
    if (window.google && window.google.accounts) {
      triggerGoogleSignIn();
    } else {
      // Check if script is loading
      const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
      if (existingScript) {
        // Script is loading, wait for it
        existingScript.onload = () => {
          triggerGoogleSignIn();
        };
      } else {
        // Load Google Identity Services script
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => {
          triggerGoogleSignIn();
        };
        script.onerror = () => {
          setGoogleLoading(false);
          toast({
            title: "Error",
            description: "Failed to load Google Sign-In",
            variant: "destructive",
          });
        };
        document.head.appendChild(script);
      }
    }
  };

  const triggerGoogleSignIn = () => {
    const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    
    if (!GOOGLE_CLIENT_ID) {
      setGoogleLoading(false);
      toast({
        title: "Configuration error",
        description: "Google Client ID not configured. Check your .env file.",
        variant: "destructive",
      });
      console.error('VITE_GOOGLE_CLIENT_ID is not set in environment variables');
      return;
    }

    // Check if Google script is loaded
    if (!window.google || !window.google.accounts || !window.google.accounts.id) {
      setGoogleLoading(false);
      toast({
        title: "Loading...",
        description: "Google Sign-In is still loading. Please wait a moment and try again.",
        variant: "default",
      });
      // Wait a bit and try again
      setTimeout(() => {
        if (window.google && window.google.accounts && window.google.accounts.id) {
          triggerGoogleSignIn();
        } else {
          toast({
            title: "Error",
            description: "Failed to load Google Sign-In. Please refresh the page.",
            variant: "destructive",
          });
        }
      }, 2000);
      return;
    }

    try {
      // Initialize Google Sign-In once
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response) => {
          console.log('Google OAuth callback received');
          if (response.credential) {
            try {
              await handleGoogleCallback(response.credential);
            } catch (error) {
              // Error is already handled in handleGoogleCallback
              setGoogleLoading(false);
            }
          } else {
            console.error('No credential in Google response:', response);
            toast({
              title: "Authentication failed",
              description: "No credential received from Google",
              variant: "destructive",
            });
            setGoogleLoading(false);
          }
        },
        error_callback: (error) => {
          console.error('Google OAuth error:', error);
          setGoogleLoading(false);
          
          let errorMessage = error.message || "Google Sign-In configuration error";
          
          // Provide specific guidance for common errors
          if (error.type === 'popup_closed_by_user') {
            errorMessage = "Sign-in was cancelled. Please try again.";
          } else if (error.message?.includes('origin') || error.message?.includes('client ID') || error.message?.includes('not allowed')) {
            errorMessage = "Google OAuth origin not configured. Please add your origin (http://localhost:8080) to Google Cloud Console. See FIX_GOOGLE_OAUTH_ORIGIN_ERROR.md for instructions.";
          } else if (error.message?.includes('button width') || error.message?.includes('width is invalid')) {
            // This is a harmless warning, don't show it to users
            return;
          }
          
          toast({
            title: "Google Sign-In Error",
            description: errorMessage,
            variant: "destructive",
          });
        },
      });

      // Create a hidden container for the Google button
      let buttonContainer = document.getElementById('hidden-google-button-container');
      if (!buttonContainer) {
        buttonContainer = document.createElement('div');
        buttonContainer.id = 'hidden-google-button-container';
        buttonContainer.style.display = 'none';
        buttonContainer.style.position = 'absolute';
        buttonContainer.style.visibility = 'hidden';
        document.body.appendChild(buttonContainer);
      }

      // Clear any existing button
      buttonContainer.innerHTML = '';

      // Render Google button in hidden container
      // Note: width must be a number, not percentage string
      window.google.accounts.id.renderButton(buttonContainer, {
        theme: 'outline',
        size: 'large',
        // width: removed - let Google use default width
        text: 'signin_with',
      });

      // Find and click the rendered button programmatically
      setTimeout(() => {
        const googleButton = buttonContainer.querySelector('div[role="button"]');
        if (googleButton) {
          // Trigger click on the Google button
          googleButton.click();
          setGoogleLoading(false);
        } else {
          // Fallback: try alternative selector
          const altButton = buttonContainer.querySelector('iframe');
          if (altButton && altButton.contentWindow) {
            // If it's in an iframe, we can't directly click, so use prompt instead
            window.google.accounts.id.prompt();
            setGoogleLoading(false);
          } else {
            setGoogleLoading(false);
            toast({
              title: "Error",
              description: "Failed to initiate Google Sign-In. Please refresh and try again.",
              variant: "destructive",
            });
          }
        }
      }, 100);

    } catch (error) {
      console.error('Error triggering Google Sign-In:', error);
      setGoogleLoading(false);
      toast({
        title: "Sign-In Error",
        description: error.message || "Failed to initiate Google Sign-In. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: "Email required",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      // Send verification code via backend
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
      
      // Add timeout to fetch request - increased for Gmail/SMTP delays
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 second timeout for email sending
      
      const response = await fetch(`${API_BASE_URL}/auth/email/send-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Check if response is ok before parsing JSON
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = { error: `Server error: ${response.status} ${response.statusText}` };
        }
        throw new Error(errorData.error || errorData.message || `Failed to send verification code (${response.status})`);
      }

      const data = await response.json();

      // Store email in localStorage for verification page
      localStorage.setItem('pendingEmailVerification', email);
      
      toast({
        title: "Code sent!",
        description: "Check your email for a 6-digit verification code",
      });

      // Navigate to verification page
      navigate(`/verify-email?email=${encodeURIComponent(email)}`);
    } catch (error) {
      console.error('Email send error:', error);
      
      // Provide more helpful error messages
      let errorMessage = "Failed to send verification code. Please try again.";
      
      if (error.name === 'AbortError') {
        errorMessage = "Request timed out. Please check your internet connection and try again.";
      } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        errorMessage = "Network error. Please check your internet connection and ensure the server is running.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  // Show loading state while checking auth - AFTER all hooks and functions
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" style={{ backgroundColor: '#0a0e1a' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden px-4 bg-gradient-to-br from-[#fafafa] via-[#f5f5f5] to-[#fef9e7] dark:from-gray-950 dark:via-gray-900 dark:to-gray-950" style={{ minHeight: '100vh' }}>
      {/* Background Effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl dark:block hidden" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/10 rounded-full blur-3xl dark:block hidden" />
      
      {/* Logo */}
      <Link to="/" className="absolute top-8 left-8 flex items-center gap-2 z-10">
        <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
          <span className="text-primary-foreground font-light text-sm">SL</span>
        </div>
        <span className="text-xl font-light text-foreground">SneakLink</span>
      </Link>

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md">
        <div className="glass-card p-8 md:p-10 rounded-2xl border border-border/50 backdrop-blur-xl">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-light mb-3 text-foreground">
              Welcome Back
            </h1>
            <p className="text-muted-foreground">
              Enter your email to access your dashboard
            </p>
          </div>

          {/* Google Login Button */}
          <button 
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-border/50 bg-card/50 hover:bg-card/80 transition-all duration-300 mb-6 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleGoogleLogin}
            disabled={googleLoading}
          >
            {googleLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            )}
            <span className="text-foreground font-light">
              {googleLoading ? "Connecting..." : "Continue with Google"}
            </span>
          </button>

          {/* Divider */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-border/50" />
            <span className="text-muted-foreground text-sm">OR</span>
            <div className="flex-1 h-px bg-border/50" />
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Input */}
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="email"
                placeholder="Enter your email address..."
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-6 bg-card/50 border-border/50 rounded-xl text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20 transition-all duration-300"
                required
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full py-6 bg-primary hover:bg-primary/90 text-primary-foreground font-light rounded-xl transition-all duration-300 group"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Sending Code...
                </>
              ) : (
                <>
                  Continue with Email
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>
          </form>
        </div>

        {/* Terms */}
        <p className="text-center text-muted-foreground/60 text-sm mt-6 px-4">
          By logging in, you agree to our{" "}
          <Link to="/terms-of-service" className="text-primary/80 hover:text-primary transition-colors">
            Terms of Use
          </Link>{" "}
          and{" "}
          <Link to="/privacy-policy" className="text-primary/80 hover:text-primary transition-colors">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
};

export default Login;
