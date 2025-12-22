/**
 * Script to update all stores with null/empty themes
 * Assigns a random free theme to stores that don't have one
 */

import { getPrisma } from '../config/postgres.js';

const FREE_THEMES = [
  'Dawn', 'Refresh', 'Sense', 'Craft', 'Studio', 'Taste', 'Origin',
  'Debut', 'Brooklyn', 'Minimal', 'Supply', 'Venture', 'Simple'
];

const PAID_THEMES = [
  'Impulse', 'Motion', 'Prestige', 'Empire', 'Expanse', 'Warehouse',
  'Enterprise', 'Symmetry', 'Modular', 'Palo Alto', 'Loft', 'Blockshop',
  'Flow', 'Avenue', 'Broadcast', 'Pipeline', 'Envy', 'Streamline',
  'Fashionopolism', 'District', 'Venue', 'Editorial', 'Focal', 'Chronicle', 'Galleria'
];

async function updateStoreThemes() {
  const prisma = getPrisma();
  
  try {
    console.log('🔍 Finding stores with null or empty themes...');
    
    // Find all stores with null or empty themes
    const storesToUpdate = await prisma.store.findMany({
      where: {
        OR: [
          { theme: null },
          { theme: '' },
          { theme: 'Unknown' },
        ],
      },
      select: {
        id: true,
        url: true,
        name: true,
        theme: true,
      },
    });
    
    console.log(`📊 Found ${storesToUpdate.length} stores to update`);
    
    if (storesToUpdate.length === 0) {
      console.log('✅ All stores already have themes assigned!');
      return;
    }
    
    let updated = 0;
    let errors = 0;
    
    // Update each store with a random free theme
    for (const store of storesToUpdate) {
      try {
        // Assign a random free theme
        const randomTheme = FREE_THEMES[Math.floor(Math.random() * FREE_THEMES.length)];
        
        await prisma.store.update({
          where: { id: store.id },
          data: { theme: randomTheme },
        });
        
        updated++;
        
        if (updated % 100 === 0) {
          console.log(`   ✅ Updated ${updated}/${storesToUpdate.length} stores...`);
        }
      } catch (error) {
        errors++;
        console.error(`   ❌ Error updating store ${store.id} (${store.url}):`, error.message);
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('✨ Theme Update Complete!');
    console.log('='.repeat(80));
    console.log(`✅ Successfully updated: ${updated} stores`);
    console.log(`❌ Errors: ${errors} stores`);
    console.log(`📊 Total processed: ${storesToUpdate.length} stores`);
    
  } catch (error) {
    console.error('❌ Fatal error updating store themes:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
updateStoreThemes()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
