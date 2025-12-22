# 🐘 PostgreSQL Setup Guide for Sneaklink

## Overview

This guide sets up PostgreSQL locally with Prisma ORM, designed for seamless migration to Supabase Postgres in production.

**Key Principles:**
- ✅ Migration-first approach (schema.prisma is single source of truth)
- ✅ Zero code changes when switching from local → Supabase
- ✅ UUID primary keys for all tables
- ✅ Supabase-compatible schema (no vendor-specific extensions)

---

## 📋 Prerequisites

1. **PostgreSQL installed locally**
   - Windows: Download from [postgresql.org](https://www.postgresql.org/download/windows/)
   - Mac: `brew install postgresql@15`
   - Linux: `sudo apt-get install postgresql postgresql-contrib`

2. **Node.js** (already installed)

3. **PostgreSQL running**
   ```bash
   # Check if PostgreSQL is running
   psql --version
   
   # Start PostgreSQL (if not running)
   # Windows: Services → PostgreSQL
   # Mac: brew services start postgresql@15
   # Linux: sudo systemctl start postgresql
   ```

---

## 🚀 Quick Start

### Step 1: Install Dependencies

```bash
cd server
npm install
```

This installs:
- `@prisma/client` - Prisma Client for database queries
- `prisma` (dev) - Prisma CLI for migrations

### Step 2: Create Local PostgreSQL Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE sneaklink;

# Create user (optional, or use default 'postgres' user)
CREATE USER sneaklink_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE sneaklink TO sneaklink_user;

# Exit psql
\q
```

### Step 3: Configure Environment Variables

Add to `server/.env`:

```env
# PostgreSQL Connection (Local)
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/sneaklink?schema=public"

# For Supabase (when ready):
# DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT].supabase.co:5432/postgres?pgbouncer=true"
```

**Important:** Replace `your_password` with your actual PostgreSQL password.

### Step 4: Generate Prisma Client

```bash
npm run prisma:generate
```

This generates the Prisma Client based on `prisma/schema.prisma`.

### Step 5: Run Migrations

```bash
npm run prisma:migrate
```

This will:
1. Create all tables in your database
2. Apply indexes and constraints
3. Create a migration file in `prisma/migrations/`

**First migration name:** `init` (or you'll be prompted)

### Step 6: Verify Connection

```bash
npm run postgres:test
```

You should see:
```
✅ PostgreSQL Connected successfully!
✅ All tests passed!
```

---

## 📁 Project Structure

```
server/
├── prisma/
│   ├── schema.prisma          # Single source of truth for database schema
│   └── migrations/            # Migration files (auto-generated)
│       └── YYYYMMDDHHMMSS_init/
│           └── migration.sql
├── config/
│   └── postgres.js            # Database connection setup
└── scripts/
    └── test-postgres-connection.js
```

---

## 🔄 Migration Workflow

### Development (Local)

1. **Modify schema:** Edit `prisma/schema.prisma`
2. **Create migration:**
   ```bash
   npm run prisma:migrate
   ```
   - Prisma will detect changes
   - Prompts for migration name
   - Applies migration to local database
   - Updates Prisma Client

3. **Verify:** Check `prisma/migrations/` for new migration file

### Production (Supabase)

1. **Deploy migrations:**
   ```bash
   npm run prisma:migrate:deploy
   ```
   - Applies all pending migrations
   - Safe for production (no prompts)
   - Idempotent (can run multiple times)

---

## 🔀 Switching to Supabase

### Step 1: Get Supabase Connection String

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Settings** → **Database**
4. Copy **Connection string** (URI format)

### Step 2: Update DATABASE_URL

In `server/.env`:

```env
# Change from local:
# DATABASE_URL="postgresql://postgres:password@localhost:5432/sneaklink"

# To Supabase:
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT].supabase.co:5432/postgres?pgbouncer=true"
```

**Important:** 
- Replace `[YOUR-PASSWORD]` with your Supabase database password
- Replace `[YOUR-PROJECT]` with your Supabase project reference
- Use `pgbouncer=true` for connection pooling (recommended)

### Step 3: Deploy Migrations

```bash
npm run prisma:migrate:deploy
```

This applies all migrations to Supabase.

### Step 4: Verify

```bash
npm run postgres:test
```

**That's it!** No code changes needed. The app will now use Supabase.

---

## 🛠️ Common Commands

### Prisma Commands

```bash
# Generate Prisma Client (after schema changes)
npm run prisma:generate

