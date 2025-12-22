# 🔇 Disable Prisma Query Logs

## Problem

Prisma query logs flood the terminal with every SQL query, making it hard to see important information like store scraping progress.

## Solution

✅ **Query logging is now disabled by default** in development mode.

Only errors and warnings will be logged, not every query.

## Re-enable Query Logs (if needed for debugging)

If you need to debug database queries, you can temporarily enable them:

1. Add to `server/.env`:
   ```env
   PRISMA_LOG_QUERIES=true
   ```

2. Restart the server

3. Remove the line when done debugging

## What Changed

- **Before:** Every Prisma query was logged to terminal
- **After:** Only errors and warnings are logged
- **Result:** Much cleaner terminal output, easier to see scraping progress

---

**Terminal output should now be much cleaner!** ✅
