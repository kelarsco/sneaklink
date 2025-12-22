import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendContactMessage } from "@/services/api";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export const ContactSupportModal = ({ open, onOpenChange, accountStatus }) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();

  // Pre-fill form with user data if available
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: user.name || "",
        email: user.email || "",
      }));
    }
  }, [user]);

  // Pre-fill subject based on account status
  useEffect(() => {
    if (accountStatus) {
      const statusText = accountStatus === 'suspended' ? 'Suspended' : 'Deactivated';
      setFormData(prev => ({
        ...prev,
        subject: `Account ${statusText} - Support Request`,
        message: prev.message || `Hello,\n\nI received a notification that my account has been ${accountStatus}. I would like to request assistance with this matter.\n\nThank you.`,
      }));
    }
  }, [accountStatus]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.subject || !formData.message) {
      toast({
        title: "Please fill all fields",
        description: "All fields are required to submit a support request.",
        variant: "destructive",
      });
      return;
    }

    // Validate email if accountStatus is provided (suspended/deactivated users)
    if (accountStatus) {
      setSubmitting(true);
      try {
        // Validate email against database
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
        const validateResponse = await fetch(`${API_BASE_URL}/contact/validate-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: formData.email }),
        });

        if (!validateResponse.ok) {
          const errorData = await validateResponse.json();
          toast({
            title: "Email verification failed",
            description: errorData.message || "This email is not linked to any suspended or deactivated account. Please verify you are using the correct email address.",
            variant: "destructive",
          });
          setSubmitting(false);
          return;
        }
      } catch (validationError) {
        console.error('Error validating email:', validationError);
        toast({
          title: "Validation error",
          description: "Unable to verify email. Please try again.",
          variant: "destructive",
        });
        setSubmitting(false);
        return;
      }
    }

    setSubmitting(true);

    try {
      const response = await sendContactMessage({
        name: formData.name,
        email: formData.email,
        subject: formData.subject,
        message: formData.message,
        source: 'homepage',
      });

      toast({
        title: "Support request sent!",
        description: "We've received your message and will get back to you soon.",
      });

      // Reset form
      setFormData({
        name: user?.name || "",
        email: user?.email || "",
        subject: "",
        message: "",
      });

      // Close modal after a short delay
      setTimeout(() => {
        onOpenChange(false);
      }, 1500);
    } catch (error) {
      console.error('Error sending support request:', error);
      toast({
        title: "Failed to send request",
        description: error.message || "Please try again or email us directly at support@sneaklink.app",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Contact Support</DialogTitle>
          <DialogDescription>
            {accountStatus 
              ? `We're here to help with your ${accountStatus === 'suspended' ? 'suspended' : 'deactivated'} account. Please fill out the form below and we'll get back to you as soon as possible.`
              : "Have a question or need help? Send us a message and we'll get back to you soon."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Your name"
              required
              disabled={submitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="your@email.com"
              required
              disabled={submitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="What is this regarding?"
              required
              disabled={submitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Tell us how we can help..."
              rows={6}
              required
              disabled={submitting}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Sending..." : "Send Message"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

