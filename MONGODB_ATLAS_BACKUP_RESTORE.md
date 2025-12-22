# MongoDB Atlas Backup & Restore Guide

## 🔍 Check MongoDB Atlas Backups

If you're using MongoDB Atlas, you may have automatic backups that can restore your deleted stores.

### Step 1: Access MongoDB Atlas Dashboard

1. Go to: https://cloud.mongodb.com/
2. Log in to your account
3. Select your cluster

### Step 2: Check Backups

1. **Click on "Backup"** in the left sidebar
2. **Look for "Cloud Backup"** or "Continuous Backup"
3. **Check the backup timeline** - look for backups from before you deleted the stores

### Step 3: Restore from Backup

#### Option A: Point-in-Time Restore (Recommended)

1. **In the Backup section**, click on "Restore"
2. **Select "Point in Time"** restore
3. **Choose a date/time** BEFORE you deleted the stores
4. **Select what to restore:**
   - Choose "Restore specific collections"
   - Select only the `stores` collection
5. **Choose restore destination:**
   - Create a new cluster (temporary)
   - Or restore to a different database name
6. **Start the restore process**

#### Option B: Snapshot Restore

1. **In the Backup section**, find a snapshot from before deletion
2. **Click "Restore"** on that snapshot
3. **Follow the restore wizard**

### Step 4: Export Restored Stores

Once restored to a temporary cluster/database:

1. **Connect to the restored database**
2. **Export the stores collection:**
   ```bash
   mongodump --uri="mongodb+srv://user:pass@restored-cluster.mongodb.net/sneaklink" --collection stores --out ./restored-backup
   ```

3. **Or export to JSON:**
   ```bash
   mongoexport --uri="mongodb+srv://user:pass@restored-cluster.mongodb.net/sneaklink" --collection stores --out stores-backup.json --jsonArray
   ```

### Step 5: Import to Current Database

1. **Import from BSON:**
   ```bash
   mongorestore --uri="your-current-mongodb-uri" --db sneaklink --collection stores ./restored-backup/sneaklink/stores.bson
   ```

2. **Or import from JSON:**
   ```bash
   cd server
   node scripts/restore-verified-stores.js --backup stores-backup.json
   ```

## 📋 Quick Checklist

- [ ] Check MongoDB Atlas Dashboard → Backup section
- [ ] Look for backups from before deletion date
- [ ] Use Point-in-Time restore if available
- [ ] Export restored stores collection
- [ ] Import to current database using restore script

## ⚠️ Important Notes

- **Point-in-Time restore** requires Continuous Backup to be enabled
- **Snapshots** are taken at specific intervals (check your backup schedule)
- **Restore process** may take 10-30 minutes depending on data size
- **Temporary cluster** will incur charges until deleted

## 🔧 Alternative: Manual Export/Import

If you have access to the restored database:

1. **Use MongoDB Compass** or **Atlas Data Explorer**
2. **Query verified stores:**
   ```javascript
   db.stores.find({
     isShopify: true,
     isActive: true,
     isPasswordProtected: false,
     productCount: { $gte: 1 }
   })
   ```
3. **Export to JSON**
4. **Import using restore script**

## 💡 Next Steps

After restoring:
1. **Verify store count** matches expected (~1900)
2. **Create a backup** using: `node scripts/export-stores-backup.js`
3. **Set up automated backups** in Atlas
4. **Schedule regular exports** to prevent future data loss
