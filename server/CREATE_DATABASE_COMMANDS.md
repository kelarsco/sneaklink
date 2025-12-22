# 🗄️ PostgreSQL Database Creation Commands

## Quick Commands (Copy & Paste)

### Windows (PowerShell)
```powershell
# Simple one-liner (will prompt for password)
psql -U postgres -c "CREATE DATABASE sneaklink;"

# Or with password in command (less secure)
$env:PGPASSWORD="your_password"; psql -U postgres -c "CREATE DATABASE sneaklink;"
```

### Windows (Command Prompt)
```cmd
# Simple one-liner (will prompt for password)
psql -U postgres -c "CREATE DATABASE sneaklink;"

# Or with password (less secure)
set PGPASSWORD=your_password && psql -U postgres -c "CREATE DATABASE sneaklink;"
```

### Linux/Mac (Bash)
```bash
# Simple one-liner (will prompt for password)
psql -U postgres -c "CREATE DATABASE sneaklink;"

# Or with password (less secure)
PGPASSWORD=your_password psql -U postgres -c "CREATE DATABASE sneaklink;"
```

---

## 📝 Automated Scripts

### Option 1: PowerShell Script (Windows - Recommended)
```powershell
# Run from server directory
.\scripts\create-database.ps1
```

### Option 2: Batch File (Windows)
```cmd
# Run from server directory
scripts\create-database.bat
```

### Option 3: Bash Script (Linux/Mac)
```bash
# Make executable first
chmod +x scripts/create-database.sh

# Run from server directory
./scripts/create-database.sh
```

---

## 🔧 Manual Commands

### Step 1: Connect to PostgreSQL
```bash
psql -U postgres
```

### Step 2: Create Database
```sql
CREATE DATABASE sneaklink;
```

### Step 3: Verify
```sql
\l
-- Should see 'sneaklink' in the list
```

### Step 4: Exit
```sql
\q
```

---

## 🚀 One-Line Commands (No Password Prompt)

### Windows PowerShell
```powershell
# Set password as environment variable
$env:PGPASSWORD="your_password"

# Create database
psql -U postgres -c "CREATE DATABASE sneaklink;"

# Verify
psql -U postgres -l | Select-String "sneaklink"
```

### Windows CMD
```cmd
set PGPASSWORD=your_password && psql -U postgres -c "CREATE DATABASE sneaklink;"
```

### Linux/Mac
```bash
PGPASSWORD=your_password psql -U postgres -c "CREATE DATABASE sneaklink;"
```

---

## 🔄 Drop and Recreate (If Database Exists)

### Windows PowerShell
```powershell
$env:PGPASSWORD="your_password"
psql -U postgres -c "DROP DATABASE IF EXISTS sneaklink;"
psql -U postgres -c "CREATE DATABASE sneaklink;"
```

### Windows CMD
```cmd
set PGPASSWORD=your_password && psql -U postgres -c "DROP DATABASE IF EXISTS sneaklink;" && psql -U postgres -c "CREATE DATABASE sneaklink;"
```

### Linux/Mac
```bash
PGPASSWORD=your_password psql -U postgres -c "DROP DATABASE IF EXISTS sneaklink;"
PGPASSWORD=your_password psql -U postgres -c "CREATE DATABASE sneaklink;"
```

---

## ✅ Verify Database Created

```bash
# List all databases
psql -U postgres -l

# Or connect to the database
psql -U postgres -d sneaklink -c "SELECT current_database();"
```

---

## 🎯 Complete Setup Command (Windows PowerShell)

```powershell
# Complete setup in one go
$env:PGPASSWORD="your_password"
psql -U postgres -c "CREATE DATABASE sneaklink;" 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Database created!" -ForegroundColor Green
    Write-Host "Next: Update DATABASE_URL in .env, then run: npm run prisma:migrate" -ForegroundColor Cyan
} else {
    Write-Host "❌ Failed to create database" -ForegroundColor Red
}
```

---

## 📋 Quick Reference

| Action | Command |
|--------|---------|
| **Create database** | `psql -U postgres -c "CREATE DATABASE sneaklink;"` |
| **Drop database** | `psql -U postgres -c "DROP DATABASE sneaklink;"` |
| **List databases** | `psql -U postgres -l` |
| **Connect to database** | `psql -U postgres -d sneaklink` |
| **Check if exists** | `psql -U postgres -lqt \| grep sneaklink` |

---

## ⚠️ Troubleshooting

### "psql: command not found"
- **Windows:** Add PostgreSQL bin directory to PATH
  - Default: `C:\Program Files\PostgreSQL\15\bin`
  - Or use full path: `"C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -c "CREATE DATABASE sneaklink;"`
  
- **Mac:** `brew install postgresql@15`
- **Linux:** `sudo apt-get install postgresql-client`

### "password authentication failed"
- Check PostgreSQL password
- Try: `psql -U postgres` (will prompt for password)

### "database already exists"
- Use: `DROP DATABASE IF EXISTS sneaklink;` first
- Or use the scripts which handle this automatically

---

## 🎉 After Database Creation

1. **Update `.env` file:**
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
   ```

4. **Test Connection:**
   ```bash
   npm run postgres:test
   ```

---

**💡 Tip:** Use the automated scripts (`create-database.ps1` or `create-database.bat`) for the easiest setup!
