# 🔄 PostgreSQL Migration Guide

## ✅ What's Already Set Up

I've prepared the following for you:

1. ✅ **Prisma Schema** (`prisma/schema.prisma`) - Complete database schema
2. ✅ **PostgreSQL Connection** (`config/postgres.js`) - Database connection setup
3. ✅ **Database Creation Scripts** - Auto-create database scripts
4. ✅ **Migration Setup** - Prisma migrations configured
5. ✅ **Usage Examples** (`examples/prisma-usage-example.js`) - How to use Prisma
6. ✅ **NPM Scripts** - All Prisma commands ready

## ⚠️ What Still Uses MongoDB

The following still use MongoDB and need to be updated:
- `server.js` - Currently connects to MongoDB
- All routes (`routes/*.js`) - Use Mongoose models
- All services (`services/*.js`) - Use Mongoose models
- Middleware - Some use Mongoose

**Note:** You can run both databases in parallel during migration!

---

## 📋 Manual Steps to Complete Migration

### Step 1: Install PostgreSQL

**Windows:**
1. Download from: https://www.postgresql.org/download/windows/
2. Run installer
3. **Important:** Check "Add PostgreSQL to PATH" during installation
4. Remember the password you set for `postgres` user

**Verify Installation:**
```cmd
psql --version
```

### Step 2: Create Database

**Option A: Using Script (Recommended)**
```cmd
cd server
npm run db:create:cmd
```

**Option B: Manual Command**
```cmd
# If psql is in PATH:
psql -U postgres -c "CREATE DATABASE sneaklink;"

# Or use full path:
"C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -c "CREATE DATABASE sneaklink;"
```

**You'll be prompted for password** (the one you set during PostgreSQL installation)

### Step 3: Install Prisma Dependencies

```cmd
cd server
npm install
```

This installs:
- `@prisma/client` - Prisma Client for queries
- `prisma` (dev) - Prisma CLI for migrations

### Step 4: Configure Environment Variables

Add to `server/.env`:

```env
# PostgreSQL Connection (NEW)
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/sneaklink?schema=public"

# MongoDB Connection (KEEP for now - can remove after migration)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/sneaklink?retryWrites=true&w=majority
```

**Replace:**
- `YOUR_PASSWORD` with your PostgreSQL `postgres` user password
- Keep MongoDB URI for now (you can remove it later)

### Step 5: Generate Prisma Client

```cmd
npm run prisma:generate
```

This creates the Prisma Client based on your schema.

### Step 6: Run Migrations

```cmd
npm run prisma:migrate
```

When prompted:
- **Migration name:** `init`
- This creates all tables in PostgreSQL

### Step 7: Test PostgreSQL Connection

```cmd
npm run postgres:test
```

You should see:
```
✅ PostgreSQL Connected successfully!
✅ All tests passed!
```

---

## 🔄 Next: Integrate PostgreSQL into Server

### Option A: Run Both Databases (Recommended for Testing)

You can run MongoDB and PostgreSQL in parallel:

**Update `server.js`:**
```javascript
import connectDB from './config/database.js'; // MongoDB (keep for now)
import { connectPostgres } from './config/postgres.js'; // PostgreSQL (new)

// Connect to both
(async () => {
  try {
    // MongoDB (existing)
    await connectDB();
    
    // PostgreSQL (new)
    await connectPostgres();
    
    console.log('✅ Both databases connected!');
  } catch (error) {
    console.error('Database connection error:', error);
  }
})();
```

### Option B: Switch to PostgreSQL Only

**Update `server.js`:**
```javascript
// Remove MongoDB import
// import connectDB from './config/database.js';

// Add PostgreSQL import
import { connectPostgres } from './config/postgres.js';

// Connect to PostgreSQL only
(async () => {
  try {
    await connectPostgres();
    console.log('✅ PostgreSQL connected!');
  } catch (error) {
    console.error('PostgreSQL connection error:', error);
  }
})();
```

