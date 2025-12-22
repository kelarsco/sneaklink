# 🔧 Fix Migration Error

## The Problem

The error `The table 'public.users' does not exist` means:
- ✅ PostgreSQL is connected
- ❌ Tables haven't been created yet
- You need to run Prisma migrations first

## Solution

### Step 1: Run Prisma Migrations (Create Tables)

```cmd
cd server
npm run prisma:migrate
```

When prompted:
- **Migration name:** `init`

This creates all tables in PostgreSQL.

### Step 2: Verify Tables Created

```cmd
npm run prisma:studio
```

This opens a GUI. You should see all tables (users, stores, sessions, etc.)

### Step 3: Run Data Migration

After tables are created:

```cmd
npm run migrate:data
```

This will migrate all data from MongoDB to PostgreSQL.

---

## Quick Fix Commands

```cmd
# 1. Create tables
npm run prisma:migrate

# 2. Verify (optional)
npm run prisma:studio

# 3. Migrate data
npm run migrate:data
```

---

**Run `npm run prisma:migrate` first, then `npm run migrate:data`!**
