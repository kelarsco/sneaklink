# Fixing Cursor Port Forwarding Error

## ❌ Error You're Seeing

```
unable to forward localhost8080: spawn c:\program files\cursor\bin\code-tunnel.exe ENOENT
```

This means Cursor IDE is trying to use its built-in port forwarding feature, but the `code-tunnel.exe` file is missing or corrupted.

## ✅ Solution 1: Use Vite's Built-in Network Access (Recommended)

**You don't need Cursor's port forwarding!** Your Vite config is already set up correctly.

1. **Start your dev server:**
   ```bash
   npm run dev
   ```

2. **Look for the Network URL in the terminal:**
   ```
   ➜  Local:   http://localhost:8080/
   ➜  Network: http://192.168.x.x:8080/  ← Use this!
   ```

3. **Access from mobile/other devices:**
   - Use the Network URL shown: `http://192.168.x.x:8080`
   - Both devices must be on the same WiFi network

**No port forwarding needed!** Vite is already listening on all network interfaces.

## ✅ Solution 2: Disable Cursor Port Forwarding

If Cursor keeps trying to forward ports automatically:

1. **Open Cursor Settings:**
   - Press `Ctrl+,` (or `Cmd+,` on Mac)
   - Search for "port forwarding"

2. **Disable automatic port forwarding:**
   - Uncheck "Remote: Auto Forward Ports"
   - Or set "Remote: Auto Forward Ports" to `off`

3. **Restart Cursor**

## ✅ Solution 3: Use ngrok (For Public Internet Access)

If you want to access from anywhere on the internet:

1. **Install ngrok:**
   ```bash
   npm install -g ngrok
   ```

2. **Start your dev server:**
   ```bash
   npm run dev
   ```

3. **In a new terminal, forward port 8080:**
   ```bash
   ngrok http 8080
   ```

4. **You'll get a public URL:**
   ```
   Forwarding: https://abc123.ngrok.io -> http://localhost:8080
   ```

5. **Access from anywhere:**
   - Use: `https://abc123.ngrok.io`

## ✅ Solution 4: Fix Cursor's Port Forwarding (If You Really Need It)

If you want to fix Cursor's port forwarding:

1. **Reinstall Cursor:**
   - Download latest version from: https://cursor.sh
   - This should restore the missing `code-tunnel.exe`

2. **Or manually check:**
   - Navigate to: `C:\Program Files\Cursor\bin\`
   - Check if `code-tunnel.exe` exists
   - If missing, reinstall Cursor

## 🎯 Recommended Approach

**Just use Solution 1** - Vite's built-in network access. It's simpler and doesn't require any additional tools or fixes.

Your `vite.config.js` is already configured correctly:
```js
server: {
  host: "0.0.0.0",  // ✅ This allows network access
  port: 8080,
}
```

## 📱 Quick Test

1. Start dev server: `npm run dev`
2. Find your IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
3. On mobile (same WiFi): Open `http://YOUR_IP:8080`

That's it! No port forwarding needed.

