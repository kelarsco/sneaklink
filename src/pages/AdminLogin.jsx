import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Shield, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { verifyAdminTotp, staffLogin } from "@/services/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const AdminLogin = () => {
  const [code, setCode] = useState("");
  const [staffEmail, setStaffEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [staffLoading, setStaffLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!code || code.length !== 6) {
      toast({
        title: "Invalid code",
        description: "Please enter a valid 6-digit code from Google Authenticator",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      const response = await verifyAdminTotp(code);

      // Store admin token and user info
      localStorage.setItem('adminToken', response.token);
      localStorage.setItem('adminUser', JSON.stringify(response.user));
      localStorage.setItem('adminLastLoginTime', Date.now().toString()); // Track admin login time

      toast({
        title: "Welcome Admin!",
        description: "Successfully authenticated",
      });

      // Check for redirect URL and ticket ID from query params
      const redirectPath = searchParams.get('redirect');
      const ticketId = searchParams.get('ticket');
      
      // Build navigation path
      let navPath = redirectPath || "/manager";
      
      // If ticket ID is provided, append it to the support page URL
      if (ticketId && redirectPath === '/manager/support') {
        navPath = `/manager/support?ticket=${ticketId}`;
      } else if (ticketId && !redirectPath) {
        // If only ticket ID provided, go to support page with ticket
        navPath = `/manager/support?ticket=${ticketId}`;
      }

      // Navigate to admin dashboard or specified redirect
      navigate(navPath);
    } catch (error) {
      console.error('Admin TOTP verification error:', error);
      
      // Clear the code field on error
      setCode("");
      
      // Extract error message
      let errorMessage = error.message || "Invalid code. Please check your Google Authenticator app and try again.";
      
      // Provide more helpful error messages
      if (errorMessage.includes('expired') || errorMessage.includes('invalid')) {
        errorMessage = "The code has expired or is invalid. Codes change every 30 seconds. Please: 1) Check your phone's time is synchronized, 2) Wait for a new code, 3) Enter the current 6-digit code from Google Authenticator.";
      }
      
      toast({
        title: "Authentication failed",
        description: errorMessage,
        variant: "destructive",
        duration: 5000, // Show for 5 seconds
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStaffLogin = async (e) => {
    e.preventDefault();
    
    if (!staffEmail || !staffEmail.includes('@')) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    setStaffLoading(true);
    
    try {
      const response = await staffLogin(staffEmail);

      // Store token and user info
      if (response.token) {
        localStorage.setItem('authToken', response.token);
        localStorage.setItem('adminToken', response.token);
        localStorage.setItem('adminLastLoginTime', Date.now().toString()); // Track admin login time
      }
      
      if (response.user) {
        localStorage.setItem('adminUser', JSON.stringify(response.user));
      }

      // Store staff info if staff login
      if (response.staff) {
        localStorage.setItem('staffInfo', JSON.stringify(response.staff));
      }

      toast({
        title: "Welcome Staff!",
        description: "Successfully logged in",
      });

      // Navigate to admin dashboard
      const redirectPath = searchParams.get('redirect');
      navigate(redirectPath || "/manager");
    } catch (error) {
      console.error('Staff login error:', error);
      
      setStaffEmail("");
      
      toast({
        title: "Login failed",
        description: error.message || "Failed to login. Please make sure you've accepted your invitation.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setStaffLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden px-4" style={{ minHeight: '100vh', backgroundColor: '#0a0e1a', color: '#ffffff' }}>
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-background to-background" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/10 rounded-full blur-3xl" />
      
      {/* Logo */}
      <div className="absolute top-8 left-8 flex items-center gap-2 z-10" style={{ color: '#ffffff' }}>
        <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
          <span className="text-primary-foreground font-light text-sm">SL</span>
        </div>
        <span className="text-xl font-light text-foreground">SneakLink Admin</span>
      </div>

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md">
        <div className="glass-card p-8 md:p-10 rounded-2xl border border-border/50 backdrop-blur-xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl md:text-4xl font-light mb-3" style={{ color: '#ffffff' }}>
              Admin Access
            </h1>
          </div>

          {/* Tabs for Admin and Staff Login */}
          <Tabs defaultValue="admin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 bg-card/50">
              <TabsTrigger value="admin" className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Admin
              </TabsTrigger>
              <TabsTrigger value="staff" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Staff
              </TabsTrigger>
            </TabsList>

            {/* Admin TOTP Login */}
            <TabsContent value="admin" className="space-y-6">
              <p style={{ color: '#9ca3af' }} className="text-center mb-4">
              Enter your 6-digit code from Google Authenticator
            </p>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="totp-code" className="text-sm font-light text-foreground">
                Authentication Code
              </label>
              <Input
                id="totp-code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                placeholder="000000"
                value={code}
                onChange={(e) => {
                  // Only allow numbers
                  const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setCode(value);
                }}
                className="w-full text-center text-2xl tracking-widest font-mono py-6 bg-card/50 border-border/50 rounded-xl text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20 transition-all duration-300"
                required
                autoFocus
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground text-center">
                Enter the 6-digit code from your Google Authenticator app
              </p>
            </div>

            <Button
              type="submit"
              className="w-full py-6 bg-primary hover:bg-primary/90 text-primary-foreground font-light rounded-xl transition-all duration-300"
              disabled={loading || code.length !== 6}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
            </TabsContent>

            {/* Staff Email Login */}
            <TabsContent value="staff" className="space-y-6">
              <p style={{ color: '#9ca3af' }} className="text-center mb-4">
                Enter your email to login (no password required)
              </p>
              <form onSubmit={handleStaffLogin} className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="staff-email" className="text-sm font-light text-foreground">
                    Email Address
                  </label>
                  <Input
                    id="staff-email"
                    type="email"
                    placeholder="staff@example.com"
                    value={staffEmail}
                    onChange={(e) => setStaffEmail(e.target.value)}
                    className="w-full py-6 bg-card/50 border-border/50 rounded-xl text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20 transition-all duration-300"
                    required
                    disabled={staffLoading}
                  />
                  <p className="text-xs text-muted-foreground text-center">
                    Make sure you've accepted your invitation email first
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full py-6 bg-primary hover:bg-primary/90 text-primary-foreground font-light rounded-xl transition-all duration-300"
                  disabled={staffLoading || !staffEmail.includes('@')}
                >
                  {staffLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Logging in...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
