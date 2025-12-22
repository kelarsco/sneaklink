/**
 * Test MongoDB connection
 * Run with: node utils/testConnection.js
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config({ path: './.env' });

const testConnection = async () => {
  try {
    console.log('🧪 Testing MongoDB connection...\n');
    
    if (!process.env.MONGODB_URI) {
      console.error('❌ MONGODB_URI not found in .env file');
      console.error('   Make sure you have a .env file in the server directory');
      process.exit(1);
    }
    
    console.log('📋 Connection Details:');
    const uri = process.env.MONGODB_URI;
    const maskedUri = uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
    console.log(`   URI: ${maskedUri}\n`);
    
    console.log('🔄 Attempting connection...');
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
    });
    
    console.log('\n✅ Connection successful!');
    console.log(`   Host: ${conn.connection.host}`);
    console.log(`   Database: ${conn.connection.name}`);
    console.log(`   Ready State: ${conn.connection.readyState} (1 = connected)`);
    
    // Test a simple query
    const collections = await conn.connection.db.listCollections().toArray();
    console.log(`\n📊 Collections in database: ${collections.length}`);
    if (collections.length > 0) {
      collections.forEach(col => {
        console.log(`   - ${col.name}`);
      });
    }
    
    await mongoose.disconnect();
    console.log('\n✅ Test completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Connection failed!');
    console.error(`   Error: ${error.message}\n`);
    
    if (error.message.includes('authentication failed')) {
      console.error('💡 Fix: Check username and password in MONGODB_URI');
    } else if (error.message.includes('IP')) {
      console.error('💡 Fix: Add your IP to MongoDB Atlas Network Access whitelist');
    } else if (error.message.includes('ENOTFOUND')) {
      console.error('💡 Fix: Check cluster hostname in connection string');
    }
    
    process.exit(1);
  }
};

testConnection();
