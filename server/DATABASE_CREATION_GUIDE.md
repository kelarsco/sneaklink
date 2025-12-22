# 🗄️ Automatic Database Creation Guide

## Quick Commands

### Windows (CMD/PowerShell)

**Option 1: Using NPM Script (Recommended)**
```bash
npm run db:create
```

**Option 2: Using Batch File**
```bash
npm run db:create:cmd
```

**Option 3: Direct PowerShell**
```powershell
powershell -ExecutionPolicy Bypass -File scripts/create-database.ps1
```

**Option 4: Direct Batch File**
```cmd
scripts\create-database.bat
```

### Mac/Linux

```bash
bash scripts/create-database.sh
```

---

## 📋 What the Scripts Do

1. ✅ **Check PostgreSQL Installation** - Verifies `psql` is in PATH
2. ✅ **Test Connection** - Connects to PostgreSQL server
3. ✅ **Check Database Exists** - Skips creation if database already exists
4. ✅ **Create Database** - Creates `sneaklink` database
5. ✅ **Provide Next Steps** - Shows what to do next

---

## 🔧 Prerequisites

### 1. PostgreSQL Installed

**Windows:**
- Download from [postgresql.org/download/windows](https://www.postgresql.org/download/windows/)
- During installation, add PostgreSQL to PATH

**Mac:**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Linux:**
```bash
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### 2. PostgreSQL Running

**Windows:**
- Check Services → PostgreSQL
- Or: `pg_ctl status`

**Mac:**
```bash
brew services list
```

**Linux:**
```bash
sudo systemctl status postgresql
```

### 3. PostgreSQL in PATH

**Windows:**
- Default: `C:\Program Files\PostgreSQL\15\bin\`
- Add to PATH in System Environment Variables

**Verify:**
```bash
psql --version
```

---

## 🚀 Usage Examples

### Example 1: First Time Setup

```bash
# 1. Create database
npm run db:create

# 2. Enter PostgreSQL password when prompted
# Password: your_postgres_password

# 3. Database created! Follow the next steps shown
```

### Example 2: Database Already Exists

```bash
npm run db:create
# Output: ⚠️  Database 'sneaklink' already exists!
#         Skipping creation...
```

### Example 3: PostgreSQL Not in PATH

**Windows:**
```powershell
# Use full path
& "C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -c "CREATE DATABASE sneaklink;"
```

**Or add to PATH:**
1. Open System Properties → Environment Variables
2. Edit PATH variable
3. Add: `C:\Program Files\PostgreSQL\15\bin`
4. Restart terminal

---

## 🔍 Troubleshooting

### Error: "psql not found"

**Solution:**
1. Install PostgreSQL
2. Add PostgreSQL bin directory to PATH
3. Restart terminal

**Windows PATH:**
```
C:\Program Files\PostgreSQL\15\bin
```

### Error: "Connection refused"

**Solution:**
1. Start PostgreSQL service
2. Check if running on default port (5432)
3. Verify firewall allows connections

**Windows:**
```powershell
# Start service
net start postgresql-x64-15
```

**Mac:**
```bash
brew services start postgresql@15
```

**Linux:**
```bash
sudo systemctl start postgresql
```

### Error: "Authentication failed"

**Solution:**
1. Verify username (default: `postgres`)
2. Check password is correct
3. Reset password if needed:

```bash
psql -U postgres
ALTER USER postgres PASSWORD 'new_password';
```

### Error: "Database already exists"

**Solution:**
- This is fine! The script will skip creation
- Or drop and recreate:

```bash
psql -U postgres -c "DROP DATABASE IF EXISTS sneaklink;"
npm run db:create
```

---

## 📝 Manual Creation (Alternative)

If scripts don't work, create manually:

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE sneaklink;

# Exit
\q
```

---

## ✅ After Database Creation

1. **Add DATABASE_URL to `.env`:**
   ```env
   DATABASE_URL="postgresql://postgres:your_password@localhost:5432/sneaklink?schema=public"
   ```

2. **Generate Prisma Client:**
   ```bash
   npm run prisma:generate
   ```

3. **Run Migrations:**
   ```bash
   npm run prisma:migrate
   # Name: init
   ```

4. **Test Connection:**
   ```bash
   npm run postgres:test
   ```

---

## 🎯 Quick Reference

| Command | Description |
|---------|-------------|
| `npm run db:create` | Create database (PowerShell) |
| `npm run db:create:cmd` | Create database (Batch) |
| `npm run prisma:generate` | Generate Prisma Client |
| `npm run prisma:migrate` | Create and apply migration |
| `npm run postgres:test` | Test database connection |

---

## 💡 Tips

1. **Save Password:** Set `PGPASSWORD` environment variable to avoid prompts:
   ```bash
   # Windows CMD
   set PGPASSWORD=your_password
   
   # PowerShell
   $env:PGPASSWORD = "your_password"
   
   # Mac/Linux
   export PGPASSWORD=your_password
   ```

2. **Custom Database Name:** Edit scripts to change `DB_NAME` variable

3. **Custom User:** Edit scripts to change `DB_USER` variable (default: `postgres`)

---

**🎉 That's it!** Your database will be created automatically with one command.
