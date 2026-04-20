-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "picture" VARCHAR(500),
    "google_id" VARCHAR(255),
    "provider" VARCHAR(20) NOT NULL DEFAULT 'google',
    "paystack_customer_code" VARCHAR(100),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "account_status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "subscription_plan" VARCHAR(20),
    "subscription_status" VARCHAR(20) DEFAULT 'active',
    "subscription_start_date" TIMESTAMPTZ,
    "subscription_end_date" TIMESTAMPTZ,
    "subscription_auto_renew" BOOLEAN NOT NULL DEFAULT false,
    "subscription_billing_cycle" VARCHAR(20),
    "filter_queries_this_month" INTEGER NOT NULL DEFAULT 0,
    "filter_queries_reset_date" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "csv_exports_today" INTEGER NOT NULL DEFAULT 0,
    "csv_exports_reset_date" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "copy_operations_today" INTEGER NOT NULL DEFAULT 0,
    "copy_operations_reset_date" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "max_devices" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "last_login" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_devices" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "device_id" VARCHAR(64) NOT NULL,
    "last_active" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "plan" VARCHAR(20) NOT NULL,
    "billing_cycle" VARCHAR(20) NOT NULL DEFAULT 'monthly',
    "paystack_customer_code" VARCHAR(100) NOT NULL,
    "paystack_subscription_code" VARCHAR(100) NOT NULL,
    "paystack_authorization_code" VARCHAR(100) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'NGN',
    "start_date" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "next_payment_date" TIMESTAMPTZ NOT NULL,
    "cancelled_at" TIMESTAMPTZ,
    "cancelled_by" VARCHAR(20),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "session_id" VARCHAR(255) NOT NULL,
    "token" VARCHAR(500) NOT NULL,
    "ip" VARCHAR(45),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_activity" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stores" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "url" VARCHAR(500) NOT NULL,
    "country" VARCHAR(50) NOT NULL,
    "productCount" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_shopify" BOOLEAN NOT NULL DEFAULT true,
    "has_facebook_ads" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT[],
    "business_model" VARCHAR(20) NOT NULL DEFAULT 'Unknown',
    "source" VARCHAR(20) NOT NULL DEFAULT 'api',
    "date_added" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_scraped" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_tickets" (
    "id" TEXT NOT NULL,
    "ticket_id" VARCHAR(20) NOT NULL,
    "user_id" TEXT,
    "user_email" VARCHAR(255) NOT NULL,
    "user_name" VARCHAR(200) NOT NULL,
    "user_plan" VARCHAR(20) NOT NULL DEFAULT 'free',
    "subject" VARCHAR(500) NOT NULL,
    "message" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'open',
    "priority" VARCHAR(20) NOT NULL DEFAULT 'medium',
    "replies" JSONB,
    "last_replied_by" VARCHAR(20),
    "last_replied_at" TIMESTAMPTZ,
    "assigned_to" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "role" VARCHAR(20) NOT NULL DEFAULT 'support',
    "permissions" TEXT[],
    "invitation_token" VARCHAR(64),
    "invitation_token_expires" TIMESTAMPTZ,
    "invitation_accepted" BOOLEAN NOT NULL DEFAULT false,
    "invitation_accepted_at" TIMESTAMPTZ,
    "added_by" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "staff_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_google_id_key" ON "users"("google_id");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_subscription_plan_subscription_status_idx" ON "users"("subscription_plan", "subscription_status");

-- CreateIndex
CREATE INDEX "users_account_status_is_active_idx" ON "users"("account_status", "is_active");

-- CreateIndex
CREATE INDEX "user_devices_user_id_idx" ON "user_devices"("user_id");

-- CreateIndex
CREATE INDEX "user_devices_last_active_idx" ON "user_devices"("last_active");

-- CreateIndex
CREATE UNIQUE INDEX "user_devices_user_id_device_id_key" ON "user_devices"("user_id", "device_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_paystack_subscription_code_key" ON "subscriptions"("paystack_subscription_code");

-- CreateIndex
CREATE INDEX "subscriptions_user_id_status_idx" ON "subscriptions"("user_id", "status");

-- CreateIndex
CREATE INDEX "subscriptions_paystack_subscription_code_idx" ON "subscriptions"("paystack_subscription_code");

-- CreateIndex
CREATE INDEX "subscriptions_status_next_payment_date_idx" ON "subscriptions"("status", "next_payment_date");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_session_id_key" ON "sessions"("session_id");

-- CreateIndex
CREATE INDEX "sessions_user_id_is_active_idx" ON "sessions"("user_id", "is_active");

-- CreateIndex
CREATE INDEX "sessions_session_id_is_active_idx" ON "sessions"("session_id", "is_active");

-- CreateIndex
CREATE INDEX "sessions_last_activity_idx" ON "sessions"("last_activity");

-- CreateIndex
CREATE UNIQUE INDEX "stores_url_key" ON "stores"("url");

-- CreateIndex
CREATE INDEX "stores_is_active_is_shopify_country_idx" ON "stores"("is_active", "is_shopify", "country");

-- CreateIndex
CREATE INDEX "stores_is_active_tags_idx" ON "stores"("is_active", "tags");

-- CreateIndex
CREATE INDEX "stores_date_added_idx" ON "stores"("date_added" DESC);

-- CreateIndex
CREATE INDEX "stores_last_scraped_idx" ON "stores"("last_scraped");

-- CreateIndex
CREATE INDEX "stores_country_is_active_idx" ON "stores"("country", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "support_tickets_ticket_id_key" ON "support_tickets"("ticket_id");

-- CreateIndex
CREATE INDEX "support_tickets_user_id_created_at_idx" ON "support_tickets"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "support_tickets_status_created_at_idx" ON "support_tickets"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "support_tickets_user_email_idx" ON "support_tickets"("user_email");

-- CreateIndex
CREATE INDEX "support_tickets_created_at_idx" ON "support_tickets"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "staff_email_key" ON "staff"("email");

-- CreateIndex
CREATE UNIQUE INDEX "staff_invitation_token_key" ON "staff"("invitation_token");

-- CreateIndex
CREATE INDEX "staff_email_idx" ON "staff"("email");

-- CreateIndex
CREATE INDEX "staff_status_idx" ON "staff"("status");

-- CreateIndex
CREATE INDEX "staff_invitation_token_idx" ON "staff"("invitation_token");

-- AddForeignKey
ALTER TABLE "user_devices" ADD CONSTRAINT "user_devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
