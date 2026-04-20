/*
  Warnings:

  - You are about to drop the column `productCount` on the `stores` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "sessions" ALTER COLUMN "token" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "stores" DROP COLUMN "productCount",
ADD COLUMN     "admin_notes" TEXT,
ADD COLUMN     "business_model_confidence" DECIMAL(3,2),
ADD COLUMN     "business_model_scores" JSONB,
ADD COLUMN     "discovery_metadata" JSONB,
ADD COLUMN     "discovery_source" VARCHAR(50),
ADD COLUMN     "health_status" VARCHAR(20) NOT NULL DEFAULT 'unknown',
ADD COLUMN     "is_password_protected" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "last_classification_attempt" TIMESTAMPTZ,
ADD COLUMN     "last_updated" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "last_verification_attempt" TIMESTAMPTZ,
ADD COLUMN     "next_retry_at" TIMESTAMPTZ,
ADD COLUMN     "primary_business_model" VARCHAR(50),
ADD COLUMN     "product_count" INTEGER,
ADD COLUMN     "product_count_status" VARCHAR(20) NOT NULL DEFAULT 'unknown',
ADD COLUMN     "retry_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "shopify_confidence" DECIMAL(3,2),
ADD COLUMN     "shopify_signals" JSONB,
ADD COLUMN     "shopify_status" VARCHAR(20) NOT NULL DEFAULT 'unverified',
ADD COLUMN     "tags_locked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tags_locked_at" TIMESTAMPTZ,
ADD COLUMN     "tags_locked_by" VARCHAR(255),
ALTER COLUMN "name" SET DATA TYPE VARCHAR(500);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "suspension_count" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "authentic_visitors" (
    "id" TEXT NOT NULL,
    "visitor_fingerprint" VARCHAR(64) NOT NULL,
    "ip_hash" VARCHAR(64) NOT NULL,
    "user_agent" VARCHAR(500),
    "referrer" VARCHAR(500),
    "language" VARCHAR(10),
    "timezone" VARCHAR(50),
    "screen_resolution" VARCHAR(20),
    "is_bot" BOOLEAN NOT NULL DEFAULT false,
    "is_spam" BOOLEAN NOT NULL DEFAULT false,
    "is_data_center" BOOLEAN NOT NULL DEFAULT false,
    "has_interaction" BOOLEAN NOT NULL DEFAULT false,
    "is_validated" BOOLEAN NOT NULL DEFAULT false,
    "session_id" VARCHAR(64),
    "last_seen" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "authentic_visitors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_history" (
    "id" TEXT NOT NULL,
    "user_id" VARCHAR(255) NOT NULL,
    "notification_type" VARCHAR(50) NOT NULL,
    "account_status" VARCHAR(20) NOT NULL,
    "sent_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "error_message" TEXT,

    CONSTRAINT "notification_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "authentic_visitors_visitor_fingerprint_key" ON "authentic_visitors"("visitor_fingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "authentic_visitors_session_id_key" ON "authentic_visitors"("session_id");

-- CreateIndex
CREATE INDEX "authentic_visitors_visitor_fingerprint_idx" ON "authentic_visitors"("visitor_fingerprint");

-- CreateIndex
CREATE INDEX "authentic_visitors_session_id_idx" ON "authentic_visitors"("session_id");

-- CreateIndex
CREATE INDEX "authentic_visitors_created_at_idx" ON "authentic_visitors"("created_at" DESC);

-- CreateIndex
CREATE INDEX "authentic_visitors_last_seen_idx" ON "authentic_visitors"("last_seen");

-- CreateIndex
CREATE INDEX "authentic_visitors_is_validated_created_at_idx" ON "authentic_visitors"("is_validated", "created_at");

-- CreateIndex
CREATE INDEX "notification_history_user_id_idx" ON "notification_history"("user_id");

-- CreateIndex
CREATE INDEX "notification_history_sent_at_idx" ON "notification_history"("sent_at" DESC);

-- CreateIndex
CREATE INDEX "notification_history_notification_type_idx" ON "notification_history"("notification_type");

-- CreateIndex
CREATE INDEX "staff_added_by_idx" ON "staff"("added_by");

-- CreateIndex
CREATE INDEX "stores_shopify_status_shopify_confidence_idx" ON "stores"("shopify_status", "shopify_confidence");

-- CreateIndex
CREATE INDEX "stores_primary_business_model_business_model_confidence_idx" ON "stores"("primary_business_model", "business_model_confidence");

-- CreateIndex
CREATE INDEX "stores_health_status_product_count_status_idx" ON "stores"("health_status", "product_count_status");

-- CreateIndex
CREATE INDEX "stores_next_retry_at_idx" ON "stores"("next_retry_at");

-- AddForeignKey
ALTER TABLE "staff" ADD CONSTRAINT "staff_added_by_fkey" FOREIGN KEY ("added_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
