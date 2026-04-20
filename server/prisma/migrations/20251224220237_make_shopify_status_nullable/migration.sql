-- AlterTable
ALTER TABLE "stores" ALTER COLUMN "health_status" DROP NOT NULL,
ALTER COLUMN "health_status" DROP DEFAULT,
ALTER COLUMN "shopify_status" DROP NOT NULL,
ALTER COLUMN "shopify_status" DROP DEFAULT;
