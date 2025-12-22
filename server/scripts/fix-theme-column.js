/**
 * Quick fix script to verify theme column exists and provide instructions
 * Run this with: cd server && node scripts/fix-theme-column.js
 */

import { getPrisma } from '../config/postgres.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') });

async function checkThemeColumn() {
  const prisma = getPrisma();
  
  try {
    console.log('🔍 Checking if theme column exists...\n');
    
    // Try to query stores with theme field
    const testQuery = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'stores' AND column_name = 'theme'
    `;
    
    if (testQuery && testQuery.length > 0) {
      console.log('✅ Theme column exists in database!');
      console.log(`   Column: ${testQuery[0].column_name}`);
      console.log(`   Type: ${testQuery[0].data_type}\n`);
      console.log('⚠️  IMPORTANT: Restart your server to reload the Prisma client!');
      console.log('   The Prisma client needs to be regenerated to recognize the new column.\n');
      console.log('   Steps:');
      console.log('   1. Stop the server (Ctrl+C)');
      console.log('   2. Run: npx prisma generate');
      console.log('   3. Restart the server: npm start\n');
    } else {
      console.log('❌ Theme column does NOT exist in database!');
      console.log('   Running prisma db push to add it...\n');
      
      // This would require running prisma db push, which we can't do from here
      console.log('   Please run: npx prisma db push');
    }
    
    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error checking theme column:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

checkThemeColumn();
