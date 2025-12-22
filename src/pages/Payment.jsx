import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Header } from "@/components/dashboard/Header";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2, CreditCard, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { initializeSubscription, verifySubscription } from "@/services/api";

const Payment = () => {
  const { user, checkAuth } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  const plan = searchParams.get('plan') || 'starter';
  const billingCycle = searchParams.get('billing') || 'monthly';
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  const planDetails = {
    starter: {
      name: 'Starter Plan',
      monthlyPrice: 49,
      annualPrice: 490,
      description: 'Perfect for individual researchers',
    },
    pro: {
      name: 'Pro Plan',
      monthlyPrice: 79,
      annualPrice: 790,
      description: 'Best for growing teams',
    },
    enterprise: {
      name: 'Enterprise Plan',
      monthlyPrice: 199,
      annualPrice: 1990,
      description: 'For large organizations',
    },
  };

  const currentPlan = planDetails[plan] || planDetails.starter;
  const price = billingCycle === 'monthly' ? currentPlan.monthlyPrice : currentPlan.annualPrice;
  const period = billingCycle === 'monthly' ? 'month' : 'year';

  useEffect(() => {
    // Check if we're returning from Paystack
    const reference = searchParams.get('reference');
    
    if (reference && !processing) {
      verifyPayment(reference);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const verifyPayment = async (reference) => {
    if (processing) return; // Prevent duplicate calls
    
    setProcessing(true);
    setError(null);

    // Add timeout for verification
    const timeoutId = setTimeout(() => {
      setProcessing(false);
      setError('Payment verification is taking too long. Please check your account or contact support.');
      toast({
        title: "Verification Timeout",
        description: "Payment verification timed out. Please check your account or contact support if payment was deducted.",
        variant: "destructive",
        duration: 8000,
      });
    }, 30000); // 30 second timeout

    try {
      // Get billing cycle from URL params if available, otherwise use state
      const billingFromUrl = searchParams.get('billing') || billingCycle;
      
      // Add timeout to verification request
      const verifyPromise = verifySubscription(reference, billingFromUrl);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Verification request timed out')), 25000)
      );
      
      const result = await Promise.race([verifyPromise, timeoutPromise]);
      
      clearTimeout(timeoutId);
      
      if (result.success) {
        // Refresh user data to get updated subscription info
        await checkAuth();
        
        toast({
          title: "Payment Successful!",
          description: `Your ${currentPlan.name} subscription (${billingFromUrl}) is now active. Redirecting to dashboard...`,
        });

        // Redirect to dashboard so user can start using the store scraper
        setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 1500);
      } else {
        throw new Error(result.message || 'Payment verification failed');
      }
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Payment verification error:', error);
      
      let errorMessage = error.message || 'Failed to verify payment. Please contact support.';
      
      // Provide more specific error messages
      if (error.message?.includes('timed out') || error.message?.includes('timeout')) {
        errorMessage = 'Payment verification timed out. Please check your account or contact support if payment was deducted.';
      } else if (error.message?.includes('SSL') || error.message?.includes('ERR_SSL')) {
        errorMessage = 'SSL connection error during verification. Please try again or contact support.';
      }
      
      setError(errorMessage);
      setProcessing(false);
      toast({
        title: "Payment Verification Failed",
        description: errorMessage,
        variant: "destructive",
        duration: 8000,
      });
    }
  };

  const handlePayment = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to continue with payment.",
        variant: "destructive",
      });
      navigate('/login');
      return;
    }

    setLoading(true);
    setError(null);

    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (loading) {
        setLoading(false);
        setError('Payment initialization is taking too long. Please try again.');
        toast({
          title: "Timeout Error",
          description: "Payment initialization timed out. Please check your connection and try again.",
          variant: "destructive",
          duration: 8000,
        });
      }
    }, 30000); // 30 second timeout

    try {
      // Initialize subscription with timeout
      const initPromise = initializeSubscription(plan, user.email, billingCycle);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timed out. Please try again.')), 25000)
      );

      const result = await Promise.race([initPromise, timeoutPromise]);

      clearTimeout(timeoutId);

      if (result.authorization_url) {
        // Small delay to ensure state is updated before redirect
        await new Promise(resolve => setTimeout(resolve, 100));
        // Redirect to Paystack payment page
        window.location.href = result.authorization_url;
      } else {
        throw new Error('Failed to initialize payment - no authorization URL received');
      }
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Payment initialization error:', error);
      
      let errorMessage = error.message || 'Failed to initialize payment. Please try again.';
      
      // Provide more specific error messages
      if (error.message?.includes('timed out') || error.message?.includes('timeout')) {
        errorMessage = 'Payment initialization timed out. Please check your internet connection and try again.';
      } else if (error.message?.includes('SSL') || error.message?.includes('ERR_SSL')) {
        errorMessage = 'SSL connection error. Please try again or contact support if the issue persists.';
      } else if (error.message?.includes('Failed to fetch') || error.message?.includes('ERR_CONNECTION')) {
        errorMessage = 'Cannot connect to payment server. Please check your internet connection.';
      }
      
      setError(errorMessage);
      setLoading(false);
      toast({
        title: "Payment Error",
        description: errorMessage,
        variant: "destructive",
        duration: 8000,
      });
    }
  };

  const reference = searchParams.get('reference');

  if (processing) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="pt-24 pb-12 px-4 sm:px-6">
          <div className="max-w-2xl mx-auto">
            <div className="glass-card p-8 rounded-xl border border-border/50 text-center">
              <Loader2 className="w-16 h-16 text-primary mx-auto mb-4 animate-spin" />
              <h2 className="text-2xl font-light text-foreground mb-2">Verifying Payment</h2>
              <p className="text-muted-foreground">Please wait while we verify your payment...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (reference && error) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="pt-24 pb-12 px-4 sm:px-6">
          <div className="max-w-2xl mx-auto">
            <div className="glass-card p-8 rounded-xl border border-border/50">
              <div className="text-center mb-6">
                <XCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
                <h2 className="text-2xl font-light text-foreground mb-2">Payment Verification Failed</h2>
                <p className="text-muted-foreground mb-4">{error}</p>
              </div>
              <div className="flex gap-4">
                <Button
                  onClick={() => navigate('/account?tab=plans')}
                  variant="outline"
                  className="flex-1"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Plans
                </Button>
                <Button
                  onClick={() => handlePayment()}
                  className="flex-1"
                >
                  Try Again
                </Button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-24 pb-12 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto">
          <Button
            onClick={() => navigate('/account?tab=plans')}
            variant="ghost"
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Plans
          </Button>

          <div className="glass-card p-8 rounded-xl border border-border/50">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                <CreditCard className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-3xl font-light text-foreground mb-2">Complete Your Subscription</h1>
              <p className="text-muted-foreground">Secure payment powered by Paystack</p>
            </div>

            {/* Plan Summary */}
            <div className="bg-secondary/30 rounded-lg p-6 mb-6 border border-border/50">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-light text-foreground">{currentPlan.name}</h3>
                  <p className="text-sm text-muted-foreground">{currentPlan.description}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-light text-foreground">${price}</p>
                  <p className="text-sm text-muted-foreground">per {period}</p>
                </div>
              </div>
              <div className="pt-4 border-t border-border/50">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Billing Cycle</span>
                  <span className="font-light text-foreground capitalize">
                    {billingCycle === 'monthly' ? 'Monthly (Recurring)' : 'Annually (Recurring)'}
                  </span>
                </div>
                {billingCycle === 'annually' && (
                  <div className="flex items-center justify-between text-sm mt-2">
                    <span className="text-muted-foreground">Savings</span>
                    <span className="font-light text-green-500">2 months free</span>
                  </div>
                )}
              </div>
            </div>

            {/* Features */}
            <div className="mb-6">
              <h4 className="text-sm font-light text-foreground mb-3">What's included:</h4>
              <ul className="space-y-2">
                {plan === 'starter' && (
                  <>
                    <li className="flex items-center gap-2 text-sm text-foreground">
                      <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                      <span>1,000 filter queries per month</span>
                    </li>
                    <li className="flex items-center gap-2 text-sm text-foreground">
                      <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                      <span>2 CSV exports per day</span>
                    </li>
                    <li className="flex items-center gap-2 text-sm text-foreground">
                      <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                      <span>2 copy operations per day</span>
                    </li>
                    <li className="flex items-center gap-2 text-sm text-foreground">
                      <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                      <span>1 device</span>
                    </li>
                    <li className="flex items-center gap-2 text-sm text-foreground">
                      <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                      <span>200 links per CSV</span>
                    </li>
                  </>
                )}
                {plan === 'pro' && (
                  <>
                    <li className="flex items-center gap-2 text-sm text-foreground">
                      <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                      <span>10,000 filter queries per month</span>
                    </li>
                    <li className="flex items-center gap-2 text-sm text-foreground">
                      <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                      <span>10 CSV exports per day</span>
                    </li>
                    <li className="flex items-center gap-2 text-sm text-foreground">
                      <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                      <span>5 copy operations per day</span>
                    </li>
                    <li className="flex items-center gap-2 text-sm text-foreground">
                      <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                      <span>3 devices</span>
                    </li>
                    <li className="flex items-center gap-2 text-sm text-foreground">
                      <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                      <span>500 links per CSV</span>
                    </li>
                  </>
                )}
                {plan === 'enterprise' && (
                  <>
                    <li className="flex items-center gap-2 text-sm text-foreground">
                      <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                      <span>Unlimited filter queries</span>
                    </li>
                    <li className="flex items-center gap-2 text-sm text-foreground">
                      <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                      <span>Unlimited CSV exports</span>
                    </li>
                    <li className="flex items-center gap-2 text-sm text-foreground">
                      <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                      <span>Unlimited copy operations</span>
                    </li>
                    <li className="flex items-center gap-2 text-sm text-foreground">
                      <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                      <span>Up to 10 devices</span>
                    </li>
                    <li className="flex items-center gap-2 text-sm text-foreground">
                      <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                      <span>Unlimited links per CSV</span>
                    </li>
                    <li className="flex items-center gap-2 text-sm text-foreground">
                      <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                      <span>Priority support</span>
                    </li>
                  </>
                )}
              </ul>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <Button
              onClick={handlePayment}
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-6 text-lg font-light"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="w-5 h-5 mr-2" />
                  Pay ${price}/{period}
                </>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground mt-4">
              Your subscription will automatically renew {billingCycle === 'monthly' ? 'monthly' : 'annually'}. You can cancel anytime from your account settings.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Payment;
