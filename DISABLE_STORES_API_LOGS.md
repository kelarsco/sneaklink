# 🔇 Disable Stores API Debug Logs

## What Changed

All debug logs from the Stores API have been made conditional. They will only show if you set `DEBUG_STORES_API=true` in your `.env` file.

## Logs That Are Now Conditional

- `[Stores API] Received query params`
- `[Stores API] Country filter`
- `[Stores API] Tags filter`
- `[Stores API] Theme filter`
- `[Stores API] Filter being applied`
- `[Stores API] Query result`
- `[Stores API] Returning cached results`
- `[PrismaHelper] Filter format detection`

## How to Enable Debug Logs (if needed)

If you need to debug filter issues, add this to your `.env` file:

```env
DEBUG_STORES_API=true
```

Then restart your server.

## Default Behavior

By default (without `DEBUG_STORES_API`), these logs are **disabled** to keep your terminal clean during scraping operations.

---

**Your terminal will now be much cleaner!** ✅
