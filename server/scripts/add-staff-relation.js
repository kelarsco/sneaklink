import { getPrisma } from '../config/postgres.js';

async function addStaffRelation() {
  try {
    const prisma = getPrisma();
    
    // Add foreign key constraint if it doesn't exist
    // Note: This assumes the added_by column already exists
    // If the foreign key already exists, this will fail gracefully
    try {
      await prisma.$executeRaw`
        ALTER TABLE staff 
        ADD CONSTRAINT IF NOT EXISTS staff_added_by_fkey 
        FOREIGN KEY (added_by) 
        REFERENCES users(id) 
        ON DELETE SET NULL;
      `;
      console.log('✅ Foreign key constraint added successfully!');
    } catch (error) {
      if (error.message.includes('already exists') || error.message.includes('duplicate')) {
        console.log('✅ Foreign key constraint already exists');
      } else {
        throw error;
      }
    }
    
    // Add index if it doesn't exist
    try {
      await prisma.$executeRaw`
        CREATE INDEX IF NOT EXISTS staff_added_by_idx ON staff(added_by);
      `;
      console.log('✅ Index added successfully!');
    } catch (error) {
      if (error.message.includes('already exists') || error.message.includes('duplicate')) {
        console.log('✅ Index already exists');
      } else {
        throw error;
      }
    }
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error adding staff relation:', error);
    process.exit(1);
  }
}

addStaffRelation();
