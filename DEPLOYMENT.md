# SneakLink – Deploy to GitHub, Vercel, Railway & Neon

## 1. Push to GitHub

```bash
# Initialize git if needed
git init

# Add remote (use your repo)
git remote add origin https://github.com/kelarsco/sneaklink.git

# Ensure .env is never committed (see .gitignore)
# Add and commit
git add .
git commit -m "Prepare for deployment: Vercel + Railway + Neon"

# Push (replace main with your default branch if different)
git branch -M main
git push -u origin main
```

**Important:** Do **not** commit `server/.env` or any file containing real secrets. The repo `.gitignore` already excludes `.env` and `server/.env`.

---

## 2. Database: Neon PostgreSQL

1. Create a project at [neon.tech](https://neon.tech) and get your connection string.
2. Use the **pooled** connection string (e.g. `-pooler` in the host) for serverless/Railway.

**Set in Railway (backend):**

- Variable: `DATABASE_URL`
- Value: your full Neon connection string (from Neon dashboard → Connection string → **Pooled**).
- Example format:  
  `postgresql://USER:PASSWORD@ep-xxx-pooler.region.aws.neon.tech/sneaklink?sslmode=require`  
  (Neon often adds `&channel_binding=require`; that’s fine.)
- **Do not commit this value**; set it only in Railway (and locally in `server/.env` if you use Neon for dev).

**Sync existing database and data to Neon (one-time):**

If your data is in another Postgres (e.g. local), sync schema + data to Neon:

```bash
cd server
npm install
# In .env set:
#   SOURCE_DATABASE_URL=postgresql://... (current DB with data)
#   TARGET_DATABASE_URL=postgresql://...@ep-xxx.neon.tech/sneaklink?sslmode=require
npm run db:sync-neon
```

This applies migrations to Neon and copies all rows from source to Neon.

**Apply schema only (no data copy):**

```bash
cd server
# Set DATABASE_URL to your Neon URL in .env
npx prisma migrate deploy
npx prisma generate
```

---

## 3. Frontend: Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New** → **Project**.
2. Import **kelarsco/sneaklink** from GitHub.
3. **Root Directory:** leave as `.` (repo root).
4. **Framework Preset:** Vite (auto-detected).
5. **Build Command:** `npm run build`
6. **Output Directory:** `dist`
7. **Environment variables** (Vercel → Project → Settings → Environment Variables):

| Name              | Value                    | Notes                    |
|-------------------|--------------------------|--------------------------|
| `VITE_API_URL`    | `https://YOUR-RAILWAY-URL/api` | Your Railway backend URL + `/api` |
| `VITE_GOOGLE_CLIENT_ID` | Your Google OAuth client ID | Same as in backend        |
| (any other `VITE_*`) | As in your app           | Only `VITE_*` are exposed to the client |

8. Deploy. The app will be at `https://your-project.vercel.app`.

**Google OAuth:** In Google Cloud Console, add your Vercel URL to **Authorized JavaScript origins** and add `https://your-domain.vercel.app/auth/google/callback` (or your actual callback path) to **Authorized redirect URIs**.

---

## 4. Backend: Railway

1. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**.
2. Select **kelarsco/sneaklink**.
3. **Root Directory:** set to **`server`** (so Railway uses `server/package.json` and `server/server.js`).
4. **Build:** Railway will run `npm install` in `server/`.
5. **Start:** Railway will run `npm start` → `node server.js` (see `server/railway.toml`).
6. **Environment variables** (Railway → your service → Variables):

Set at least:

| Name             | Value |
|------------------|--------|
| `DATABASE_URL`   | Your **Neon** connection string (pooled, with `?sslmode=require`) |
| `PORT`           | Leave empty; Railway sets it automatically |
| `FRONTEND_URL`   | Your Vercel URL, e.g. `https://your-app.vercel.app` |
| `NODE_ENV`       | `production` |
| `JWT_SECRET`     | Strong random string (e.g. `openssl rand -hex 64`) |
| `GOOGLE_CLIENT_ID` | Same as frontend |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud Console |
| `GOOGLE_REDIRECT_URI` | `https://your-vercel-url.vercel.app/auth/google/callback` |
| (Paystack, etc.) | Same as in `server/env.template` |

7. Deploy. Railway will assign a URL like `https://xxx.up.railway.app`.
8. **After first deploy:** Copy that URL and set **Vercel** env var `VITE_API_URL` to `https://xxx.up.railway.app/api`.

**CORS:** The server uses `FRONTEND_URL` for allowed origins; keeping `FRONTEND_URL` in sync with your Vercel URL avoids CORS issues.

---

## 5. Post-deploy checklist

- [ ] **Neon:** `DATABASE_URL` in Railway is the Neon pooled URL; migrations applied if needed.
- [ ] **Vercel:** `VITE_API_URL` points to Railway backend + `/api`.
- [ ] **Railway:** `FRONTEND_URL` is your Vercel URL; Google OAuth redirect URI matches.
- [ ] **Google OAuth:** Authorized origins and redirect URIs include production URLs (no trailing slash).
- [ ] **Paystack / other APIs:** Live keys and webhooks use production URLs where required.

---

## 6. Local development with Neon

In `server/.env`:

```env
DATABASE_URL=postgresql://neondb_owner:YOUR_PASSWORD@ep-delicate-hill-aie4r7pm-pooler.us-east-1.aws.neon.tech/sneaklink?sslmode=require
```

Then:

```bash
cd server
npx prisma generate
npx prisma db push   # or migrate deploy
npm run dev
```

Never commit the real Neon password; use `.env` only locally and in Railway Variables.
