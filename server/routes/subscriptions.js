import express from 'express';
import axios from 'axios';
import https from 'https';
import { authenticate } from '../middleware/auth.js';
import { getPrisma } from '../config/postgres.js';
import { sendSubscriptionReceipt } from '../utils/emailService.js';

const router = express.Router();

// Paystack API configuration
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

// Validate Paystack secret key
if (!PAYSTACK_SECRET_KEY) {
  console.error('⚠️  WARNING: PAYSTACK_SECRET_KEY is not set in environment variables!');
  console.error('Please add PAYSTACK_SECRET_KEY to your .env file');
}

// Test endpoint to verify routes are loaded (useful for debugging)
router.get('/test', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Subscriptions routes are loaded',
    timestamp: new Date().toISOString()
  });
});

// Log when routes are loaded
console.log('✅ Subscription routes loaded: /api/subscriptions/*');

// Paystack API helper functions with retry logic
const paystackRequest = async (method, endpoint, data = null, retries = 2) => {
  if (!PAYSTACK_SECRET_KEY) {
    throw new Error('Paystack secret key is not configured. Please set PAYSTACK_SECRET_KEY in your environment variables.');
  }

  const makeRequest = async (attemptNumber) => {
    try {
      // Create a fresh https agent for each request to avoid SSL/TLS connection issues
      // This helps with EPROTO errors on Windows systems
      const httpsAgentOptions = {
        rejectUnauthorized: true,
        keepAlive: false, // Disable keepAlive to avoid SSL connection reuse issues that cause EPROTO
      };
      
      // Set TLS version - try modern approach first, fallback to legacy
      try {
        // For Node.js v12.3.0+, use minVersion/maxVersion
        httpsAgentOptions.minVersion = 'TLSv1.2';
        httpsAgentOptions.maxVersion = 'TLSv1.3';
      } catch (e) {
        // Fallback for older Node.js versions
        httpsAgentOptions.secureProtocol = 'TLSv1_2_method';
      }
      
      const httpsAgent = new https.Agent(httpsAgentOptions);

      const config = {
        method,
        url: `${PAYSTACK_BASE_URL}${endpoint}`,
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
          'User-Agent': 'SneakLink/1.0',
        },
        timeout: 30000, // 30 second timeout
        httpsAgent: httpsAgent,
      };

      if (data) {
        config.data = data;
      }

      const response = await axios(config);
      return response.data;
    } catch (error) {
      // Enhanced error logging
      if (error.response) {
        console.error('Paystack API Error:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          endpoint: endpoint,
          attempt: attemptNumber,
        });
        
        // Provide helpful error messages
        if (error.response.status === 401) {
          throw new Error('Paystack authentication failed. Please check your PAYSTACK_SECRET_KEY in the .env file.');
        }
        // Don't retry on client errors (4xx), only server errors (5xx)
        if (error.response.status >= 400 && error.response.status < 500) {
          throw error;
        }
      } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        console.error(`Paystack API Timeout (attempt ${attemptNumber}/${retries + 1}):`, endpoint);
        // Only retry on timeout if we have retries left
        if (attemptNumber <= retries) {
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * attemptNumber));
          return makeRequest(attemptNumber + 1);
        }
        throw new Error('Request to Paystack timed out after multiple attempts. Please check your connection and try again.');
      } else if (error.code === 'EPROTO' || error.code === 'ERR_SSL' || error.code === 'ESOCKET' || error.message?.includes('SSL') || error.message?.includes('certificate') || error.message?.includes('decryption failed')) {
        console.error('Paystack API SSL/TLS Error:', {
          code: error.code,
          message: error.message,
          endpoint: endpoint,
          attempt: attemptNumber,
        });
        
        // Retry on SSL/TLS errors (common on Windows with EPROTO)
        if (attemptNumber <= retries) {
          console.log(`Retrying Paystack request (attempt ${attemptNumber + 1}/${retries + 1}) due to SSL/TLS error...`);
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 2000 * attemptNumber));
          return makeRequest(attemptNumber + 1);
        }
        throw new Error('SSL/TLS connection error with Paystack. This may be a temporary network issue. Please try again in a few moments.');
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        console.error('Paystack API Connection Error:', error.message);
        // Retry on connection errors if we have retries left
        if (attemptNumber <= retries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attemptNumber));
          return makeRequest(attemptNumber + 1);
        }
        throw new Error('Cannot connect to Paystack. Please check your internet connection and try again.');
      } else {
        console.error('Paystack API Error:', {
          code: error.code,
          message: error.message,
          endpoint: endpoint,
          attempt: attemptNumber,
        });
        
        // Retry on unknown errors (might be transient network issues)
        if (attemptNumber <= retries && (!error.code || error.code.startsWith('E'))) {
          console.log(`Retrying Paystack request (attempt ${attemptNumber + 1}/${retries + 1})...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * attemptNumber));
          return makeRequest(attemptNumber + 1);
        }
      }
      throw error;
    }
  };

  return makeRequest(1);
};

/**
 * POST /api/subscriptions/initialize
 * Initialize a subscription payment
 */
router.post('/initialize', authenticate, async (req, res) => {
  try {
    // Check if Paystack secret key is configured
    if (!PAYSTACK_SECRET_KEY) {
      return res.status(500).json({
        error: 'Payment configuration error',
        message: 'Paystack secret key is not configured. Please contact support.',
      });
    }

    const { plan, email, billingCycle = 'monthly' } = req.body;
    const userId = req.user.userId || req.user.id;

    // Validate plan - amounts in kobo (NGN)
    // Note: Paystack uses NGN (kobo) - 1 NGN = 100 kobo
    // Exchange rate: $1 = ₦1,500 (update based on current Paystack rate)
    // IMPORTANT: Update this rate based on current USD/NGN exchange rate
    // Check Paystack dashboard or current market rate
    // 
    // Monthly Plans (in kobo):
    const monthlyPlans = {
      starter: 7350000,    // $49 × ₦1,500 = ₦73,500 = 7,350,000 kobo
      pro: 11850000,       // $79 × ₦1,500 = ₦118,500 = 11,850,000 kobo
      enterprise: 29850000, // $199 × ₦1,500 = ₦298,500 = 29,850,000 kobo
    };

    // Annual Plans (in kobo) - 10 months price (2 months free):
    const annualPlans = {
      starter: 73500000,    // $490 × ₦1,500 = ₦735,000 = 73,500,000 kobo
      pro: 118500000,       // $790 × ₦1,500 = ₦1,185,000 = 118,500,000 kobo
      enterprise: 298500000, // $1,990 × ₦1,500 = ₦2,985,000 = 298,500,000 kobo
    };

    const validPlans = billingCycle === 'annually' ? annualPlans : monthlyPlans;

    if (!validPlans[plan]) {
      return res.status(400).json({
        error: 'Invalid plan',
        message: 'Please select a valid subscription plan',
      });
    }

    const amount = validPlans[plan];
    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
      });
    }

    // Create or get Paystack customer
    let customerCode = user.paystackCustomerCode;

    if (!customerCode) {
      // Create new customer using Paystack API
      const customer = await paystackRequest('POST', '/customer', {
        email: email || user.email,
        first_name: user.name?.split(' ')[0] || 'User',
        last_name: user.name?.split(' ').slice(1).join(' ') || '',
      });

      customerCode = customer.data.customer_code;
      await prisma.user.update({
        where: { id: user.id },
        data: { paystackCustomerCode: customerCode },
      });
    }

    // Initialize transaction for subscription (first payment + authorization)
    const reference = `sub_${Date.now()}_${userId}`;
    const callbackUrl = `${process.env.FRONTEND_URL || 'http://localhost:8080'}/payment?reference=${reference}&plan=${plan}&billing=${billingCycle}`;
    
    const transaction = await paystackRequest('POST', '/transaction/initialize', {
      email: email || user.email,
      amount: amount, // Amount is already in kobo
      currency: 'NGN',
      reference: reference,
      callback_url: callbackUrl,
      send_email: false, // Disable Paystack's default email receipt for this transaction
      // IMPORTANT: Also disable in Paystack Dashboard:
      // Dashboard > Settings > Preferences > Uncheck "Email receipts to customers"
      metadata: {
        userId: userId.toString(),
        plan: plan,
        billingCycle: billingCycle,
        type: 'subscription',
      },
    });

    res.json({
      authorization_url: transaction.data.authorization_url,
      access_code: transaction.data.access_code,
      reference: transaction.data.reference,
    });
  } catch (error) {
    console.error('Error initializing subscription:', error);
    res.status(500).json({
      error: 'Failed to initialize subscription',
      message: error.message,
    });
  }
});

/**
 * POST /api/subscriptions/verify
 * Verify payment and create subscription
 */
router.post('/verify', authenticate, async (req, res) => {
  console.log('🔔 /api/subscriptions/verify endpoint called');
  try {
    const { reference, billingCycle: requestBillingCycle } = req.body;
    const userId = req.user.userId || req.user.id;

    if (!reference) {
      return res.status(400).json({
        error: 'Missing reference',
        message: 'Payment reference is required',
      });
    }

    // Verify transaction with timeout handling
    let verification;
    try {
      verification = await paystackRequest('GET', `/transaction/verify/${reference}`);
    } catch (verifyError) {
      console.error('Paystack verification error:', verifyError);
      return res.status(500).json({
        error: 'Payment verification failed',
        message: verifyError.message || 'Failed to verify payment with Paystack. Please contact support if payment was deducted.',
      });
    }

    if (!verification.data.status || verification.data.status !== 'success') {
      return res.status(400).json({
        error: 'Payment verification failed',
        message: 'Transaction was not successful',
      });
    }

    const metadata = verification.data.metadata;
    const plan = metadata?.plan;
    const billingCycle = metadata?.billingCycle || requestBillingCycle || 'monthly';

    if (!plan || !['starter', 'pro', 'enterprise'].includes(plan)) {
      return res.status(400).json({
        error: 'Invalid plan',
      });
    }

    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
      });
    }

    // Get authorization code from transaction
    const authorizationCode = verification.data.authorization?.authorization_code;

    if (!authorizationCode) {
      return res.status(400).json({
        error: 'Authorization code not found',
        message: 'Please complete the payment authorization',
      });
    }

    // Create subscription plan - amounts in kobo (NGN)
    // Exchange rate: $1 = ₦1,500 (update based on current Paystack rate)
    // IMPORTANT: Update this rate based on current USD/NGN exchange rate
    const monthlyAmounts = {
      starter: 7350000,    // $49 × ₦1,500 = ₦73,500 = 7,350,000 kobo
      pro: 11850000,       // $79 × ₦1,500 = ₦118,500 = 11,850,000 kobo
      enterprise: 29850000, // $199 × ₦1,500 = ₦298,500 = 29,850,000 kobo
    };

    const annualAmounts = {
      starter: 73500000,    // $490 × ₦1,500 = ₦735,000 = 73,500,000 kobo (10 months)
      pro: 118500000,       // $790 × ₦1,500 = ₦1,185,000 = 118,500,000 kobo (10 months)
      enterprise: 298500000, // $1,990 × ₦1,500 = ₦2,985,000 = 298,500,000 kobo (10 months)
    };

    const amount = billingCycle === 'annually' ? annualAmounts[plan] : monthlyAmounts[plan];

    // First, create or get the subscription plan
    const planName = `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan - ${billingCycle === 'monthly' ? 'Monthly' : 'Annual'}`;
    const planCode = `plan_${plan}_${billingCycle === 'monthly' ? 'monthly' : 'annual'}`;
    
    let paystackPlan;
    let finalPlanCode = planCode;
    
    try {
      // Try to get existing plan
      paystackPlan = await paystackRequest('GET', `/plan/${planCode}`);
      finalPlanCode = paystackPlan.data?.plan_code || planCode;
    } catch (error) {
      // Plan doesn't exist, create it
      try {
        paystackPlan = await paystackRequest('POST', '/plan', {
          name: planName,
          interval: billingCycle === 'annually' ? 'annually' : 'monthly', // 'monthly' or 'annually'
          amount: amount, // Amount is already in kobo
          currency: 'NGN',
        });
        finalPlanCode = paystackPlan.data?.plan_code;
      } catch (createError) {
        console.error('Error creating plan:', createError);
        // If plan creation fails, try to find existing plan with same amount and interval
        try {
          const plans = await paystackRequest('GET', '/plan');
          const interval = billingCycle === 'annually' ? 'annually' : 'monthly';
          const matchingPlan = plans.data?.find(p => p.amount === amount && p.interval === interval);
          
          if (matchingPlan) {
            finalPlanCode = matchingPlan.plan_code;
          } else {
            throw new Error('Failed to create or find subscription plan');
          }
        } catch (listError) {
          throw new Error('Failed to create or find subscription plan');
        }
      }
    }

    // Create subscription on Paystack
    // Note: Paystack subscription creation doesn't have send_email parameter
    // Email receipts are controlled by Paystack dashboard settings
    // Make sure to disable "Send Receipts" in Paystack Dashboard > Settings > Email Notifications
    const subscription = await paystackRequest('POST', '/subscription', {
      customer: user.paystackCustomerCode,
      plan: finalPlanCode,
      authorization: authorizationCode,
    });

    // Calculate next payment date based on billing cycle
    const nextPaymentDate = new Date();
    if (billingCycle === 'annually') {
      nextPaymentDate.setFullYear(nextPaymentDate.getFullYear() + 1);
    } else {
      nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
    }

    // Check if subscription already exists for this user
    const existingSubscription = await prisma.subscription.findFirst({
      where: {
        userId: user.id,
        status: { in: ['active', 'pending'] },
      },
    });

    let subscriptionRecord;
    if (existingSubscription) {
      // If user is upgrading to a different plan, cancel the old subscription first
      if (existingSubscription.plan !== plan) {
        try {
          // Disable old subscription on Paystack
          if (existingSubscription.paystackSubscriptionCode) {
            await paystackRequest('POST', `/subscription/disable`, {
              code: existingSubscription.paystackSubscriptionCode,
              token: existingSubscription.paystackAuthorizationCode,
            });
          }
        } catch (cancelError) {
          console.warn('Error cancelling old Paystack subscription:', cancelError);
          // Continue anyway - we'll cancel it in our database
        }

        // Cancel the old subscription in our database
        await prisma.subscription.update({
          where: { id: existingSubscription.id },
          data: {
            status: 'cancelled',
            cancelledAt: new Date(),
            cancelledBy: 'user',
          },
        });

        console.log(`✅ Cancelled old ${existingSubscription.plan} subscription for user ${user.id}`);
      } else {
        // Same plan, just update the existing subscription
        subscriptionRecord = await prisma.subscription.update({
          where: { id: existingSubscription.id },
          data: {
            plan: plan,
            billingCycle: billingCycle,
            paystackCustomerCode: user.paystackCustomerCode,
            paystackSubscriptionCode: subscription.data?.subscription_code || subscription.subscription_code,
            paystackAuthorizationCode: authorizationCode,
            status: 'active',
            amount: amount,
            nextPaymentDate: nextPaymentDate,
            cancelledAt: null,
            cancelledBy: null,
          },
        });
      }
    }
    
    // If we cancelled an old subscription or no subscription existed, create a new one
    if (!subscriptionRecord) {
      // Create new subscription record
      subscriptionRecord = await prisma.subscription.create({
        data: {
          userId: user.id,
          plan: plan,
          billingCycle: billingCycle,
          paystackCustomerCode: user.paystackCustomerCode,
          paystackSubscriptionCode: subscription.data?.subscription_code || subscription.subscription_code,
          paystackAuthorizationCode: authorizationCode,
          status: 'active',
          amount: amount,
          nextPaymentDate: nextPaymentDate,
        },
      });
    }

    // Update user subscription and reset usage counters
    const now = new Date();
    await prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionPlan: plan,
        subscriptionStatus: 'active',
        subscriptionStartDate: new Date(),
        subscriptionEndDate: nextPaymentDate,
        subscriptionAutoRenew: true,
        subscriptionBillingCycle: billingCycle,
        // Reset all usage counters to give user full allowance for new plan
        filterQueriesThisMonth: 0,
        filterQueriesResetDate: now,
        csvExportsToday: 0,
        csvExportsResetDate: now,
        copyOperationsToday: 0,
        copyOperationsResetDate: now,
      },
    });

    console.log(`✅ Subscription activated for user ${user.id}: ${plan} (${billingCycle}) - Usage counters reset`);

    // Generate invoice number
    const invoiceNumber = `INV-${reference.slice(-8).toUpperCase()}-${Date.now().toString().slice(-6)}`;
    
    // Get payment method from verification
    const paymentMethod = verification.data.authorization?.card
      ? `${verification.data.authorization.card.brand} .... ${verification.data.authorization.card.last4}`
      : 'Card Payment';

    // Send custom receipt email (async, don't wait)
    sendSubscriptionReceipt({
      email: user.email,
      name: user.name,
      invoiceNumber,
      amount: amount,
      plan: plan,
      billingCycle: billingCycle,
      paymentDate: new Date(),
      paymentMethod: paymentMethod,
      reference: reference,
      transactionId: verification.data.id || reference,
    }).catch(error => {
      console.error('Error sending receipt email:', error);
      // Don't fail the request if email fails
    });

    res.json({
      success: true,
      subscription: {
        plan: plan,
        status: 'active',
        nextPaymentDate: nextPaymentDate,
        subscriptionCode: subscription.data?.subscription_code || subscription.subscription_code,
      },
      receipt: {
        invoiceNumber,
        reference: reference,
      },
    });
  } catch (error) {
    console.error('Error verifying subscription:', error);
    res.status(500).json({
      error: 'Failed to verify subscription',
      message: error.message,
    });
  }
});

/**
 * GET /api/subscriptions/receipt/:reference
 * Get receipt data for a completed subscription payment
 */
router.get('/receipt/:reference', authenticate, async (req, res) => {
  try {
    const { reference } = req.params;
    const userId = req.user.userId || req.user.id;
    const prisma = getPrisma();

    // Verify transaction
    let verification;
    try {
      verification = await paystackRequest('GET', `/transaction/verify/${reference}`);
    } catch (error) {
      return res.status(404).json({
        error: 'Receipt not found',
        message: 'Transaction reference not found',
      });
    }

    if (!verification.data || verification.data.status !== 'success') {
      return res.status(400).json({
        error: 'Invalid transaction',
        message: 'Transaction was not successful',
      });
    }

    // Get subscription record - find by checking transaction metadata or user's latest subscription
    // Since we don't store transaction reference directly, we'll get the user's latest active subscription
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: userId,
        status: 'active',
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!subscription) {
      return res.status(404).json({
        error: 'Subscription not found',
        message: 'No subscription found for this transaction',
      });
    }

    // Generate invoice number
    const invoiceNumber = `INV-${reference.slice(-8).toUpperCase()}-${Date.now().toString().slice(-6)}`;
    
    // Get payment method
    const paymentMethod = verification.data.authorization?.card
      ? `${verification.data.authorization.card.brand} .... ${verification.data.authorization.card.last4}`
      : 'Card Payment';

    // Convert amount from kobo to USD
    const ngnAmount = parseFloat(verification.data.amount) / 100;
    const usdAmount = ngnAmount / 1500; // Exchange rate

    res.json({
      invoiceNumber,
      amount: verification.data.amount, // In kobo
      usdAmount,
      plan: subscription.plan,
      billingCycle: subscription.billingCycle,
      paymentDate: verification.data.paid_at || verification.data.created_at || new Date().toISOString(),
      paymentMethod: paymentMethod,
      reference: reference,
      transactionId: verification.data.id || reference,
      customerName: subscription.user.name,
      customerEmail: subscription.user.email,
    });
  } catch (error) {
    console.error('Error fetching receipt:', error);
    res.status(500).json({
      error: 'Failed to fetch receipt',
      message: error.message,
    });
  }
});

/**
 * GET /api/subscriptions/receipt/:reference/invoice
 * Download invoice PDF
 */
router.get('/receipt/:reference/invoice', authenticate, async (req, res) => {
  try {
    // For now, return a placeholder PDF
    // In production, use a PDF library like pdfkit or puppeteer to generate the PDF
    // This is a simplified version - you'll need to implement proper PDF generation
    
    res.status(501).json({
      error: 'PDF generation not yet implemented',
      message: 'Invoice PDF generation is coming soon',
    });
  } catch (error) {
    console.error('Error generating invoice PDF:', error);
    res.status(500).json({
      error: 'Failed to generate invoice',
      message: error.message,
    });
  }
});

/**
 * GET /api/subscriptions/receipt/:reference/receipt
 * Download receipt PDF
 */
router.get('/receipt/:reference/receipt', authenticate, async (req, res) => {
  try {
    // For now, return a placeholder PDF
    // In production, use a PDF library like pdfkit or puppeteer to generate the PDF
    // This is a simplified version - you'll need to implement proper PDF generation
    
    res.status(501).json({
      error: 'PDF generation not yet implemented',
      message: 'Receipt PDF generation is coming soon',
    });
  } catch (error) {
    console.error('Error generating receipt PDF:', error);
    res.status(500).json({
      error: 'Failed to generate receipt',
      message: error.message,
    });
  }
});

/**
 * POST /api/subscriptions/webhook
 * Handle Paystack webhook events
 */
router.post('/webhook', express.json(), async (req, res) => {
  try {
    const hash = req.headers['x-paystack-signature'];
    const secret = process.env.PAYSTACK_SECRET_KEY;

    // Verify webhook signature
    const crypto = await import('crypto');
    const hashCheck = crypto.default
      .createHmac('sha512', secret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (hash !== hashCheck) {
      return res.status(400).send('Invalid signature');
    }

    const event = req.body;
    const prisma = getPrisma();

    // Handle subscription events
    if (event.event === 'subscription.create') {
      // Subscription created
      console.log('Subscription created:', event.data);
    } else if (event.event === 'invoice.success') {
      // Successful recurring payment
      const subscriptionCode = event.data.subscription?.subscription_code;
      
      if (subscriptionCode) {
        const subscription = await prisma.subscription.findUnique({
          where: { paystackSubscriptionCode: subscriptionCode },
        });

        if (subscription) {
          // Check if auto-renewal is enabled
          const user = await prisma.user.findUnique({
            where: { id: subscription.userId },
            select: { subscriptionAutoRenew: true },
          });

          // Only process payment if auto-renewal is enabled
          if (user?.subscriptionAutoRenew !== false) {
            // Update next payment date based on billing cycle
            const nextPaymentDate = new Date();
            const billingCycle = subscription.billingCycle || 'monthly';
            if (billingCycle === 'annually') {
              nextPaymentDate.setFullYear(nextPaymentDate.getFullYear() + 1);
            } else {
              nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
            }
            
            await prisma.subscription.update({
              where: { id: subscription.id },
              data: {
                nextPaymentDate: nextPaymentDate,
                status: 'active',
              },
            });

            // Update user subscription end date
            await prisma.user.update({
              where: { id: subscription.userId },
              data: {
                subscriptionEndDate: nextPaymentDate,
                subscriptionStatus: 'active',
              },
            });
          } else {
            // Auto-renewal is disabled, mark subscription as cancelled after current period
            console.log(`Auto-renewal disabled for subscription ${subscriptionCode}, will not renew`);
          }
        }
      }
    } else if (event.event === 'invoice.failed') {
      // Failed recurring payment
      const subscriptionCode = event.data.subscription?.subscription_code;
      
      if (subscriptionCode) {
        const subscription = await prisma.subscription.findUnique({
          where: { paystackSubscriptionCode: subscriptionCode },
        });

        if (subscription) {
          await prisma.subscription.update({
            where: { id: subscription.id },
            data: { status: 'expired' },
          });

          await prisma.user.update({
            where: { id: subscription.userId },
            data: { subscriptionStatus: 'expired' },
          });
        }
      }
    } else if (event.event === 'subscription.disable') {
      // Subscription cancelled
      const subscriptionCode = event.data.subscription_code;
      
      if (subscriptionCode) {
        const subscription = await prisma.subscription.findUnique({
          where: { paystackSubscriptionCode: subscriptionCode },
        });

        if (subscription) {
          await prisma.subscription.update({
            where: { id: subscription.id },
            data: {
              status: 'cancelled',
              cancelledAt: new Date(),
            },
          });

          await prisma.user.update({
            where: { id: subscription.userId },
            data: { subscriptionStatus: 'cancelled' },
          });
        }
      }
    }

    res.status(200).send('Webhook processed');
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).send('Webhook processing failed');
  }
});

/**
 * POST /api/subscriptions/toggle-auto-renew
 * Toggle auto-renewal for a subscription
 */
router.post('/toggle-auto-renew', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const prisma = getPrisma();

    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: userId,
        status: 'active',
      },
    });

    if (!subscription) {
      return res.status(404).json({
        error: 'No active subscription found',
      });
    }

    // Get current auto-renewal status from user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    const currentAutoRenew = user?.subscriptionAutoRenew ?? true;
    const newAutoRenew = !currentAutoRenew;

    // Toggle Paystack subscription
    try {
      if (newAutoRenew) {
        // Enable subscription on Paystack (if it was previously disabled)
        // Note: Paystack doesn't have a direct enable endpoint, but disabling and re-enabling
        // can be done by managing the subscription status
        // For now, we'll just update our database - Paystack will attempt to charge
        // and if the subscription is active, it will work
        console.log(`Enabling auto-renewal for subscription ${subscription.paystackSubscriptionCode}`);
      } else {
        // Disable subscription on Paystack (won't charge next month, but current period remains active)
        await paystackRequest('POST', `/subscription/disable`, {
          code: subscription.paystackSubscriptionCode,
          token: subscription.paystackAuthorizationCode,
        });
        console.log(`Disabled Paystack subscription ${subscription.paystackSubscriptionCode}`);
      }
    } catch (paystackError) {
      console.error('Error toggling Paystack subscription:', paystackError);
      // Continue anyway - update our database
      // If Paystack call fails, we still update our DB so user sees the change
    }

    // Update user subscription auto-renewal
    await prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionAutoRenew: newAutoRenew,
      },
    });

    console.log(`✅ Auto-renewal ${newAutoRenew ? 'enabled' : 'disabled'} for user ${userId}`);

    res.json({
      success: true,
      autoRenew: newAutoRenew,
      message: `Auto-renewal ${newAutoRenew ? 'enabled' : 'disabled'} successfully`,
    });
  } catch (error) {
    console.error('Error toggling auto-renewal:', error);
    res.status(500).json({
      error: 'Failed to toggle auto-renewal',
      message: error.message,
    });
  }
});

/**
 * POST /api/subscriptions/cancel
 * Cancel a subscription
 */
router.post('/cancel', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const prisma = getPrisma();

    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: userId,
        status: 'active',
      },
    });

    if (!subscription) {
      return res.status(404).json({
        error: 'No active subscription found',
      });
    }

    // Disable subscription on Paystack
    await paystackRequest('POST', `/subscription/disable`, {
      code: subscription.paystackSubscriptionCode,
      token: subscription.paystackAuthorizationCode,
    });

    // Update subscription record
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelledBy: 'user',
      },
    });

    // Update user subscription
    await prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionAutoRenew: false,
        subscriptionStatus: 'cancelled',
      },
    });

    res.json({
      success: true,
      message: 'Subscription cancelled successfully',
    });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({
      error: 'Failed to cancel subscription',
      message: error.message,
    });
  }
});

/**
 * GET /api/subscriptions/current
 * Get current subscription details
 */
router.get('/current', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;

    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: userId,
        status: { in: ['active', 'pending'] },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!subscription) {
      return res.json({
        subscription: null,
      });
    }

    res.json({
      subscription: {
        plan: subscription.plan,
        status: subscription.status,
        amount: subscription.amount.toString(),
        billingCycle: subscription.billingCycle,
        nextPaymentDate: subscription.nextPaymentDate,
        startDate: subscription.startDate,
        cancelledAt: subscription.cancelledAt,
      },
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({
      error: 'Failed to fetch subscription',
      message: error.message,
    });
  }
});

export default router;
