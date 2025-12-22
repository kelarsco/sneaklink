# 🔧 Fix "Invalid DATABASE_URL format" Error

## Quick Fix

The error means your `DATABASE_URL` in `.env` is either:
1. **Missing** - Not set at all
2. **Wrong format** - Doesn't start with `postgresql://` or `postgres://`
3. **Has quotes** - Has extra quotes that shouldn't be there
4. **Password needs encoding** - Special characters in password need URL encoding

---

## Step 1: Check Your DATABASE_URL

Run this diagnostic:
```cmd
cd server
npm run db:check
```

This will show you exactly what's wrong with your `DATABASE_URL`.

---

## Step 2: Fix Your .env File

Open `server/.env` and check your `DATABASE_URL` line.

### ✅ Correct Format

```env
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/sneaklink?schema=public
```

**OR with quotes (if needed):**

```env
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/sneaklink?schema=public"
```

### ❌ Common Mistakes

**Wrong 1: Missing DATABASE_URL**
```env
# Missing line - add it!
```

**Wrong 2: Wrong protocol**
```env
DATABASE_URL=mysql://postgres:password@localhost:5432/sneaklink
# ❌ Should be postgresql:// not mysql://
```

**Wrong 3: Extra quotes in the URL itself**
```env
DATABASE_URL="postgresql://postgres:"password"@localhost:5432/sneaklink"
# ❌ Don't put quotes around password inside the URL
```

**Wrong 4: Missing parts**
```env
DATABASE_URL=postgresql://localhost:5432/sneaklink
# ❌ Missing username and password
```

---

## Step 3: URL Encode Special Characters in Password

If your PostgreSQL password has special characters, you need to URL-encode them:

| Character | URL Encoded |
|-----------|-------------|
| `@` | `%40` |
| `#` | `%23` |
| `$` | `%24` |
| `%` | `%25` |
| `&` | `%26` |
| `+` | `%2B` |
| `/` | `%2F` |
| `=` | `%3D` |
| `?` | `%3F` |
| ` ` (space) | `%20` |

### Example

**If your password is:** `my@pass#123`

**Your DATABASE_URL should be:**
```env
DATABASE_URL=postgresql://postgres:my%40pass%23123@localhost:5432/sneaklink?schema=public
```

---

## Step 4: Complete Example

Here's a complete example `.env` file:

```env
# PostgreSQL Connection
DATABASE_URL=postgresql://postgres:your_password_here@localhost:5432/sneaklink?schema=public

# MongoDB (keep for now, can remove later)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/sneaklink?retryWrites=true&w=majority

# Other variables...
PORT=3000
FRONTEND_URL=http://localhost:8080
```

---

## Step 5: Test Again

After fixing your `.env` file:

```cmd
# 1. Check format
npm run db:check

# 2. Test connection
npm run postgres:test
```

---

## Quick Reference

### Format Template
```
postgresql://[username]:[password]@[host]:[port]/[database]?schema=public
```

### Your Values
- **username:** `postgres` (default)
- **password:** Your PostgreSQL password (URL-encode if needed)
- **host:** `localhost` (local) or your server IP
- **port:** `5432` (default PostgreSQL port)
- **database:** `sneaklink`

### Complete Example
```env
DATABASE_URL=postgresql://postgres:MySecurePass123@localhost:5432/sneaklink?schema=public
```

---

## Still Not Working?

1. **Run diagnostic:**
   ```cmd
   npm run db:check
   ```

2. **Check if PostgreSQL is running:**
   ```cmd
   psql --version
   ```

3. **Verify database exists:**
   ```cmd
   npm run db:create:cmd
   ```

4. **Check .env file location:**
   - Make sure `.env` is in `server/` directory
   - Not in root directory

5. **Restart terminal:**
   - Close and reopen your terminal after editing `.env`

---

## Common Issues

### Issue: "DATABASE_URL is not set"
**Fix:** Add `DATABASE_URL=...` to your `server/.env` file

### Issue: "Invalid format"
**Fix:** Make sure it starts with `postgresql://` or `postgres://`

### Issue: "Authentication failed"
**Fix:** Check your password is correct and URL-encoded if needed

### Issue: "Database does not exist"
**Fix:** Run `npm run db:create:cmd` to create the database

---

**Run `npm run db:check` first to see exactly what's wrong!** 🔍

