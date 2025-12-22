import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Sun, Moon, MessageSquare, X, Send } from "lucide-react";
import { useTheme } from "next-themes";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { sendContactMessage } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const FloatingActivityCenter = () => {
  const location = useLocation();
  // Check if we're on an admin page
  const isAdminPage = location.pathname.startsWith('/manager');
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const { toast } = useToast();
  const [showSupportDialog, setShowSupportDialog] = useState(false);
  const [supportForm, setSupportForm] = useState({
    email: '',
    subject: '',
    message: '',
  });
  const [loading, setLoading] = useState(false);

  // Reset form when dialog closes
  useEffect(() => {
    if (!showSupportDialog) {
      setSupportForm({ email: '', subject: '', message: '' });
    }
  }, [showSupportDialog]);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleSupportSubmit = async (e) => {
    e.preventDefault();
    
    // Determine which email to use
    const userEmail = user?.email || supportForm.email;
    
    // Validate required fields based on login status
    if (!user && !supportForm.email) {
      toast({
        title: "Validation Error",
        description: "Please fill in your email address.",
        variant: "destructive",
      });
      return;
    }
    
    if (!supportForm.subject || !supportForm.message) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    // Validate email format if not logged in
    if (!user && supportForm.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(supportForm.email)) {
        toast({
          title: "Validation Error",
          description: "Please enter a valid email address.",
          variant: "destructive",
        });
        return;
      }
    }

    setLoading(true);
    try {
      const response = await sendContactMessage({
        name: user?.name || 'User',
        email: userEmail,
        subject: supportForm.subject,
        message: supportForm.message,
        source: 'account',
      });

      if (!response.success) {
        throw new Error(response.message || 'Failed to create ticket');
      }
      
      const ticketId = response.ticketId;
      
      toast({
        title: "Ticket Created",
        description: `Support ticket ${ticketId} has been created. We'll get back to you soon!`,
      });
      
      setSupportForm({ email: '', subject: '', message: '' });
      setShowSupportDialog(false);
    } catch (error) {
      console.error('Error creating support ticket:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send support request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Activity Center */}
      <div className="fixed bottom-[20%] right-6 z-[9999] flex flex-col gap-3">
        {/* Theme Toggle Button - Hide on admin pages */}
        {!isAdminPage && (
          <button
            onClick={toggleTheme}
            className="glass-panel p-4 rounded-full border border-border/50 backdrop-blur-xl hover:border-primary/50 hover:shadow-lg transition-all duration-300 group"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5 text-foreground group-hover:text-primary transition-colors" />
            ) : (
              <Moon className="w-5 h-5 text-foreground group-hover:text-primary transition-colors" />
            )}
          </button>
        )}

        {/* Contact Support Button - Hide on admin pages */}
        {!isAdminPage && (
          <button
            onClick={() => setShowSupportDialog(true)}
            className="glass-panel p-4 rounded-full border border-border/50 backdrop-blur-xl hover:border-primary/50 hover:shadow-lg transition-all duration-300 group"
            aria-label="Contact support"
          >
            <MessageSquare className="w-5 h-5 text-foreground group-hover:text-primary transition-colors" />
          </button>
        )}
      </div>

      {/* Support Dialog */}
      <Dialog open={showSupportDialog} onOpenChange={setShowSupportDialog}>
        <DialogContent className="glass-card border-border/50 backdrop-blur-xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-light text-foreground">
              Contact Support
            </DialogTitle>
          </DialogHeader>
          
          <div className="mt-4">
            <p className="text-sm text-muted-foreground mb-6">
              Have a question or need help? Send us a message and we'll get back to you as soon as possible.
            </p>

            <form onSubmit={handleSupportSubmit} className="space-y-4">
              {/* Email field - only show if user is not logged in */}
              {!user && (
                <div>
                  <label htmlFor="support-email" className="block text-sm font-light text-foreground mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    id="support-email"
                    value={supportForm.email}
                    onChange={(e) => setSupportForm({ ...supportForm, email: e.target.value })}
                    className="w-full px-4 py-2 bg-secondary/50 border border-border/50 rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                    placeholder="your.email@example.com"
                    required={!user}
                  />
                </div>
              )}

              <div>
                <label htmlFor="support-subject" className="block text-sm font-light text-foreground mb-2">
                  Subject
                </label>
                <input
                  type="text"
                  id="support-subject"
                  value={supportForm.subject}
                  onChange={(e) => setSupportForm({ ...supportForm, subject: e.target.value })}
                  className="w-full px-4 py-2 bg-secondary/50 border border-border/50 rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                  placeholder="What can we help you with?"
                  required
                />
              </div>

              <div>
                <label htmlFor="support-message" className="block text-sm font-light text-foreground mb-2">
                  Message
                </label>
                <textarea
                  id="support-message"
                  value={supportForm.message}
                  onChange={(e) => setSupportForm({ ...supportForm, message: e.target.value })}
                  rows={6}
                  className="w-full px-4 py-2 bg-secondary/50 border border-border/50 rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary resize-none"
                  placeholder="Please describe your issue or question in detail..."
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowSupportDialog(false)}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {loading ? (
                    <>
                      <Send className="w-4 h-4 mr-2 animate-pulse" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Message
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
