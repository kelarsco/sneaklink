# Store Migration Guide

## Overview

This guide explains how to migrate existing stores from the old validation-based system to the new confidence-based system.

## Migration Steps

### 1. Run Database Migration

First, apply the schema changes:

```bash
cd server
npx prisma migrate dev --name add_confidence_based_fields
npx prisma generate
```

This will:
- Add all new confidence fields to the `Store` table
- Maintain backward compatibility with existing fields
- Create indexes for performance

### 2. Run Store Migration Script

Migrate existing stores to the new system:

```bash
node server/scripts/migrateStoresToConfidenceSystem.js
```

This script will:
- Migrate all existing stores to the new confidence-based status system
- Set initial confidence scores based on existing data
- Mark stores for re-verification and re-classification
- Preserve all existing tags and metadata

### 3. Start Processing Pipeline

The processing pipeline will automatically:
- Re-verify all stores with confidence-based scoring
- Perform health checks on verified stores
- Re-classify stores with the new confidence-based system

The pipeline runs every 15 minutes automatically, but you can also trigger it manually via the API endpoint (if implemented).

### 4. Monitor Migration Results

Check the database for stores that need attention:

```sql
-- Stores with low confidence classifications
SELECT id, url, primaryBusinessModel, businessModelConfidence, tags
FROM stores
WHERE businessModelConfidence < 0.7 AND primaryBusinessModel IS NOT NULL;

-- Stores that need re-verification
SELECT id, url, shopifyStatus, shopifyConfidence
FROM stores
WHERE shopifyStatus IN ('unverified', 'unlikely');
```

## What Happens During Migration

### Existing Stores Status

1. **Shopify Status**: 
   - Stores with `isShopify = true` → `shopifyStatus = 'confirmed'`, `shopifyConfidence = 0.9`
   - Stores with `isShopify = false` → `shopifyStatus = 'unverified'`, will be re-verified

2. **Health Status**:
   - Stores with `isActive = true` → `healthStatus = 'healthy'`
   - Stores with `isActive = false` → `healthStatus = 'possibly_inactive'`

3. **Product Count**:
   - Stores with product count > 0 → `productCountStatus = 'confirmed'`
   - Stores with product count = 1 (legacy default) → `productCount = null`, `productCountStatus = 'unknown'`

4. **Classification**:
   - Existing tags are preserved
   - `primaryBusinessModel` set based on existing tags
   - `businessModelConfidence` set to 0.5 (low) to trigger re-classification
   - Stores scheduled for immediate re-classification

### After Migration

The processing pipeline will:
1. Re-verify stores with low confidence
2. Perform health checks
3. Re-classify stores with the new confidence-based detector
4. Update tags only when confidence ≥ 0.7

## Backward Compatibility

All legacy fields are maintained:
- `isShopify` - Updated based on `shopifyStatus`
- `businessModel` - Updated based on `primaryBusinessModel`
- `tags` - Preserved and updated by classification service
- `isActive` - Updated based on `healthStatus`

Dashboard filters continue to work as before.

## Troubleshooting

### Migration Fails

If migration fails:
1. Check database connection
2. Ensure schema migration completed successfully
3. Check for foreign key constraints
4. Review error logs

### Stores Not Re-classifying

If stores aren't being re-classified:
1. Check `nextRetryAt` field - should be in the past for immediate processing
2. Verify processing pipeline is running (check server logs)
3. Check `tagsLocked` field - locked tags won't be updated
4. Verify `shopifyStatus` is 'confirmed' or 'probable' (only verified stores are classified)

### Low Confidence Scores

Low confidence scores are expected for:
- Stores that were previously tagged without high confidence
- Stores with ambiguous signals
- Stores that need manual review

These stores will be tagged as "Unclassified" until they can be manually reviewed or re-classified with better signals.

## Manual Review

Admins can:
1. Lock tags to prevent auto-updates: `UPDATE stores SET tagsLocked = true WHERE id = '...'`
2. Add admin notes: `UPDATE stores SET adminNotes = '...' WHERE id = '...'`
3. Override classification: Update `primaryBusinessModel`, `businessModelConfidence`, and `tags` manually

Locked tags won't be updated by the classification service.
