# 📝 PostgreSQL Setup - Manual Steps Checklist

## ✅ What I've Set Up For You

- ✅ Prisma schema (`prisma/schema.prisma`)
- ✅ Database connection (`config/postgres.js`)
- ✅ Migration system
- ✅ Database creation scripts
- ✅ Usage examples

## 🔧 What You Need to Do Manually

### Step 1: Install PostgreSQL (If Not Installed)

**Download:** https://www.postgresql.org/download/windows/

**During Installation:**
- ✅ Check "Add PostgreSQL to PATH"
- ✅ Remember the password you set for `postgres` user
- ✅ Note the port (default: 5432)

**Verify:**
```cmd
psql --version
```

---

### Step 2: Create Database

**Run this command:**
```cmd
cd server
npm run db:create:cmd
```

**Or manually:**
```cmd
psql -U postgres -c "CREATE DATABASE sneaklink;"
```

**Enter password when prompted** (the one you set during installation)

---

### Step 3: Install Dependencies

```cmd
cd server
npm install
```

This installs Prisma packages.

---

### Step 4: Add DATABASE_URL to .env

Open `server/.env` and add:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/sneaklink?schema=public"
```

**Replace `YOUR_PASSWORD`** with your PostgreSQL password.

**Keep MongoDB URI for now** (you can remove it later after migration).

---

### Step 5: Generate Prisma Client

```cmd
npm run prisma:generate
```

This creates the Prisma Client from your schema.

---

### Step 6: Run Migrations

```cmd
npm run prisma:migrate
```

**When prompted:**
- Migration name: `init`
- This creates all tables

---

### Step 7: Test Connection

```cmd
npm run postgres:test
```

**Expected output:**
```
✅ PostgreSQL Connected successfully!
✅ All tests passed!
```

---

## ✅ Verification Checklist

After completing all steps, verify:

- [ ] `psql --version` works
- [ ] Database `sneaklink` exists
- [ ] `DATABASE_URL` in `.env` is correct
- [ ] `npm run prisma:generate` succeeds
- [ ] `npm run prisma:migrate` succeeds
- [ ] `npm run postgres:test` shows success

---

## 🎯 Next Steps (After Setup)

Once PostgreSQL is connected:

1. **Update `server.js`** to connect to PostgreSQL
2. **Update routes** to use Prisma instead of Mongoose
3. **Test endpoints** to ensure they work
4. **Migrate data** from MongoDB (if needed)

**I can help with these steps once PostgreSQL is connected!**

---

## 🆘 If You Get Stuck

### "psql not found"
- PostgreSQL not in PATH
- Solution: Use full path or add to PATH (see `QUICK_DB_CREATE.md`)

### "Authentication failed"
- Wrong password
- Solution: Reset password or check `.env` `DATABASE_URL`

### "Database does not exist"
- Database not created
- Solution: Run `npm run db:create:cmd`

### "Migration failed"
- Check `DATABASE_URL` format
- Ensure database exists
- Check PostgreSQL is running

---

**Complete Steps 1-7 above, then let me know when PostgreSQL is connected!** 🚀

