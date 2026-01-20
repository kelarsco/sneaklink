import { getPrisma } from '../config/postgres.js';

/**
 * MIGRATION SCRIPT: Migrate Existing Stores to Confidence-Based System
 * 
 * This script migrates existing stores from the old validation system
 * to the new confidence-based system.
 * 
 * Run: node server/scripts/migrateStoresToConfidenceSystem.js
 */

const migrateStores = async () => {
  const prisma = getPrisma();
  
  console.log('🔄 Starting migration of existing stores to confidence-based system...\n');
  
  try {
    // Get all stores that need migration
    const stores = await prisma.store.findMany({
      select: {
        id: true,
        url: true,
        isShopify: true,
        isActive: true,
        productCount: true,
        businessModel: true,
        tags: true,
      },
    });
    
    console.log(`📊 Found ${stores.length} stores to migrate\n`);
    
    let migrated = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const store of stores) {
      try {
        const updateData = {};
        
        // Migrate Shopify status
        if (store.isShopify === true) {
          // If already marked as Shopify, set high confidence
          updateData.shopifyStatus = 'confirmed';
          updateData.shopifyConfidence = 0.9; // High confidence for existing verified stores
          updateData.shopifySignals = {
            migrated: true,
            legacy_isShopify: true,
          };
        } else {
          // Unknown - needs verification
          updateData.shopifyStatus = 'unverified';
          updateData.shopifyConfidence = null;
          updateData.shopifySignals = {
            migrated: true,
            legacy_isShopify: false,
          };
        }
        
        // Migrate health status
        if (store.isActive === true) {
          updateData.healthStatus = 'healthy';
        } else {
          updateData.healthStatus = 'possibly_inactive';
        }
        
        // Migrate product count status
        if (store.productCount && store.productCount > 0) {
          updateData.productCountStatus = 'confirmed';
        } else {
          updateData.productCountStatus = 'unknown';
          // Remove default product count if it was 1 (legacy default)
          if (store.productCount === 1) {
            updateData.productCount = null;
          }
        }
        
        // Migrate business model classification
        // Note: We'll set low confidence for existing tags to trigger re-classification
        const existingTags = store.tags || [];
        const businessModelTag = existingTags.find(t => 
          ['Dropshipping', 'Print on Demand', 'Branded Ecommerce', 'Marketplace'].includes(t)
        );
        
        if (businessModelTag) {
          // Map existing tag to primary business model
          let primaryModel = null;
          if (businessModelTag === 'Print on Demand') {
            primaryModel = 'Print on Demand';
          } else if (businessModelTag === 'Dropshipping') {
            primaryModel = 'Dropshipping';
          } else if (businessModelTag === 'Branded Ecommerce') {
            primaryModel = 'Branded Ecommerce';
          } else if (businessModelTag === 'Marketplace') {
            primaryModel = 'Marketplace';
          }
          
          if (primaryModel) {
            updateData.primaryBusinessModel = primaryModel;
            // Set low confidence to trigger re-classification with new system
            updateData.businessModelConfidence = 0.5;
            updateData.businessModelScores = {
              [primaryModel]: 0.5,
              migrated: true,
            };
            // Keep tags for backward compatibility, but mark for re-classification
            updateData.nextRetryAt = new Date(); // Schedule immediate re-classification
          } else {
            // Unknown tag - mark as unclassified
            updateData.primaryBusinessModel = null;
            updateData.businessModelConfidence = null;
            updateData.businessModelScores = {
              migrated: true,
              unknown_tag: businessModelTag,
            };
          }
        } else {
          // No business model tag - mark as unclassified
          updateData.primaryBusinessModel = null;
          updateData.businessModelConfidence = null;
          updateData.businessModelScores = {
            migrated: true,
            no_tag: true,
          };
          // If no tags, set empty array with Unclassified if needed
          if (existingTags.length === 0) {
            updateData.tags = ['Unclassified'];
          }
        }
        
        // Migrate legacy businessModel field if it exists
        if (store.businessModel && store.businessModel !== 'Unknown') {
          // Legacy field already populated - keep it for backward compatibility
          // primaryBusinessModel is set above based on tags
        }
        
        // Set discovery metadata
        updateData.discoverySource = 'migration';
        updateData.discoveryMetadata = {
          migrated_at: new Date().toISOString(),
          legacy_isShopify: store.isShopify,
          legacy_isActive: store.isActive,
          legacy_productCount: store.productCount,
          legacy_tags: store.tags,
        };
        
        // Update store
        await prisma.store.update({
          where: { id: store.id },
          data: updateData,
        });
        
        migrated++;
        
        if (migrated % 100 === 0) {
          console.log(`   ✅ Migrated ${migrated}/${stores.length} stores...`);
        }
      } catch (error) {
        console.error(`   ❌ Error migrating store ${store.id}:`, error.message);
        errors++;
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('✨ Migration Complete!');
    console.log('='.repeat(80));
    console.log(`✅ Migrated: ${migrated} stores`);
    console.log(`⏭️  Skipped: ${skipped} stores`);
    console.log(`❌ Errors: ${errors} stores`);
    console.log('\n📋 Next Steps:');
    console.log('   1. Run store processing pipeline to re-verify and re-classify stores');
    console.log('   2. Monitor classification accuracy');
    console.log('   3. Review stores with low confidence for manual correction');
    console.log('='.repeat(80) + '\n');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
};

// Run migration
migrateStores().catch(console.error);
