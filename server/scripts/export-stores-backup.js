/**
 * Export Stores Backup Script
 * Creates a backup of all verified stores in JSON format
 * 
 * Usage: node scripts/export-stores-backup.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') });

import Store from '../models/Store.js';
import connectDB from '../config/database.js';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ Error: MONGODB_URI is not set in .env file');
  process.exit(1);
}

async function exportStoresBackup() {
  try {
    console.log('📦 Creating Stores Backup\n');
    
    // Connect to database
    console.log('📡 Connecting to MongoDB...');
    await connectDB();
    console.log('✅ Connected to MongoDB\n');
    
    // Get all verified stores
    console.log('📊 Fetching verified stores...');
    const verifiedStores = await Store.find({
      isShopify: true,
      isActive: true,
      isPasswordProtected: false,
      productCount: { $gte: 1 }
    }).lean();
    
    console.log(`✅ Found ${verifiedStores.length} verified stores\n`);
    
    if (verifiedStores.length === 0) {
      console.log('⚠️  No verified stores found to backup.\n');
      await mongoose.disconnect();
      return;
    }
    
    // Create backups directory if it doesn't exist
    const backupsDir = join(__dirname, '../backups');
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }
    
    // Create backup filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = join(backupsDir, `verified-stores-backup-${timestamp}.json`);
    
    // Export to JSON
    const backupData = {
      exportedAt: new Date().toISOString(),
      totalStores: verifiedStores.length,
      stores: verifiedStores
    };
    
    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2), 'utf8');
    
    console.log(`✅ Backup created successfully!`);
    console.log(`   File: ${backupFile}`);
    console.log(`   Stores: ${verifiedStores.length}`);
    console.log(`   Size: ${(fs.statSync(backupFile).size / 1024).toFixed(2)} KB\n`);
    
    await mongoose.disconnect();
    console.log('✅ Backup process completed\n');
    
  } catch (error) {
    console.error('\n❌ Error creating backup:', error);
    console.error(`   Message: ${error.message}`);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
}

exportStoresBackup();
