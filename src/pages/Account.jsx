import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Header } from "@/components/dashboard/Header";
import { Button } from "@/components/ui/button";
import { Check, X, Crown, Sparkles, Zap, ExternalLink, Calendar, CreditCard, Mail, MessageSquare, Send, ArrowLeft, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { sendContactMessage, getUserTickets, getTicket, replyToTicket, toggleAutoRenew } from "@/services/api";

const Account = () => {
  // Get auth state from context
  const { user, loading: authLoading, checkAuth } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Check URL params for tab
  const tabFromUrl = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabFromUrl || 'account');
  const [billingCycle, setBillingCycle] = useState('monthly');

  // Update active tab when URL param changes (but don't interfere with user clicks)
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['account', 'plans', 'support'].includes(tab)) {
      setActiveTab(tab);
    } else if (!tab) {
      // If no tab in URL, default to account
      setActiveTab('account');
    }
  }, [searchParams]);
  
  // Handle tab change - update both state and URL
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('tab', tab);
    setSearchParams(newSearchParams, { replace: true });
  };
  const [loading, setLoading] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const mountTimeRef = useRef(Date.now());
  const [supportForm, setSupportForm] = useState({
    subject: '',
    message: '',
  });
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketReply, setTicketReply] = useState('');
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [viewedTickets, setViewedTickets] = useState(() => {
    // Load viewed tickets from localStorage
    const stored = localStorage.getItem('userViewedTickets');
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });

  // Load tickets when support tab is active
  useEffect(() => {
    if (activeTab === 'support') {
      loadTickets();
      
      // Check if there's a ticket ID in URL params
      const ticketId = searchParams.get('ticket');
      if (ticketId && !selectedTicket) {
        loadTicket(ticketId);
      }
    }
  }, [activeTab, searchParams]);

  // Reset selected ticket when tab changes
  useEffect(() => {
    if (activeTab !== 'support') {
      setSelectedTicket(null);
      setTicketReply('');
    }
  }, [activeTab]);

  const loadTickets = async () => {
    try {
      setLoadingTickets(true);
      const response = await getUserTickets();
      const ticketsList = response.tickets || [];
      setTickets(ticketsList);
      
      // Clean up viewed tickets that no longer exist
      const ticketIds = new Set(ticketsList.map(t => t.id));
      const cleanedViewed = new Set(Array.from(viewedTickets).filter(id => ticketIds.has(id)));
      if (cleanedViewed.size !== viewedTickets.size) {
        setViewedTickets(cleanedViewed);
        localStorage.setItem('userViewedTickets', JSON.stringify(Array.from(cleanedViewed)));
      }
    } catch (error) {
      console.error('❌ Error loading tickets:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load your support tickets",
        variant: "destructive",
      });
    } finally {
      setLoadingTickets(false);
    }
  };

  const loadTicket = async (ticketId) => {
    // Mark ticket as viewed when loading it
    const newViewed = new Set(viewedTickets);
    newViewed.add(ticketId);
    setViewedTickets(newViewed);
    localStorage.setItem('userViewedTickets', JSON.stringify(Array.from(newViewed)));
    try {
      const ticket = await getTicket(ticketId);
      setSelectedTicket(ticket);
    } catch (error) {
      console.error('Error loading ticket:', error);
      toast({
        title: "Error",
        description: "Failed to load ticket",
        variant: "destructive",
      });
    }
  };

  const handleTicketReply = async (e) => {
    e.preventDefault();
    if (!ticketReply.trim() || !selectedTicket) return;
    
    try {
      setLoading(true);
      await replyToTicket(selectedTicket.id, ticketReply);
      toast({
        title: "Reply Sent",
        description: "Your reply has been sent successfully",
      });
      setTicketReply('');
      
      // Mark ticket as viewed when customer replies
      if (selectedTicket && typeof selectedTicket === 'object' && selectedTicket.id) {
        const newViewed = new Set(viewedTickets);
        newViewed.add(selectedTicket.id);
        setViewedTickets(newViewed);
        localStorage.setItem('userViewedTickets', JSON.stringify(Array.from(newViewed)));
      }
      
      // Reload ticket to get updated replies
      await loadTicket(selectedTicket.id);
      await loadTickets();
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to send reply",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'open':
        return <AlertCircle className="w-4 h-4 text-blue-500" />;
      case 'in-progress':
        return <Clock className="w-4 h-4 text-orange-500" />;
      case 'resolved':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'closed':
        return <X className="w-4 h-4 text-gray-500" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'in-progress':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'resolved':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'closed':
        return 'bg-gray-50 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  // Ensure spinner shows for at least 3 seconds, max 5 seconds
  useEffect(() => {
    let minTimeoutId;
    let maxTimeoutId;

    if (authLoading) {
      // Still loading - set up timeouts
      minTimeoutId = setTimeout(() => {
        if (!authLoading) {
          setShowContent(true);
        }
      }, 3000);

      maxTimeoutId = setTimeout(() => {
        setShowContent(true);
      }, 5000);
    } else {
      // Auth finished - check if we've shown spinner for at least 3 seconds
      const elapsed = Date.now() - mountTimeRef.current;
      if (elapsed >= 3000) {
        // Already been 3+ seconds, show content immediately
        setShowContent(true);
      } else {
        // Wait until 3 seconds have passed from mount
        minTimeoutId = setTimeout(() => {
          setShowContent(true);
        }, 3000 - elapsed);
      }
    }

    return () => {
      if (minTimeoutId) clearTimeout(minTimeoutId);
      if (maxTimeoutId) clearTimeout(maxTimeoutId);
    };
  }, [authLoading]);

  // Get user's current plan
  const currentPlan = user?.subscriptionPlan || user?.subscription?.plan || 'free';
  const subscriptionStatus = user?.subscriptionStatus || user?.subscription?.status || 'active';
  const subscriptionEndDate = user?.subscriptionEndDate || user?.subscription?.endDate;
  const autoRenew = user?.subscriptionAutoRenew ?? user?.subscription?.autoRenew ?? false;

  // Format expiration date
  const formatExpirationDate = (date) => {
    if (!date) return null;
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  // Check if subscription is expiring soon (within 7 days)
  const isExpiringSoon = subscriptionEndDate && new Date(subscriptionEndDate) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const plans = [
    {
      id: 'starter',
      name: 'Starter',
      monthlyPrice: 49,
      annualPrice: 490, // 10 months (2 months free)
      description: 'Perfect for individual researchers',
      features: [
        { text: '1,000 filter queries / month', included: true },
        { text: '2 CSV exports / day', included: true },
        { text: '2 copy operations / day', included: true },
        { text: '1 device', included: true },
        { text: '200 links per CSV', included: true },
        { text: 'Access to all filters', included: true },
      ],
      icon: Sparkles,
      popular: false,
    },
    {
      id: 'pro',
      name: 'Pro',
      monthlyPrice: 79,
      annualPrice: 790, // 10 months (2 months free)
      description: 'Best for growing teams',
      features: [
        { text: '10,000 filter queries / month', included: true },
        { text: '10 CSV exports / day', included: true },
        { text: '5 copy operations / day', included: true },
        { text: 'Up to 3 devices', included: true },
        { text: '500 links per CSV', included: true },
        { text: 'Priority support', included: true },
      ],
      icon: Crown,
      popular: true,
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      monthlyPrice: 199,
      annualPrice: 1990, // 10 months (2 months free)
      description: 'For large organizations',
      features: [
        { text: 'Unlimited filter queries', included: true },
        { text: 'Unlimited CSV exports', included: true },
        { text: 'Unlimited copy operations', included: true },
        { text: 'Up to 10 devices', included: true },
        { text: 'Unlimited links per CSV', included: true },
        { text: 'Dedicated support', included: true },
      ],
      icon: Zap,
      popular: false,
    },
  ];

  const handleSubscribe = async (planId) => {
    if (planId === currentPlan) {
      toast({
        title: "Already on this plan",
        description: `You're currently on the ${planId} plan.`,
      });
      return;
    }

    // Navigate to payment page with both plan and billing cycle
    navigate(`/payment?plan=${planId}&billing=${billingCycle}`);
  };

  const handleToggleAutoRenew = async () => {
    try {
      setLoading(true);
      const response = await toggleAutoRenew();
      
      if (response.success) {
        toast({
          title: "Auto-renewal updated",
          description: `Auto-renewal ${response.autoRenew ? 'enabled' : 'disabled'} successfully.`,
        });
        
        // Reload the page to update the button state
        setTimeout(() => {
          window.location.reload();
        }, 500); // Small delay to show the toast message
      } else {
        throw new Error(response.message || 'Failed to update auto-renewal');
      }
    } catch (error) {
      console.error('Error toggling auto-renewal:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update auto-renewal setting. Please try again.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const handleSupportSubmit = async (e) => {
    e.preventDefault();
    if (!supportForm.subject || !supportForm.message) {
      toast({
        title: "Validation Error",
        description: "Please fill in all fields.",
        variant: "destructive",
      });
      return;
    }

    if (!user?.email) {
      toast({
        title: "Validation Error",
        description: "Your account email is required to send support messages.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await sendContactMessage({
        name: user?.name || 'Account User',
        email: user.email,
        subject: supportForm.subject,
        message: supportForm.message,
        source: 'account',
      });

      if (!response.success) {
        throw new Error(response.message || 'Failed to create ticket');
      }
      
      const ticketId = response.ticketId;
      if (!ticketId) {
        throw new Error('Ticket ID not returned from server');
      }
      
      toast({
        title: "Ticket Created",
        description: `Support ticket ${ticketId} has been created. We'll get back to you soon!`,
      });
      setSupportForm({ subject: '', message: '' });
      setSelectedTicket(null); // Reset to show list view
      
      // Reload tickets to show the new one
      await loadTickets();
      
      // Wait a moment for the ticket to appear in the list, then find and show it
      setTimeout(async () => {
        try {
          const refreshedTickets = await getUserTickets();
          const newTicket = refreshedTickets.tickets?.find(t => t.ticketId === ticketId);
          if (newTicket) {
            setSelectedTicket(newTicket);
            navigate(`/account?tab=support&ticket=${newTicket.id}`, { replace: true });
          } else if (response.ticket) {
            // Fallback: use ticket from response if available
            setSelectedTicket(response.ticket);
            navigate(`/account?tab=support&ticket=${response.ticket.id}`, { replace: true });
          }
        } catch (err) {
          console.error('Error loading new ticket:', err);
        }
      }, 1000);
    } catch (error) {
      console.error('❌ Error creating support ticket:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send support request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Show preloader for at least 3 seconds (max 5 seconds)
  if (!showContent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground text-sm">Loading account...</p>
        </div>
      </div>
    );
  }

  // Always render content - no conditions blocking display
  return (
    <div className="min-h-screen bg-background" style={{ minHeight: '100vh', display: 'block', visibility: 'visible', opacity: 1 }}>
      <Header />
      <main className="pt-16 px-6 pb-12" style={{ paddingTop: '10vh', paddingBottom: '3rem', display: 'block', width: '100%', visibility: 'visible' }}>
        <div className="max-w-6xl mx-auto" style={{ display: 'block', width: '100%' }}>
            {/* Back to Dashboard */}
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6 group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span className="text-sm font-light">Back to Dashboard</span>
            </button>
            
            {/* Page Header */}
            <div className="mb-8" style={{ display: 'block', visibility: 'visible' }}>
              <h1 className="text-3xl font-light text-foreground mb-2" style={{ display: 'block', color: '#ffffff' }}>Account</h1>
              <p className="text-muted-foreground" style={{ display: 'block', color: '#9ca3af' }}>Manage your account settings, plans, and get support</p>
            </div>

            {/* Tabs */}
            <div className="mb-6 border-b border-border/50">
              <div className="flex gap-2">
                <button
                  onClick={() => handleTabChange('account')}
                  className={`px-4 py-2 font-light text-sm transition-all border-b-2 ${
                    activeTab === 'account'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Account
                </button>
                <button
                  onClick={() => handleTabChange('plans')}
                  className={`px-4 py-2 font-light text-sm transition-all border-b-2 ${
                    activeTab === 'plans'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Manage Plans
                </button>
                <button
                  onClick={() => handleTabChange('support')}
                  className={`px-4 py-2 font-light text-sm transition-all border-b-2 ${
                    activeTab === 'support'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Contact Support
                </button>
              </div>
            </div>

            {/* Account Tab */}
            {activeTab === 'account' && (
              <div className="glass-card p-6 rounded-xl border border-border/50">
                <h2 className="text-xl font-light text-foreground mb-6">Account Information</h2>
                <div className="space-y-6">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Email</p>
                    <p className="text-base font-light text-foreground">{user?.email || 'No email'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Name</p>
                    <p className="text-base font-light text-foreground">{user?.name || 'No name'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Current Plan</p>
                    <div className="flex items-center gap-2">
                      {currentPlan === 'starter' ? (
                        <Sparkles className="w-4 h-4 text-primary" />
                      ) : currentPlan === 'pro' ? (
                        <Crown className="w-4 h-4 text-primary" />
                      ) : currentPlan === 'enterprise' ? (
                        <Zap className="w-4 h-4 text-primary" />
                      ) : (
                        <Sparkles className="w-4 h-4 text-muted-foreground" />
                      )}
                      <p className="text-base font-light text-foreground capitalize">{currentPlan || 'Free'} Plan</p>
                    </div>
                  </div>
                  {user?.picture && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Profile Picture</p>
                      <img 
                        src={user.picture} 
                        alt={user.name}
                        className="w-20 h-20 rounded-full"
                      />
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Member Since</p>
                    <p className="text-base font-light text-foreground">
                      {user?.createdAt 
                        ? formatExpirationDate(user.createdAt)
                        : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Manage Plans Tab */}
            {activeTab === 'plans' && (
              <div>
                {/* Billing Cycle Toggle */}
                <div className="flex items-center justify-center gap-4 mb-8">
                  <button
                    onClick={() => setBillingCycle('monthly')}
                    className={`px-4 py-2 rounded-lg font-light transition-all ${
                      billingCycle === 'monthly'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary/50 text-muted-foreground hover:bg-secondary/80'
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setBillingCycle('annually')}
                    className={`px-4 py-2 rounded-lg font-light transition-all relative ${
                      billingCycle === 'annually'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary/50 text-muted-foreground hover:bg-secondary/80'
                    }`}
                  >
                    Annually
                    {billingCycle === 'monthly' && (
                      <span className="absolute -top-1 -right-1 bg-green-500 text-white text-[9px] leading-tight px-1.5 py-0.5 rounded-full font-light whitespace-nowrap">
                        2 MONTHS FREE
                      </span>
                    )}
                  </button>
                </div>
                {/* Current Plan Info */}
                {currentPlan && currentPlan !== 'free' && subscriptionEndDate && (
                  <div className="glass-card p-6 rounded-xl border border-border/50 mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-light text-foreground mb-2">Current Subscription</h3>
                        <div className="flex items-center gap-2 mb-2">
                          {currentPlan === 'pro' ? (
                            <Crown className="w-5 h-5 text-primary" />
                          ) : (
                            <Zap className="w-5 h-5 text-primary" />
                          )}
                          <span className="text-base font-light text-foreground capitalize">{currentPlan} Plan</span>
                        </div>
                      </div>
                      <div className="text-right">
                        {isExpiringSoon && (
                          <span className="inline-block px-3 py-1 bg-destructive/20 text-destructive text-xs rounded-full mb-2">
                            Expiring Soon
                          </span>
                        )}
                        <p className="text-sm text-muted-foreground">Status: <span className="capitalize">{subscriptionStatus}</span></p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 mb-4">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        {subscriptionEndDate 
                          ? `Expires on ${formatExpirationDate(subscriptionEndDate)}`
                          : 'No expiration date'}
                      </p>
                    </div>

                    {/* Auto-renewal Toggle */}
                    <div className="flex items-center justify-between pt-4 border-t border-border/50">
                      <div>
                        <p className="text-sm font-light text-foreground mb-1">Auto-renewal</p>
                        <p className="text-xs text-muted-foreground">
                          {autoRenew 
                            ? 'Your subscription will automatically renew'
                            : 'Your subscription will not auto-renew'}
                        </p>
                      </div>
                      <button
                        onClick={handleToggleAutoRenew}
                        className={`px-4 py-2 rounded-lg text-sm font-light transition-all ${
                          autoRenew
                            ? 'bg-primary/20 text-primary hover:bg-primary/30'
                            : 'bg-secondary/50 text-muted-foreground hover:bg-secondary/80'
                        }`}
                      >
                        {autoRenew ? 'Disable' : 'Enable'}
                      </button>
                    </div>

                    {/* Continue Payment Option */}
                    {!autoRenew && (
                      <div className="mt-4 pt-4 border-t border-border/50">
                        <Button
                          onClick={() => handleSubscribe(currentPlan)}
                          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                        >
                          <CreditCard className="w-4 h-4 mr-2" />
                          Continue Payment for Next Subscription
                        </Button>
                      </div>
                    )}
                  </div>
                )}


                {/* Plan Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {plans.map((plan) => {
                    const PlanIcon = plan.icon;
                    const isCurrentPlan = plan.id === currentPlan;
                    const price = billingCycle === 'monthly' ? plan.monthlyPrice : plan.annualPrice;
                    const displayPrice = `$${price}`;
                    const period = billingCycle === 'monthly' ? ' monthly' : ' yearly';

                    return (
                      <div
                        key={plan.id}
                        className={`glass-card p-8 rounded-xl border transition-all relative hover:shadow-lg ${
                          plan.popular ? 'border-primary glow-effect scale-105' : 'border-border/50'
                        } ${isCurrentPlan ? 'ring-2 ring-primary/50' : ''}`}
                      >
                        {plan.popular && !isCurrentPlan && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                            <span className="inline-flex items-center gap-1 bg-primary text-primary-foreground text-xs font-light px-3 py-1 rounded-full shadow-lg">
                              <Zap className="w-3 h-3" />
                              Most Popular
                            </span>
                          </div>
                        )}

                        {isCurrentPlan && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                            <span className="inline-flex items-center gap-1 bg-green-500/20 text-green-500 text-xs font-light px-3 py-1 rounded-full border border-green-500/30 shadow-lg">
                              <Check className="w-3 h-3" />
                              Current Plan
                            </span>
                          </div>
                        )}

                        <div className="mb-6">
                          <div className="flex items-center gap-3 mb-3">
                            <div className={`p-2 rounded-lg ${plan.id === 'starter' ? 'bg-primary/10' : plan.id === 'pro' ? 'bg-primary/20' : 'bg-primary/30'}`}>
                              <PlanIcon className={`w-6 h-6 ${plan.id === 'starter' ? 'text-primary' : 'text-primary'}`} />
                            </div>
                            <h3 className="text-2xl font-light text-foreground">{plan.name}</h3>
                          </div>
                          <p className="text-sm text-muted-foreground">{plan.description}</p>
                        </div>

                        <div className="mb-8">
                          <div className="flex items-baseline gap-2">
                            <span className="text-5xl font-light text-foreground">{displayPrice}</span>
                            <span className="text-lg text-muted-foreground">{period}</span>
                          </div>
                          {billingCycle === 'annually' && (
                            <p className="text-xs text-green-500 mt-1 font-light">Save 2 months (10 months price)</p>
                          )}
                          {billingCycle === 'monthly' && (
                            <p className="text-xs text-muted-foreground mt-1">Recurring monthly</p>
                          )}
                        </div>

                        <ul className="space-y-4 mb-8 min-h-[280px]">
                          {plan.features.map((feature, idx) => (
                            <li key={idx} className="flex items-start gap-3">
                              <div className="mt-0.5">
                                {feature.included ? (
                                  <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                                    <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                                  </div>
                                ) : (
                                  <X className="w-5 h-5 text-muted-foreground shrink-0" />
                                )}
                              </div>
                              <span className="text-sm text-foreground leading-relaxed flex items-center gap-1">
                                {feature.text}
                                {feature.link && (
                                  <ExternalLink className="w-3 h-3 text-primary" />
                                )}
                              </span>
                            </li>
                          ))}
                        </ul>

                        <div className="space-y-2">
                          <Button
                            onClick={() => handleSubscribe(plan.id)}
                            disabled={isCurrentPlan || loading}
                            className={`w-full font-light h-12 text-base ${
                              isCurrentPlan
                                ? 'bg-secondary text-secondary-foreground cursor-not-allowed'
                                : plan.popular
                                ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-xl'
                                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                            }`}
                          >
                            {isCurrentPlan ? 'Current Plan' : loading ? 'Processing...' : 'Subscribe Now'}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Contact Support Tab */}
            {activeTab === 'support' && (
              <div className="space-y-6">
                {/* Tickets List View */}
                {!selectedTicket ? (
                  <>
                    <div className="glass-card p-6 rounded-xl border border-border/50">
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h2 className="text-xl font-light text-foreground mb-2">My Support Tickets</h2>
                          <p className="text-muted-foreground">
                            View and manage your support requests
                          </p>
                        </div>
                        <Button
                          onClick={() => setSelectedTicket('new')}
                          className="bg-primary hover:bg-primary/90 text-primary-foreground"
                        >
                          <MessageSquare className="w-4 h-4 mr-2" />
                          New Ticket
                        </Button>
                      </div>

                      {loadingTickets ? (
                        <div className="text-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                          <p className="text-muted-foreground">Loading tickets...</p>
                        </div>
                      ) : tickets.length > 0 ? (
                        <div className="space-y-3">
                          {tickets.map((ticket) => (
                            <div
                              key={ticket.id}
                              onClick={() => setSelectedTicket(ticket)}
                              className="p-4 rounded-lg border border-border/50 hover:border-primary/50 hover:bg-secondary/30 cursor-pointer transition-all"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                                    <span className="font-mono text-xs text-muted-foreground">{ticket.ticketId}</span>
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-light border whitespace-nowrap ${getStatusColor(ticket.status)}`}>
                                      {getStatusIcon(ticket.status)}
                                      <span className="ml-1 capitalize">{ticket.status.replace('-', ' ')}</span>
                                    </span>
                                  </div>
                                  <h3 className="font-light text-foreground mb-1">{ticket.subject}</h3>
                                  <p className="text-sm text-muted-foreground line-clamp-2">{ticket.message}</p>
                                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                    <span>{formatDate(ticket.createdAt)}</span>
                                    {ticket.replies && ticket.replies.length > 0 && (
                                      <span>{ticket.replies.length} {ticket.replies.length === 1 ? 'reply' : 'replies'}</span>
                                    )}
                                  </div>
                                </div>
                                {ticket.lastRepliedBy === 'admin' && (
                                  <div className="ml-4">
                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/20 text-primary text-xs rounded-full">
                                      <Mail className="w-3 h-3" />
                                      New Reply
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                          <p className="text-muted-foreground mb-4">No support tickets yet</p>
                          <Button
                            onClick={() => setSelectedTicket('new')}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground"
                          >
                            Create Your First Ticket
                          </Button>
                        </div>
                      )}
                    </div>
                  </>
                ) : selectedTicket === 'new' ? (
                  /* New Ticket Form */
                  <div className="glass-card p-6 rounded-xl border border-border/50">
                    <div className="max-w-2xl">
                      <div className="flex items-center gap-3 mb-6">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedTicket(null)}
                          className="text-muted-foreground"
                        >
                          <ArrowLeft className="w-4 h-4 mr-2" />
                          Back to Tickets
                        </Button>
                      </div>
                      <h2 className="text-xl font-light text-foreground mb-2">Create Support Ticket</h2>
                      <p className="text-muted-foreground mb-6">
                        Have a question or need help? Send us a message and we'll get back to you as soon as possible.
                      </p>

                      <form onSubmit={handleSupportSubmit} className="space-y-6">
                    <div>
                      <label htmlFor="subject" className="block text-sm font-light text-foreground mb-2">
                        Subject
                      </label>
                      <input
                        type="text"
                        id="subject"
                        value={supportForm.subject}
                        onChange={(e) => setSupportForm({ ...supportForm, subject: e.target.value })}
                        className="w-full px-4 py-2 bg-secondary/50 border border-border/50 rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                        placeholder="What can we help you with?"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="message" className="block text-sm font-light text-foreground mb-2">
                        Message
                      </label>
                      <textarea
                        id="message"
                        value={supportForm.message}
                        onChange={(e) => setSupportForm({ ...supportForm, message: e.target.value })}
                        rows={6}
                        className="w-full px-4 py-2 bg-secondary/50 border border-border/50 rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary resize-none"
                        placeholder="Please describe your issue or question in detail..."
                        required
                      />
                    </div>

                    <div className="flex items-center gap-4 pt-4">
                      <Button
                        type="submit"
                        disabled={loading}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        {loading ? 'Sending...' : 'Send Message'}
                      </Button>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="w-4 h-4" />
                        <span>Or email us directly at support@sneaklink.com</span>
                      </div>
                    </div>
                      </form>
                    </div>
                  </div>
                ) : (
                  /* Ticket Detail View */
                  <div className="glass-card p-6 rounded-xl border border-border/50">
                    <div className="max-w-3xl">
                      <div className="flex items-center gap-3 mb-6">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedTicket(null);
                            navigate('/account?tab=support', { replace: true });
                          }}
                          className="text-muted-foreground"
                        >
                          <ArrowLeft className="w-4 h-4 mr-2" />
                          Back to Tickets
                        </Button>
                      </div>

                      {/* Ticket Header */}
                      <div className="mb-6 pb-6 border-b border-border/50">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <span className="font-mono text-sm text-muted-foreground">{selectedTicket.ticketId}</span>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-light border whitespace-nowrap ${getStatusColor(selectedTicket.status)}`}>
                                {getStatusIcon(selectedTicket.status)}
                                <span className="ml-1 capitalize">{selectedTicket.status.replace('-', ' ')}</span>
                              </span>
                            </div>
                            <h2 className="text-2xl font-light text-foreground mb-2">{selectedTicket.subject}</h2>
                            <p className="text-sm text-muted-foreground">
                              Created {formatDate(selectedTicket.createdAt)}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Original Message */}
                      <div className="mb-6">
                        <div className="bg-secondary/30 p-4 rounded-lg border border-border/50">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                              <span className="text-xs font-light text-primary">
                                {user?.name?.split(' ').map(n => n[0]).join('') || 'U'}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-light text-foreground">{user?.name || 'You'}</p>
                              <p className="text-xs text-muted-foreground">{formatDate(selectedTicket.createdAt)}</p>
                            </div>
                          </div>
                          <p className="text-sm text-foreground whitespace-pre-wrap">{selectedTicket.message}</p>
                        </div>
                      </div>

                      {/* Replies */}
                      {selectedTicket.replies && selectedTicket.replies.length > 0 && (
                        <div className="mb-6 space-y-4">
                          <h3 className="text-lg font-light text-foreground">Conversation</h3>
                          {selectedTicket.replies.map((reply, index) => (
                            <div
                              key={index}
                              className={`p-4 rounded-lg border ${
                                reply.from === 'admin'
                                  ? 'bg-primary/10 border-primary/30'
                                  : 'bg-secondary/30 border-border/50'
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                  reply.from === 'admin' ? 'bg-primary/20' : 'bg-secondary/50'
                                }`}>
                                  {reply.from === 'admin' ? (
                                    <Crown className="w-4 h-4 text-primary" />
                                  ) : (
                                    <span className="text-xs font-light text-foreground">
                                      {user?.name?.split(' ').map(n => n[0]).join('') || 'U'}
                                    </span>
                                  )}
                                </div>
                                <div>
                                  <p className="text-sm font-light text-foreground">
                                    {reply.from === 'admin' ? (reply.adminName || 'Support Team') : (user?.name || 'You')}
                                  </p>
                                  <p className="text-xs text-muted-foreground">{formatDate(reply.createdAt)}</p>
                                </div>
                              </div>
                              <p className="text-sm text-foreground whitespace-pre-wrap">{reply.message}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Reply Form */}
                      {selectedTicket.status !== 'closed' && (
                        <div className="pt-6 border-t border-border/50">
                          <h3 className="text-lg font-light text-foreground mb-4">Reply to Ticket</h3>
                          <form onSubmit={handleTicketReply} className="space-y-4">
                            <textarea
                              value={ticketReply}
                              onChange={(e) => setTicketReply(e.target.value)}
                              rows={4}
                              className="w-full px-4 py-2 bg-secondary/50 border border-border/50 rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary resize-none"
                              placeholder="Type your reply here..."
                              required
                            />
                            <Button
                              type="submit"
                              disabled={loading || !ticketReply.trim()}
                              className="bg-primary hover:bg-primary/90 text-primary-foreground"
                            >
                              <Send className="w-4 h-4 mr-2" />
                              {loading ? 'Sending...' : 'Send Reply'}
                            </Button>
                          </form>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
  );
};

export default Account;
