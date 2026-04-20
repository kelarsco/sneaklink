# Reset PostgreSQL Password

Steps to reset the password for the **postgres** user (or another user) so you can fix `SOURCE_DATABASE_URL` / `DATABASE_URL`.

---

## Windows

### Option A: Using pgAdmin (if installed)

1. Open **pgAdmin**.
2. Connect to your server (may prompt for the **postgres** password — if you don’t know it, use Option B).
3. In the left tree: **Servers** → your server → **Login/Group Roles**.
4. Double‑click **postgres**.
5. Open the **Definition** tab.
6. Set **Password** and **Confirm password**, then **Save**.

### Option B: Using command line (no current password needed)

1. **Stop PostgreSQL service**
   - `Win + R` → `services.msc` → Enter  
   - Find **postgresql-x64-XX** (or "PostgreSQL")  
   - Right‑click → **Stop**

2. **Allow local connections without password (temporarily)**
   - Open `pg_hba.conf` (e.g. `C:\Program Files\PostgreSQL\16\data\pg_hba.conf` — version number may differ).
   - Find the line for IPv4 local connections that looks like:
     ```
     host    all    all    127.0.0.1/32    scram-sha-256
     ```
   - Change the last column from `scram-sha-256` to **`trust`** for that line (and the similar `::1/128` line if present).
   - Save the file.

3. **Start PostgreSQL service** again (same service in `services.msc` → **Start**).

4. **Set new password**
   - Open **Command Prompt** or **PowerShell** and run (adjust path if your PostgreSQL is in a different folder):
     ```bat
     "C:\Program Files\PostgreSQL\16\bin\psql" -U postgres -d postgres -c "ALTER USER postgres PASSWORD 'YourNewPassword';"
     ```
   - Replace `16` with your version (e.g. 15, 14) and `YourNewPassword` with the password you want.

5. **Restore security**
   - Edit `pg_hba.conf` again and change **`trust`** back to **`scram-sha-256`** for the same lines.
   - Save, then **restart** the PostgreSQL service.

6. **Test**
   - In `server/.env` set:
     ```
     DATABASE_URL=postgresql://postgres:YourNewPassword@localhost:5432/sneaklink?schema=public
     ```
   - From `server` run: `npm run postgres:test`

---

## macOS (Homebrew PostgreSQL)

1. Stop PostgreSQL:
   ```bash
   brew services stop postgresql
   ```
2. Run Postgres in the foreground (allows local trust):
   ```bash
   pg_ctl -D /opt/homebrew/var/postgres start
   ```
   (Path may be `/usr/local/var/postgres` on Intel Macs.)

3. Connect and set password (no password when prompted):
   ```bash
   psql -U postgres -d postgres -c "ALTER USER postgres PASSWORD 'YourNewPassword';"
   ```
4. Stop and start normally:
   ```bash
   pg_ctl -D /opt/homebrew/var/postgres stop
   brew services start postgresql
   ```

---

## Linux (system PostgreSQL)

1. Switch to the postgres system user and open psql:
   ```bash
   sudo -u postgres psql -d postgres
   ```
2. In psql:
   ```sql
   ALTER USER postgres PASSWORD 'YourNewPassword';
   \q
   ```
3. If you can’t log in (e.g. auth failed), temporarily set local connections to `trust` in `pg_hba.conf` (often under `/etc/postgresql/<ver>/main/`), restart PostgreSQL, then run the `ALTER USER` and set `pg_hba.conf` back to your previous auth method.

---

## After reset

- Update **server/.env**:
  - **DATABASE_URL** and/or **SOURCE_DATABASE_URL** = `postgresql://postgres:YourNewPassword@localhost:5432/sneaklink?schema=public`
- If the password has special characters (`@`, `#`, `%`, etc.), URL‑encode them in the connection string (e.g. `@` → `%40`).
- Run: `npm run db:check-sync-urls` then `npm run db:sync-neon` if you’re syncing to Neon.
