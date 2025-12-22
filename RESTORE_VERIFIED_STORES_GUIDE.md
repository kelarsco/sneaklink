# Restore Verified Stores Guide

## ⚠️ Important: Data Recovery Options

Unfortunately, if stores were deleted from MongoDB and there's no backup, we cannot directly restore the exact same stores. However, here are your options:

## 🔍 Recovery Methods

### Method 1: MongoDB Oplog (If Replica Set Enabled)

If your MongoDB is configured as a replica set, deleted documents may be recoverable from the oplog.

**Run the restoration script:**
```bash
cd server
node scripts/restore-verified-stores.js
```

This script will:
- Check if MongoDB oplog is available
- Search for deleted store operations
- Attempt to restore verified stores from oplog

### Method 2: MongoDB Atlas Backups (If Using Atlas)

If you're using MongoDB Atlas:

1. **Go to MongoDB Atlas Dashboard**
2. **Navigate to:** Clusters → Your Cluster → Backup
3. **Check for automated backups** (Atlas creates daily backups)
4. **Restore from a backup** taken before the deletion
5. **Export only the stores collection** from the restored backup
6. **Import into your current database**

### Method 3: Local MongoDB Backups

If you have local MongoDB dumps:

1. **Find your backup files** (usually `.bson` or `.json` format)
2. **Restore from backup:**
   ```bash
   # For BSON backup
   mongorestore --db sneaklink --collection stores backup/stores.bson
   
   # For JSON backup
   node scripts/restore-verified-stores.js --backup path/to/backup.json
   ```

### Method 4: Re-scraping (Will Discover New Stores)

This won't restore the exact same stores, but will discover new verified stores:

```bash
cd server
node scripts/restore-stores.js
```

This starts the continuous scraping job which will discover and add new verified stores over time.

## 📦 Create Future Backups

To prevent this from happening again, create regular backups:

```bash
cd server
node scripts/export-stores-backup.js
```

This creates a JSON backup of all verified stores in `server/backups/`.

## 🔧 Manual Restoration Steps

### If You Have a JSON Backup File:

1. **Place your backup file** in `server/backups/` or provide the full path
2. **Run restoration:**
   ```bash
   cd server
   node scripts/restore-verified-stores.js --backup path/to/your-backup.json
   ```

### If You Have MongoDB Dump:

1. **Restore the entire database:**
   ```bash
   mongorestore --uri="your-mongodb-uri" --db sneaklink dump/sneaklink
   ```

2. **Or restore only stores collection:**
   ```bash
   mongorestore --uri="your-mongodb-uri" --db sneaklink --collection stores dump/sneaklink/stores.bson
   ```

## 📊 Verified Store Criteria

Stores are considered "verified" if they meet ALL these criteria:
- ✅ `isShopify: true` - Confirmed Shopify store
- ✅ `isActive: true` - Store is currently active
- ✅ `isPasswordProtected: false` - Not password protected
- ✅ `productCount >= 1` - Has at least 1 product

## ⚡ Quick Start

1. **Check for oplog recovery:**
   ```bash
   cd server
   node scripts/restore-verified-stores.js
   ```

2. **If oplog recovery doesn't work, check MongoDB Atlas backups** (if using Atlas)

3. **If no backups available, start re-scraping:**
   ```bash
   cd server
   node scripts/restore-stores.js
   ```

4. **Create future backups regularly:**
   ```bash
   cd server
   node scripts/export-stores-backup.js
   ```

## 💡 Prevention Tips

1. **Enable MongoDB Atlas automated backups** (if using Atlas)
2. **Run export script regularly:**
   ```bash
   # Add to cron/scheduled task
   node scripts/export-stores-backup.js
   ```
3. **Keep backups in multiple locations**
4. **Test restore process** to ensure backups work

## 📝 Notes

- The restoration script will skip stores that already exist (by URL)
- It will only restore verified stores (meeting all criteria)
- Restoration may take time depending on the number of stores
- Monitor the console output for progress
