-- AlterTable
ALTER TABLE "stores" ADD COLUMN     "store_status" VARCHAR(20) NOT NULL DEFAULT 'pending',
ADD COLUMN     "verified" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "stores_store_status_verified_idx" ON "stores"("store_status", "verified");
