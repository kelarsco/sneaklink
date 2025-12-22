# 🚀 PostgreSQL Quick Start Guide

## ⚡ 5-Minute Setup

### 1. Install Dependencies
```bash
cd server
npm install
```

### 2. Create Database
```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE sneaklink;
\q
```

### 3. Configure Environment
Add to `server/.env`:
```env
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/sneaklink?schema=public"
```

### 4. Generate Prisma Client
```bash
npm run prisma:generate
```

### 5. Run Migrations
```bash
npm run prisma:migrate
# Migration name: init
```

### 6. Test Connection
```bash
npm run postgres:test
```

**✅ Done!** Your PostgreSQL database is ready.

---

## 🔄 Switching to Supabase

1. Get connection string from Supabase Dashboard
2. Update `DATABASE_URL` in `.env`
3. Run: `npm run prisma:migrate:deploy`

**That's it!** No code changes needed.

---

## 📚 Common Commands

```bash
# Generate Prisma Client
npm run prisma:generate

# Create migration
npm run prisma:migrate

# Deploy migrations (production)
npm run prisma:migrate:deploy

# Open database GUI
npm run prisma:studio

# Test connection
npm run postgres:test
```

---

## 📖 Full Documentation

See `POSTGRES_SETUP.md` for complete guide.
