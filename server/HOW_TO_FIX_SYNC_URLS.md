# How to get the right details for db:sync-neon

## 1. Check what you have now

From the **server** folder run:

```bash
npm run db:check-sync-urls
```

This will:

- Show how SOURCE and TARGET are parsed (user, host, port, database — **no passwords**).
- **Test both connections.** If one fails, you’ll see which one and the error (e.g. password authentication failed).

Fix the URL that fails (see below), then run `db:check-sync-urls` again until both show OK.

---

## 2. SOURCE = current database (where your data is)

- **What to set:** `SOURCE_DATABASE_URL` in **server/.env** (or the script falls back to `DATABASE_URL`).
- **Meaning:** The Postgres instance that **already has** your SneakLink data (e.g. local Postgres).

### If SOURCE is **local PostgreSQL**

1. **User:** Usually `postgres` (or the user you created).
2. **Password:** The one you set when you installed Postgres (or in pg_hba).
3. **Host/port:** `localhost:5432` (or your host and port).
4. **Database:** e.g. `sneaklink`.

**Example:**

```env
SOURCE_DATABASE_URL=postgresql://postgres:YOUR_LOCAL_PASSWORD@localhost:5432/sneaklink?schema=public
```

- If the password has **special characters**, URL-encode them in the URL, e.g. `@` → `%40`, `#` → `%23`.
- **Check the password:** If you don’t remember it, you may need to reset the Postgres user password (search “reset postgres password” for your OS).

**Test only SOURCE (using current DATABASE_URL):**

```bash
# Temporarily point DATABASE_URL at your source
# (or set SOURCE_DATABASE_URL and run)
npm run postgres:test
```

If that fails, the same URL in `SOURCE_DATABASE_URL` will fail in the sync script — fix user/password/host/port/database until `postgres:test` works.

---

## 3. TARGET = Neon (destination)

- **What to set:** `TARGET_DATABASE_URL` in **server/.env**.
- **Meaning:** The Neon database where you want to **copy** the data.

### Where to get the correct Neon URL

1. Open [Neon Console](https://console.neon.tech).
2. Select your project (e.g. **sneaklink**).
3. Go to **Dashboard** or **Connection details**.
4. Copy the **Connection string** and choose **Pooled connection** (recommended).
5. It will look like:
   `postgresql://neondb_owner:PASSWORD@ep-xxx-pooler.region.aws.neon.tech/sneaklink?sslmode=require`
6. Paste that into **server/.env** as:

```env
TARGET_DATABASE_URL=postgresql://neondb_owner:YOUR_NEON_PASSWORD@ep-xxx-pooler.region.aws.neon.tech/sneaklink?sslmode=require
```

- **User:** Neon uses something like `neondb_owner`, **not** `postgres`. If your URL still says `postgres`, replace it with the user shown in the Neon dashboard.
- **Password:** Use the one from the Neon dashboard (you can reset it in Neon if needed).

---

## 4. Summary

| Step | Action |
|------|--------|
| 1 | Run `npm run db:check-sync-urls` in **server**. |
| 2 | If SOURCE fails | Fix **SOURCE_DATABASE_URL** (or **DATABASE_URL**): correct user/password for the DB that has your data; test with `npm run postgres:test` if SOURCE is the same as DATABASE_URL. |
| 3 | If TARGET fails | Set **TARGET_DATABASE_URL** from Neon dashboard (Pooled connection string, correct user e.g. neondb_owner). |
| 4 | When both OK | Run `npm run db:sync-neon`. |

No need to guess: **db:check-sync-urls** tells you which connection fails and what user/host/database are used (passwords stay hidden).
