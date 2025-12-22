import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Mail, Loader2, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { verifyEmailCode } from "@/services/api";
import { getDeviceId } from "@/utils/deviceId";

const EmailVerification = () => {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [email, setEmail] = useState("");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { login } = useAuth();
  const codeInputRef = useRef(null);

  useEffect(() => {
    // Get email from URL params or localStorage
    const emailParam = searchParams.get('email');
    const storedEmail = localStorage.getItem('pendingEmailVerification');
    
    if (emailParam) {
      setEmail(emailParam);
      localStorage.setItem('pendingEmailVerification', emailParam);
    } else if (storedEmail) {
      setEmail(storedEmail);
    } else {
      // No email found, redirect to login
      toast({
        title: "Error",
        description: "No email found. Please start the login process again.",
        variant: "destructive",
      });
      navigate('/login');
    }

    // Focus on code input when component mounts
    if (codeInputRef.current) {
      codeInputRef.current.focus();
    }
  }, [searchParams, navigate, toast]);

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleVerify = async (e) => {
    e.preventDefault();
    
    if (!code || code.length !== 6) {
      toast({
        title: "Invalid code",
        description: "Please enter a 6-digit verification code",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      // Verify the code with backend (normalize email and code)
      const normalizedEmail = email?.toLowerCase().trim();
      const normalizedCode = code.trim();
      
      if (!normalizedEmail) {
        toast({
          title: "Error",
          description: "Email is required",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      
      const deviceId = getDeviceId();
      const response = await verifyEmailCode(normalizedEmail, normalizedCode, deviceId);
      
      // Use auth context to login (this will set lastLoginTime)
      login(response.user, response.token);
      
      // Clear pending email from localStorage
      localStorage.removeItem('pendingEmailVerification');
      
      // Show warning if device limit warning was triggered
      if (response.warning) {
        toast({
          title: "Device Limit Warning",
          description: response.warning,
          variant: "default",
        });
      } else {
        toast({
          title: "Welcome!",
          description: `Logged in as ${response.user.email}`,
        });
      }

      // Small delay to ensure state is set before navigation
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Navigate to dashboard
      navigate("/dashboard", { replace: true });
    } catch (error) {
      console.error('Email verification error:', error);
      toast({
        title: "Verification failed",
        description: error.message || "Invalid verification code. Please try again.",
        variant: "destructive",
      });
      setCode("");
      if (codeInputRef.current) {
        codeInputRef.current.focus();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!email) {
      toast({
        title: "Error",
        description: "No email found. Please start the login process again.",
        variant: "destructive",
      });
      navigate('/login');
      return;
    }

    setResending(true);
    
    try {
      // Resend verification code via backend
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
      const response = await fetch(`${API_BASE_URL}/auth/email/send-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to resend code');
      }

      // Set 5 minute countdown
      setCountdown(300); // 5 minutes in seconds
      
      toast({
        title: "Code sent",
        description: "A new verification code has been sent to your email.",
      });
    } catch (error) {
      console.error('Resend code error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to resend code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setResending(false);
    }
  };

  const formatCountdown = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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

      {/* Verification Card */}
      <div className="relative z-10 w-full max-w-md">
        <div className="glass-card p-8 md:p-10 rounded-2xl border border-border/50 backdrop-blur-xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl md:text-4xl font-light mb-3 text-foreground">
              Check Your Email
            </h1>
            <p className="text-muted-foreground">
              We sent a 6-digit verification code to
            </p>
            <p className="font-light text-primary mt-2">{email}</p>
            <p className="text-sm text-muted-foreground mt-2">
              Code expires in 5 minutes
            </p>
          </div>

          {/* Verification Form */}
          <form onSubmit={handleVerify} className="space-y-6">
            {/* Code Input */}
            <div className="relative">
              <Input
                ref={codeInputRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Enter 6-digit code"
                value={code}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setCode(value);
                }}
                className="w-full text-center text-2xl tracking-widest py-6 bg-card/50 border-border/50 rounded-xl text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20 transition-all duration-300"
                required
                maxLength={6}
                autoComplete="one-time-code"
              />
            </div>

            {/* Resend Code */}
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">
                Didn't receive the code?
              </p>
              {countdown > 0 ? (
                <p className="text-sm text-muted-foreground">
                  Resend code in {formatCountdown(countdown)}
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={resending}
                  className="text-sm text-primary hover:text-primary/80 font-light transition-colors disabled:opacity-50"
                >
                  {resending ? "Sending..." : "Resend Code"}
                </button>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full py-6 bg-primary hover:bg-primary/90 text-primary-foreground font-light rounded-xl transition-all duration-300 group"
              disabled={loading || code.length !== 6}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  Verify Code
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>
          </form>

          {/* Back to Login */}
          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailVerification;
