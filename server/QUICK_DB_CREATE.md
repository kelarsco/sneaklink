# ⚡ Quick Database Creation (When psql Not in PATH)

## 🚀 One-Liner Commands

### Option 1: Using Full Path (PostgreSQL 15)
```cmd
"C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -c "CREATE DATABASE sneaklink;"
```

### Option 2: Using Full Path (PostgreSQL 16)
```cmd
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -c "CREATE DATABASE sneaklink;"
```

### Option 3: Using Full Path (PostgreSQL 14)
```cmd
"C:\Program Files\PostgreSQL\14\bin\psql.exe" -U postgres -c "CREATE DATABASE sneaklink;"
```

### Option 4: With Password in Command
```cmd
set PGPASSWORD=your_password && "C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -c "CREATE DATABASE sneaklink;"
```

---

## 📋 Step-by-Step (If You Don't Know Your PostgreSQL Version)

### Step 1: Find PostgreSQL Installation

**Check common locations:**
```cmd
dir "C:\Program Files\PostgreSQL" /b
```

**Or search for psql.exe:**
```cmd
dir /s /b C:\ | findstr psql.exe
```

### Step 2: Use Full Path

Once you find it (e.g., `C:\Program Files\PostgreSQL\15\bin\psql.exe`):

```cmd
"C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -c "CREATE DATABASE sneaklink;"
```

**You'll be prompted for password.**

---

## 🔧 Add PostgreSQL to PATH (Permanent Fix)

### Method 1: Via System Properties

1. **Open System Properties:**
   - Press `Win + R`
   - Type: `sysdm.cpl`
   - Press Enter

2. **Go to Environment Variables:**
   - Click "Environment Variables" button
   - Under "System variables", find "Path"
   - Click "Edit"

3. **Add PostgreSQL:**
   - Click "New"
   - Add: `C:\Program Files\PostgreSQL\15\bin`
   - (Replace `15` with your version)
   - Click "OK" on all dialogs

4. **Restart Terminal:**
   - Close and reopen CMD/PowerShell
   - Test: `psql --version`

### Method 2: Via Command Line (Temporary)

```cmd
set PATH=%PATH%;C:\Program Files\PostgreSQL\15\bin
```

**Note:** This only works for current session. Use Method 1 for permanent.

---

## 🎯 Quick Scripts

### Simple Script (Auto-Finds PostgreSQL)

```cmd
scripts\create-database-simple.bat
```

This script automatically finds PostgreSQL in common locations.

### Updated Batch Script

```cmd
npm run db:create:cmd
```

Now automatically finds PostgreSQL if not in PATH.

---

## ✅ Verify Installation

After adding to PATH, verify:

```cmd
psql --version
```

Should show: `psql (PostgreSQL) 15.x` or similar.

---

## 🔍 Find Your PostgreSQL Version

**Check installed versions:**
```cmd
dir "C:\Program Files\PostgreSQL" /b
```

**Common paths:**
- `C:\Program Files\PostgreSQL\16\bin\psql.exe`
- `C:\Program Files\PostgreSQL\15\bin\psql.exe`
- `C:\Program Files\PostgreSQL\14\bin\psql.exe`
- `C:\Program Files (x86)\PostgreSQL\15\bin\psql.exe`

---

## 💡 Quick Fix Commands

**If you know it's PostgreSQL 15:**
```cmd
cd server
"C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -c "CREATE DATABASE sneaklink;"
```

**If you know it's PostgreSQL 16:**
```cmd
cd server
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -c "CREATE DATABASE sneaklink;"
```

**With password:**
```cmd
set PGPASSWORD=your_password
"C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -c "CREATE DATABASE sneaklink;"
```

---

## 🎉 After Database Creation

1. **Add to `.env`:**
   ```env
   DATABASE_URL="postgresql://postgres:your_password@localhost:5432/sneaklink?schema=public"
   ```

2. **Generate Prisma Client:**
   ```cmd
   npm run prisma:generate
   ```

3. **Run Migrations:**
   ```cmd
   npm run prisma:migrate
   ```

4. **Test:**
   ```cmd
   npm run postgres:test
   ```

---

**💡 Tip:** Add PostgreSQL to PATH once, and you'll never need the full path again!