---

## 🔧 Update Routes to Use Prisma

### Example: Update `routes/stores.js`

**Before (MongoDB/Mongoose):**
```javascript
import Store from '../models/Store.js';

router.get('/', async (req, res) => {
  const stores = await Store.find(filter).lean();
  // ...
});
```

**After (PostgreSQL/Prisma):**
```javascript
import { getPrisma } from '../config/postgres.js';

router.get('/', async (req, res) => {
  const prisma = getPrisma();
  const stores = await prisma.store.findMany({
    where: filter,
    // ...
  });
  // ...
});
```

**See `examples/prisma-usage-example.js` for complete examples!**

---

## 📊 Migration Strategy

### Phase 1: Setup (You Are Here)
- ✅ Prisma schema created
- ✅ Database connection ready
- ⏳ **You need to:** Install PostgreSQL, create database, run migrations

### Phase 2: Parallel Run (Recommended)
- Run both MongoDB and PostgreSQL
- Gradually migrate routes one by one
- Test each route after migration

### Phase 3: Full Migration
- All routes use Prisma
- Remove MongoDB dependencies
- Remove Mongoose models

### Phase 4: Data Migration (If Needed)
- Export data from MongoDB
- Import to PostgreSQL
- Verify data integrity

---

## 🎯 Quick Checklist

### Setup Checklist
- [ ] PostgreSQL installed
- [ ] Database `sneaklink` created
- [ ] `DATABASE_URL` added to `.env`
- [ ] Dependencies installed (`npm install`)
- [ ] Prisma Client generated (`npm run prisma:generate`)
- [ ] Migrations run (`npm run prisma:migrate`)
- [ ] Connection tested (`npm run postgres:test`)

### Integration Checklist (Future)
- [ ] Update `server.js` to connect to PostgreSQL
- [ ] Update routes to use Prisma
- [ ] Update services to use Prisma
- [ ] Test all endpoints
- [ ] Remove MongoDB code (optional)

---

## 🚀 Quick Start Commands

```cmd
# 1. Create database
npm run db:create:cmd

# 2. Generate Prisma Client
npm run prisma:generate

# 3. Run migrations
npm run prisma:migrate

# 4. Test connection
npm run postgres:test
```

---

## 📝 Current Status

### ✅ Ready to Use
- Prisma schema (all tables defined)
- Database connection setup
- Migration system
- Database creation scripts
- Usage examples

### ⏳ Needs Your Action
1. **Install PostgreSQL** (if not installed)
2. **Create database** (`npm run db:create:cmd`)
3. **Add DATABASE_URL** to `.env`
4. **Run migrations** (`npm run prisma:migrate`)
5. **Test connection** (`npm run postgres:test`)

### 🔄 Future Work (After Setup)
- Update routes to use Prisma
- Update services to use Prisma
- Migrate data from MongoDB (if needed)
- Remove MongoDB code (optional)

---

## 💡 Important Notes

1. **You can keep MongoDB running** - Both databases can coexist
2. **Migrations are safe** - Can run multiple times
3. **Schema is source of truth** - Always edit `schema.prisma`, never migration files
4. **Supabase ready** - Just change `DATABASE_URL` when ready

---

## 🆘 Troubleshooting

### "psql not found"
- Add PostgreSQL to PATH (see `QUICK_DB_CREATE.md`)
- Or use full path in commands

### "Database does not exist"
- Run: `npm run db:create:cmd`
- Or create manually: `psql -U postgres -c "CREATE DATABASE sneaklink;"`

### "Migration failed"
- Check `DATABASE_URL` in `.env`
- Ensure database exists
- Check PostgreSQL is running

### "Prisma Client not generated"
- Run: `npm run prisma:generate`
- Check `node_modules/@prisma/client` exists

---

**🎯 You're at Step 1-7 above. Complete those steps, then we can integrate PostgreSQL into your routes!**

