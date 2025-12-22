import { getPrisma } from '../config/postgres.js';

async function addThemeColumn() {
  try {
    const prisma = getPrisma();
    
    // Add theme column if it doesn't exist
    await prisma.$executeRaw`
      ALTER TABLE stores 
      ADD COLUMN IF NOT EXISTS theme VARCHAR(50);
    `;
    
    console.log('✅ Theme column added successfully!');
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error adding theme column:', error);
    process.exit(1);
  }
}

addThemeColumn();

