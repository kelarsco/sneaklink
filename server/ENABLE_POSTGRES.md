# 🚀 Enable PostgreSQL in Routes

## Quick Start

To enable PostgreSQL in your routes, add this to your `server/.env` file:

```env
USE_POSTGRES=true
```

## What This Does

When `USE_POSTGRES=true`:
- ✅ Routes will try to use PostgreSQL/Prisma first
- ✅ Falls back to MongoDB if Prisma fails
- ✅ Allows gradual migration without breaking existing functionality

## Current Status

### ✅ Routes Using Prisma (when enabled)
- `GET /api/stores` - Main stores listing route

### ⏳ Still Using MongoDB
- `GET /api/stores/:id` - Single store
- `POST /api/stores` - Add store
- `PUT /api/stores/:id` - Update store
- `DELETE /api/stores/:id` - Delete store
- All auth routes
- All subscription routes
- All admin routes

## Testing

1. **Enable PostgreSQL:**
   ```env
   USE_POSTGRES=true
   ```

2. **Start server:**
   ```cmd
   npm run dev
   ```

3. **Test endpoint:**
   ```cmd
   curl http://localhost:3000/api/stores
   ```

4. **Check logs:**
   - Should see Prisma queries in console
   - No MongoDB queries if Prisma works

## Disable PostgreSQL (Use MongoDB Only)

Remove or set to false:
```env
USE_POSTGRES=false
```

Or just remove the line entirely.

---

**Note:** This is a gradual migration. Both databases can run in parallel safely!