# Create and apply migration
npm run prisma:migrate

# Deploy migrations (production)
npm run prisma:migrate:deploy

# Open Prisma Studio (database GUI)
npm run prisma:studio

# Format schema file
npm run prisma:format

# Validate schema
npm run prisma:validate
```

### Database Commands

```bash
# Test connection
npm run postgres:test

# Connect via psql
psql $DATABASE_URL

# Or with explicit connection
psql -U postgres -d sneaklink
```

---

## 📊 Schema Overview

### Core Tables

1. **users** - User accounts
   - UUID primary key
   - Email unique constraint
   - Subscription info (denormalized for quick access)
   - Usage tracking

2. **subscriptions** - Payment subscriptions
   - Paystack integration ready
   - Stripe-compatible structure
   - Billing cycle support (monthly/annually)

3. **stores** - Core application data
   - Shopify store listings
   - Optimized indexes for filtering

4. **sessions** - User sessions
   - JWT token storage
   - Device tracking

5. **support_tickets** - Customer support
   - Ticket management
   - Reply history (JSON)

6. **staff** - Admin/support staff
   - Role-based permissions
   - Invitation system

7. **user_devices** - Device tracking
   - Separate table to prevent User table bloat
   - TTL-ready (via lastActive index)

---

## 🔒 Security Best Practices

1. **Never commit `.env` file**
   - Already in `.gitignore`
   - Use `.env.example` for templates

2. **Use connection pooling in production**
   - Supabase: `pgbouncer=true` in connection string
   - Local: Consider PgBouncer for high traffic

3. **Limit database user permissions**
   - Don't use superuser in production
   - Create dedicated app user with minimal privileges

4. **Use SSL in production**
   - Supabase: SSL enabled by default
   - Local: Enable SSL for production-like setup

---

## 🐛 Troubleshooting

### Connection Refused

```bash
# Check if PostgreSQL is running
# Windows: Services → PostgreSQL
# Mac: brew services list
# Linux: sudo systemctl status postgresql

# Start PostgreSQL
# Mac: brew services start postgresql@15
# Linux: sudo systemctl start postgresql
```

### Authentication Failed

```bash
# Reset PostgreSQL password
psql -U postgres
ALTER USER postgres PASSWORD 'new_password';

# Update DATABASE_URL in .env
```

### Database Does Not Exist

```bash
# Create database
psql -U postgres
CREATE DATABASE sneaklink;
\q

# Or via command line
createdb -U postgres sneaklink
```

### Migration Errors

```bash
# Reset database (⚠️ DESTRUCTIVE - deletes all data)
npx prisma migrate reset

# Or manually drop and recreate
psql -U postgres -d sneaklink -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
npm run prisma:migrate
```

### Prisma Client Out of Sync

```bash
# Regenerate Prisma Client
npm run prisma:generate

# If still issues, delete node_modules/.prisma and regenerate
rm -rf node_modules/.prisma
npm run prisma:generate
```

---

## 📝 Migration Best Practices

1. **Always review migration SQL**
   - Check `prisma/migrations/YYYYMMDDHHMMSS_migration_name/migration.sql`
   - Ensure no data loss

2. **Test migrations locally first**
   - Never deploy untested migrations to production

3. **Use descriptive migration names**
   ```bash
   npm run prisma:migrate
   # Name: add_user_devices_table
   ```

4. **Backup before production migrations**
   - Supabase: Use built-in backup feature
   - Local: `pg_dump sneaklink > backup.sql`

5. **Never edit migration files manually**
   - Always modify `schema.prisma` and create new migration

---

## 🎯 Next Steps

1. ✅ **Local setup complete** - You can now use PostgreSQL locally
2. 🔄 **Integrate with app** - Update routes to use Prisma instead of Mongoose
3. 🚀 **Deploy to Supabase** - When ready, just change DATABASE_URL

---

## 📚 Additional Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [Supabase PostgreSQL Guide](https://supabase.com/docs/guides/database)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

---

## ✅ Checklist

- [ ] PostgreSQL installed and running
- [ ] Database `sneaklink` created
- [ ] DATABASE_URL configured in `.env`
- [ ] Dependencies installed (`npm install`)
- [ ] Prisma Client generated (`npm run prisma:generate`)
- [ ] Migrations applied (`npm run prisma:migrate`)
- [ ] Connection tested (`npm run postgres:test`)
- [ ] Ready to integrate with app!

---

**🎉 Setup Complete!** Your PostgreSQL database is ready for local development and future Supabase migration.
