# 🔄 PostgreSQL Route Migration Guide

## Current Status

✅ **PostgreSQL Connected** - Database is ready  
✅ **Prisma Client Generated** - Can use Prisma in code  
⏳ **Routes Migration** - In progress

---

## Migration Strategy

We're migrating routes from MongoDB/Mongoose to PostgreSQL/Prisma gradually:

1. **Phase 1: Parallel Run** (Current)
   - Both databases connected
   - Routes can use either database
   - Test Prisma routes alongside MongoDB

2. **Phase 2: Route-by-Route Migration**
   - Migrate one route at a time
   - Test thoroughly before moving to next
   - Keep MongoDB as fallback

3. **Phase 3: Full Migration**
   - All routes use Prisma
   - Remove MongoDB dependencies
   - Clean up old code

---

## Migration Checklist

### ✅ Completed
- [x] PostgreSQL database created
- [x] Prisma schema defined
- [x] Migrations run
- [x] Server connects to PostgreSQL
- [x] Prisma helper utilities created

### ⏳ In Progress
- [ ] Migrate `routes/stores.js` to Prisma
- [ ] Migrate `routes/auth.js` to Prisma
- [ ] Migrate `routes/subscriptions.js` to Prisma
- [ ] Migrate `routes/admin.js` to Prisma
- [ ] Migrate `routes/contact.js` to Prisma

### 🔄 Future
- [ ] Update middleware to use Prisma
- [ ] Update services to use Prisma
- [ ] Migrate data from MongoDB (if needed)
- [ ] Remove MongoDB code

---

## How to Use Prisma in Routes

### Basic Example

**Before (Mongoose):**
```javascript
import Store from '../models/Store.js';

const stores = await Store.find({ isActive: true })
  .limit(10)
  .lean();
```

**After (Prisma):**
```javascript
import { getPrisma } from '../config/postgres.js';

const prisma = getPrisma();
const stores = await prisma.store.findMany({
  where: { isActive: true },
  take: 10,
});
```

### Using Helper Functions

We've created helper functions in `utils/prismaHelpers.js`:

```javascript
import { findStores, upsertStore } from '../utils/prismaHelpers.js';

// Find stores with filters
const result = await findStores(
  { isActive: true, isShopify: true },
  { page: 1, limit: 50 }
);

// Upsert store
const store = await upsertStore({
  name: 'My Store',
  url: 'https://example.com',
  country: 'US',
});
```

---

## Key Differences: Mongoose vs Prisma

| Mongoose | Prisma |
|----------|--------|
| `Model.find()` | `prisma.model.findMany()` |
| `Model.findOne()` | `prisma.model.findUnique()` |
| `Model.findById()` | `prisma.model.findUnique({ where: { id } })` |
| `Model.create()` | `prisma.model.create()` |
| `Model.updateOne()` | `prisma.model.update()` |
| `Model.deleteOne()` | `prisma.model.delete()` |
| `Model.countDocuments()` | `prisma.model.count()` |
| `.lean()` | Not needed (always returns plain objects) |
| `.sort()` | `orderBy` |
| `.skip()` / `.limit()` | `skip` / `take` |
| `$in` | `{ in: [...] }` |
| `$gte` / `$lte` | `{ gte: ..., lte: ... }` |

---

## Testing Migrated Routes

1. **Test with Prisma:**
   ```cmd
   npm run postgres:test
   ```

2. **Test API endpoints:**
   ```cmd
   # Start server
   npm run dev
   
   # Test in another terminal
   curl http://localhost:3000/api/stores
   ```

3. **Check Prisma Studio:**
   ```cmd
   npm run prisma:studio
   ```
   Opens GUI to view/edit data

---

## Common Issues

### Issue: "Prisma Client not initialized"
**Fix:** Make sure `connectPostgres()` is called in `server.js`

### Issue: "Table does not exist"
**Fix:** Run migrations: `npm run prisma:migrate`

### Issue: "Invalid filter format"
**Fix:** Use `convertMongoFilterToPrisma()` helper or check Prisma filter syntax

---

## Next Steps

1. **Migrate stores route** - Main route for store data
2. **Migrate auth route** - User authentication
3. **Migrate subscriptions route** - Payment/subscription logic
4. **Test thoroughly** - Ensure all endpoints work
5. **Remove MongoDB** - Once all routes migrated

---

**See `utils/prismaHelpers.js` for helper functions!**
