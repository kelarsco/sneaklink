# 🔄 Complete PostgreSQL Migration Guide

## Overview

This guide will help you migrate from MongoDB to PostgreSQL completely.

## Step 1: Migrate Data

Run the data migration script:

```cmd
cd server
npm run migrate:data
```

This will:
- Connect to both MongoDB and PostgreSQL
- Migrate all data (Users, Stores, Sessions, Subscriptions, Support Tickets, Staff)
- Skip duplicates automatically
- Show migration statistics

**Important:** Make sure:
- ✅ PostgreSQL is connected
- ✅ MongoDB is still connected (for migration)
- ✅ Migrations are run: `npm run prisma:migrate`

## Step 2: Verify Data Migration

Check your data in Prisma Studio:

```cmd
npm run prisma:studio
```

Verify:
- Users are migrated
- Stores are migrated
- Counts match MongoDB

## Step 3: Test with PostgreSQL Only

After data is migrated, the code will be updated to use PostgreSQL only.

## Step 4: Remove MongoDB (After Testing)

Once everything works:
1. Remove `MONGODB_URI` from `.env`
2. Remove MongoDB dependencies from `package.json`
3. Delete MongoDB model files

---

## Migration Script Details

The migration script (`scripts/migrate-mongodb-to-postgres.js`):
- Migrates in order: Users → Stores → Sessions → Subscriptions → Support Tickets → Staff
- Handles foreign key relationships
- Skips duplicates (based on unique fields)
- Shows detailed statistics

---

## After Migration

Once migration is complete:
- All routes use Prisma
- All services use Prisma
- All middleware uses Prisma
- MongoDB code is removed
- Server only connects to PostgreSQL

---

**Ready to migrate? Run `npm run migrate:data`!**
