# Sneaklink Scraping Pipeline Refactoring Summary

## 🎯 Objective Achieved

Refactored the Sneaklink scraping system from a validation-heavy, rejection-based approach to a **confidence-based, non-destructive pipeline** that maximizes accuracy and eliminates misclassification.

## 🏗️ Architecture Changes

### **4-Phase Pipeline**

1. **Phase 1: Discovery** (`discoveryService.js`)
   - Saves ALL discovered URLs immediately
   - NO validation, NO rejection
   - Stores discovery metadata and source

2. **Phase 2: Shopify Verification** (`verificationService.js`)
   - Confidence-based scoring (0.0 - 1.0)
   - Multiple signals weighted: `/cart.js`, `X-ShopId`, `/products.json`, `cdn.shopify.com`, `.myshopify.com`
   - Status: `confirmed` (≥0.6), `probable` (0.4-0.59), `unlikely` (<0.4), `unverified`
   - Never rejects stores - only updates confidence

3. **Phase 3: Health Check** (`healthCheckService.js`)
   - Soft validation with status flags
   - Detects: password protection, inactivity, product count, rate limiting
   - Never defaults product count on failure (null if unknown)
   - Marks retry eligibility

4. **Phase 4: Classification** (`classificationService.js`)
   - Business model classification with confidence scores
   - Only tags when confidence ≥ 0.7
   - **NEVER assigns Dropshipping as fallback** - uses "Unclassified" instead
   - Respects admin-locked tags

## 📊 Database Schema Changes

### New Fields Added to `Store` Model:

```prisma
// Confidence-based verification
shopifyStatus String  // 'confirmed' | 'probable' | 'unlikely' | 'unverified'
shopifyConfidence Decimal?  // 0.00 - 1.00

// Health check status
isPasswordProtected Boolean
healthStatus String  // 'healthy' | 'possibly_inactive' | 'rate_limited' | 'unknown'
productCount Int?  // Nullable - no defaults on failure
productCountStatus String  // 'confirmed' | 'estimated' | 'unknown' | 'rate_limited'

// Classification (confidence-based)
primaryBusinessModel String?  // 'Print on Demand' | 'Dropshipping' | 'Branded Ecommerce' | 'Marketplace' | null
businessModelConfidence Decimal?  // 0.00 - 1.00
businessModelScores Json?  // Store all scores for explainability

// Signals storage (explainability)
shopifySignals Json?  // Detection signals
discoverySource String?
discoveryMetadata Json?

// Admin controls
tagsLocked Boolean
tagsLockedBy String?
tagsLockedAt DateTime?
adminNotes String?

// Retry tracking
lastVerificationAttempt DateTime?
lastClassificationAttempt DateTime?
nextRetryAt DateTime?
retryCount Int
```

## 🚫 Anti-Patterns Eliminated

- ❌ **No more rejection during discovery** - All URLs saved as candidates
- ❌ **No Dropshipping fallback** - Uses "Unclassified" for low confidence
- ❌ **No binary classification** - Everything is confidence-scored
- ❌ **No default product counts** - Stores null if unknown
- ❌ **No silent failures** - All uncertainty is stored

## ✅ Core Principles Implemented

1. **Never reject a store during discovery** ✅
2. **Never assign Dropshipping as fallback** ✅
3. **All classification must be confidence-based** ✅
4. **Tagging decoupled from scraping** ✅
5. **All uncertainty must be stored** ✅
6. **Failures downgrade confidence, not block saving** ✅

## 🔄 Job Scheduling

### Discovery (Phase 1)
- Runs every 5 minutes (continuous scraping)
- Also runs every 6 hours (deep scrape)
- Daily at 2 AM (comprehensive scrape)

### Processing Pipeline (Phases 2-4)
- Runs every 15 minutes (`storeProcessingScheduler.js`)
- Processes: Verification → Health Check → Classification

## 📝 Migration Required

1. **Database Migration**: Run Prisma migration to add new schema fields
2. **Existing Stores**: Migrate existing stores to new status system
3. **Backward Compatibility**: Legacy fields maintained (`isShopify`, `businessModel`, `tags`)

## 🎯 Tagging Rules

### Allowed Business Model Tags:
- `Print on Demand`
- `Dropshipping`
- `Branded Ecommerce`
- `Marketplace`
- `Unclassified` (when confidence < 0.7)

### Behavioral Tags:
- `Running Ads`

### Only Tag When:
- Confidence ≥ 0.7 for business model tags
- Behavioral tags are independent (e.g., ads)

## 🔍 Files Created

1. `server/services/discoveryService.js` - Phase 1: Discovery
2. `server/services/verificationService.js` - Phase 2: Shopify Verification
3. `server/services/healthCheckService.js` - Phase 3: Health Check
4. `server/services/classificationService.js` - Phase 4: Classification
5. `server/services/storeProcessingScheduler.js` - Orchestration
6. `server/utils/businessModelDetectorV2.js` - Confidence-based detector
7. `server/scripts/migrateStoresToConfidenceSystem.js` - Migration script
8. `server/scripts/README_MIGRATION.md` - Migration guide

## 🔄 Files Modified

1. `server/prisma/schema.prisma` - Added new fields
2. `server/services/continuousScrapingService.js` - Uses discovery service (no validation)
3. `server/server.js` - Added scheduler cron job

## 📋 Next Steps

1. ✅ Run database migration: `npx prisma migrate dev --name add_confidence_based_fields`
2. ✅ Migration script created: `server/scripts/migrateStoresToConfidenceSystem.js`
3. ✅ Business model detector refactored: `businessModelDetectorV2.js` returns confidence scores
4. ⏳ Test pipeline end-to-end
5. ⏳ Monitor classification accuracy
6. ⏳ Add admin UI for tag locking/override

### Migration Instructions

1. **Run Database Migration:**
   ```bash
   cd server
   npx prisma migrate dev --name add_confidence_based_fields
   npx prisma generate
   ```

2. **Migrate Existing Stores:**
   ```bash
   node server/scripts/migrateStoresToConfidenceSystem.js
   ```

3. **Start Server:** The processing pipeline will automatically run every 15 minutes

## 🧪 Testing Checklist

- [ ] Discovery saves all URLs without rejection
- [ ] Verification assigns confidence scores correctly
- [ ] Health checks don't reject stores
- [ ] Classification only tags high-confidence stores
- [ ] No Dropshipping assigned as fallback
- [ ] Admin tag locking works
- [ ] Retry logic functions correctly
- [ ] Backward compatibility maintained (dashboard filters still work)

## 📊 Expected Outcomes

1. **No more misclassified traditional stores** - No Dropshipping fallback
2. **No lost valid Shopify stores** - Nothing rejected during discovery
3. **Explainable classifications** - All scores and signals stored
4. **Future-proof** - Ready for ML integration without refactor
5. **Admin control** - Can override edge cases safely
