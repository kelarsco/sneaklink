/**
 * Test MongoDB Connection Script
 * Run this to diagnose database connection issues
 * Usage: node scripts/test-db-connection.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function testConnection() {
  console.log('🔍 Testing MongoDB Connection...\n');

  // Check if MONGODB_URI is set
  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI is not set!');
    console.error('   Please create a .env file in the server directory with:');
    console.error('   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/sneaklink?retryWrites=true&w=majority');
    process.exit(1);
  }

  const mongoUri = process.env.MONGODB_URI.trim();
  console.log('📋 Connection Details:');
  console.log(`   URI Format: ${mongoUri.startsWith('mongodb+srv://') ? 'mongodb+srv:// (Atlas)' : mongoUri.startsWith('mongodb://') ? 'mongodb:// (Local/Other)' : 'Invalid'}`);
  
  // Mask credentials in output
  const maskedUri = mongoUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
  console.log(`   Masked URI: ${maskedUri}`);
  
  const dbName = mongoUri.match(/\/\/([^\/]+)\/([^?]+)/)?.[2] || 'default';
  console.log(`   Database: ${dbName}\n`);

  try {
    console.log('🔄 Attempting to connect...');
    
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 30000,
      connectTimeoutMS: 10000,
    });

    console.log('✅ Connection successful!');
    console.log(`   Host: ${conn.connection.host}`);
    console.log(`   Database: ${conn.connection.name}`);
    console.log(`   Ready State: ${conn.connection.readyState} (1=connected)`);
    
    // Test a simple query
    console.log('\n🧪 Testing database query...');
    const collections = await conn.connection.db.listCollections().toArray();
    console.log(`   Found ${collections.length} collections`);
    
    if (collections.length > 0) {
      console.log('   Collections:');
      collections.forEach(col => {
        console.log(`     - ${col.name}`);
      });
    }

    await mongoose.disconnect();
    console.log('\n✅ Test completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Connection failed!');
    console.error(`   Error: ${error.message}`);
    console.error(`   Name: ${error.name}\n`);

    // Provide specific troubleshooting
    if (error.message.includes('authentication failed') || error.message.includes('bad auth')) {
      console.error('💡 Authentication Issue:');
      console.error('   - Check username and password');
      console.error('   - Ensure password is URL-encoded (special chars like @, #, etc.)');
      console.error('   - Verify user exists in MongoDB Atlas');
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
      console.error('💡 Network/DNS Issue:');
      console.error('   - Check internet connection');
      console.error('   - Verify cluster hostname is correct');
      console.error('   - Try pinging the cluster hostname');
    } else if (error.message.includes('IP') || error.message.includes('whitelist')) {
      console.error('💡 IP Whitelist Issue:');
      console.error('   - Add your IP to MongoDB Atlas Network Access');
      console.error('   - Or use 0.0.0.0/0 for development (not recommended for production)');
    } else if (error.message.includes('timeout') || error.name === 'MongoServerSelectionError') {
      console.error('💡 Timeout Issue:');
      console.error('   - Check firewall settings');
      console.error('   - Verify cluster is not paused (free tier pauses after inactivity)');
      console.error('   - Check if VPN is blocking connection');
    }

    console.error('\n📚 Next Steps:');
    console.error('   1. Verify MONGODB_URI in server/.env file');
    console.error('   2. Check MongoDB Atlas dashboard');
    console.error('   3. Test connection string in MongoDB Compass');
    console.error('   4. Ensure cluster is running (not paused)');
    
    process.exit(1);
  }
}

testConnection();
