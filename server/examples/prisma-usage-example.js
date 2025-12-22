/**
 * Prisma Usage Examples
 * 
 * This file demonstrates how to use Prisma Client in your routes
 * Replace Mongoose queries with Prisma queries
 */

import { getPrisma } from '../config/postgres.js';

// ============================================================================
// USER EXAMPLES
// ============================================================================

/**
 * Find user by email
 */
export async function findUserByEmail(email) {
  const prisma = getPrisma();
  
  return await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: {
      subscriptions: {
        where: { status: 'active' },
        orderBy: { createdAt: 'desc' },
        take: 1, // Get most recent active subscription
      },
    },
  });
}

/**
 * Create new user
 */
export async function createUser(userData) {
  const prisma = getPrisma();
  
  return await prisma.user.create({
    data: {
      email: userData.email.toLowerCase(),
      name: userData.name,
      picture: userData.picture,
      googleId: userData.googleId,
      provider: userData.provider || 'google',
      subscriptionPlan: 'free',
      subscriptionStatus: 'active',
    },
  });
}

/**
 * Update user subscription
 */
export async function updateUserSubscription(userId, subscriptionData) {
  const prisma = getPrisma();
  
  return await prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionPlan: subscriptionData.plan,
      subscriptionStatus: subscriptionData.status,
      subscriptionStartDate: subscriptionData.startDate,
      subscriptionEndDate: subscriptionData.endDate,
      subscriptionBillingCycle: subscriptionData.billingCycle,
    },
  });
}

// ============================================================================
// SUBSCRIPTION EXAMPLES
// ============================================================================

/**
 * Create subscription
 */
export async function createSubscription(subscriptionData) {
  const prisma = getPrisma();
  
  return await prisma.subscription.create({
    data: {
      userId: subscriptionData.userId,
      plan: subscriptionData.plan,
      billingCycle: subscriptionData.billingCycle,
      paystackCustomerCode: subscriptionData.paystackCustomerCode,
      paystackSubscriptionCode: subscriptionData.paystackSubscriptionCode,
      paystackAuthorizationCode: subscriptionData.paystackAuthorizationCode,
      status: subscriptionData.status || 'pending',
      amount: subscriptionData.amount,
      currency: subscriptionData.currency || 'NGN',
      nextPaymentDate: subscriptionData.nextPaymentDate,
    },
  });
}

/**
 * Find active subscription for user
 */
export async function findActiveSubscription(userId) {
  const prisma = getPrisma();
  
  return await prisma.subscription.findFirst({
    where: {
      userId,
      status: 'active',
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

// ============================================================================
// STORE EXAMPLES
// ============================================================================

/**
 * Find stores with filters (pagination)
 */
export async function findStores(filters, pagination) {
  const prisma = getPrisma();
  
  const where = {
    isActive: true,
    isShopify: true,
    ...(filters.country && { country: { in: filters.country } }),
    ...(filters.tags && { tags: { hasSome: filters.tags } }),
    ...(filters.dateFrom && filters.dateTo && {
      dateAdded: {
        gte: new Date(filters.dateFrom),
        lte: new Date(filters.dateTo),
      },
    }),
  };
  
  const [stores, total] = await Promise.all([
    prisma.store.findMany({
      where,
      orderBy: { dateAdded: 'desc' },
      skip: (pagination.page - 1) * pagination.limit,
      take: pagination.limit,
    }),
    prisma.store.count({ where }),
  ]);
  
  return { stores, total };
}

/**
 * Upsert store (create or update)
 */
export async function upsertStore(storeData) {
  const prisma = getPrisma();
  
  // Normalize URL
  const normalizedUrl = storeData.url.toLowerCase().trim().replace(/\/$/, '');
  
  return await prisma.store.upsert({
    where: { url: normalizedUrl },
    update: {
      name: storeData.name,
      country: storeData.country,
      productCount: storeData.productCount,
      tags: storeData.tags,
      businessModel: storeData.businessModel,
      hasFacebookAds: storeData.hasFacebookAds,
      lastScraped: new Date(),
    },
    create: {
      name: storeData.name,
      url: normalizedUrl,
      country: storeData.country,
      productCount: storeData.productCount,
      tags: storeData.tags,
      businessModel: storeData.businessModel,
      source: storeData.source || 'api',
      hasFacebookAds: storeData.hasFacebookAds,
    },
  });
}

// ============================================================================
// SESSION EXAMPLES
// ============================================================================

/**
 * Create session
 */
export async function createSession(sessionData) {
  const prisma = getPrisma();
  
  return await prisma.session.create({
    data: {
      userId: sessionData.userId,
      sessionId: sessionData.sessionId,
      token: sessionData.token,
      ip: sessionData.ip,
    },
  });
}

/**
 * Find active session
 */
export async function findActiveSession(sessionId) {
  const prisma = getPrisma();
  
  return await prisma.session.findUnique({
    where: { sessionId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          subscriptionPlan: true,
          subscriptionStatus: true,
        },
      },
    },
  });
}

// ============================================================================
// TRANSACTION EXAMPLES
// ============================================================================

/**
 * Transaction: Create user with subscription
 */
export async function createUserWithSubscription(userData, subscriptionData) {
  const prisma = getPrisma();
  
  return await prisma.$transaction(async (tx) => {
    // Create user
    const user = await tx.user.create({
      data: {
        email: userData.email.toLowerCase(),
        name: userData.name,
        subscriptionPlan: subscriptionData.plan,
        subscriptionStatus: 'active',
      },
    });
    
    // Create subscription
    const subscription = await tx.subscription.create({
      data: {
        userId: user.id,
        plan: subscriptionData.plan,
        paystackCustomerCode: subscriptionData.paystackCustomerCode,
        paystackSubscriptionCode: subscriptionData.paystackSubscriptionCode,
        paystackAuthorizationCode: subscriptionData.paystackAuthorizationCode,
        amount: subscriptionData.amount,
        nextPaymentDate: subscriptionData.nextPaymentDate,
      },
    });
    
    return { user, subscription };
  });
}

// ============================================================================
// RAW QUERY EXAMPLES (when Prisma doesn't support something)
// ============================================================================

/**
 * Raw SQL query example
 */
export async function getStoreStats() {
  const prisma = getPrisma();
  
  return await prisma.$queryRaw`
    SELECT 
      country,
      COUNT(*) as store_count,
      AVG(product_count) as avg_products
    FROM stores
    WHERE is_active = true
    GROUP BY country
    ORDER BY store_count DESC
    LIMIT 10
  `;
}
