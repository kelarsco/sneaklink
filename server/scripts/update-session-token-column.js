import { getPrisma } from '../config/postgres.js';

async function updateSessionTokenColumn() {
  try {
    const prisma = getPrisma();
    
    // Change token column from VARCHAR(500) to TEXT to support longer JWT tokens
    await prisma.$executeRaw`
      ALTER TABLE sessions 
      ALTER COLUMN token TYPE TEXT;
    `;
    
    console.log('✅ Session token column updated to TEXT successfully!');
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error updating session token column:', error);
    process.exit(1);
  }
}

updateSessionTokenColumn();
