# Port Forwarding Guide for Port 8080

## ✅ Quick Setup (Already Configured)

The Vite dev server is now configured to listen on `0.0.0.0`, which means it's accessible from:
- **Local machine**: `http://localhost:8080`
- **Same network devices**: `http://YOUR_IP:8080` (see below to find your IP)
- **Mobile devices on same WiFi**: `http://YOUR_IP:8080`

## 📱 Access from Mobile Devices (Same Network)

1. **Find your computer's IP address:**

   **Windows:**
   ```powershell
   ipconfig
   ```
   Look for "IPv4 Address" under your active network adapter (usually starts with 192.168.x.x or 10.0.x.x)

   **Mac/Linux:**
   ```bash
   ifconfig
   # or
   ip addr show
   ```

2. **Start the dev server:**
   ```bash
   npm run dev
   ```

3. **Access from mobile device:**
   - Make sure your phone/tablet is on the same WiFi network
   - Open browser and go to: `http://YOUR_IP:8080`
   - Example: `http://192.168.1.100:8080`

## 🌐 Public Access (Internet)

If you want to access your dev server from anywhere on the internet, use one of these options:

### Option 1: ngrok (Easiest - Recommended)

1. **Install ngrok:**
   - Download from: https://ngrok.com/download
   - Or install via npm: `npm install -g ngrok`

2. **Start your dev server:**
   ```bash
   npm run dev
   ```

3. **In a new terminal, forward port 8080:**
   ```bash
   ngrok http 8080
   ```

4. **You'll get a public URL like:**
   ```
   Forwarding: https://abc123.ngrok.io -> http://localhost:8080
   ```

5. **Access from anywhere:**
   - Use the ngrok URL: `https://abc123.ngrok.io`
   - Share this URL with others for testing

**Note:** Free ngrok URLs change each time you restart. For a fixed URL, sign up for a free account.

### Option 2: localtunnel (Free, No Signup)

1. **Install localtunnel:**
   ```bash
   npm install -g localtunnel
   ```

2. **Start your dev server:**
   ```bash
   npm run dev
   ```

3. **In a new terminal, forward port 8080:**
   ```bash
   lt --port 8080
   ```

4. **You'll get a public URL like:**
   ```
   your url is: https://random-name.loca.lt
   ```

### Option 3: Cloudflare Tunnel (Free, Permanent)

1. **Install cloudflared:**
   - Download from: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/

2. **Start your dev server:**
   ```bash
   npm run dev
   ```

3. **In a new terminal, create tunnel:**
   ```bash
   cloudflared tunnel --url http://localhost:8080
   ```

## 🔒 Security Notes

⚠️ **Important Security Considerations:**

1. **Development Only**: Port forwarding exposes your dev server to the internet. Only use for testing.

2. **Firewall**: Make sure your firewall allows incoming connections on port 8080 if accessing from the network.

3. **HTTPS**: For production, always use HTTPS. ngrok provides HTTPS automatically.

4. **Backend Server**: If you also need to forward the backend (port 3000), use a separate tunnel:
   ```bash
   ngrok http 3000
   ```

## 🔧 Troubleshooting

### Can't access from mobile device?

1. **Check firewall:**
   - Windows: Allow port 8080 in Windows Firewall
   - Mac: System Preferences → Security → Firewall → Allow incoming connections

2. **Verify same network:**
   - Both devices must be on the same WiFi network
   - Check IP address is correct

3. **Check server is running:**
   - Look for: `Local: http://localhost:8080/`
   - Should also show: `Network: http://YOUR_IP:8080/`

### Port 8080 already in use?

The config has `strictPort: false`, so Vite will try the next available port (8081, 8082, etc.).

To force port 8080, change to:
```js
strictPort: true,
```

## 📝 Current Configuration

Your `vite.config.js` is configured with:
```js
server: {
  host: "0.0.0.0",  // ✅ Allows network access
  port: 8080,
  strictPort: false,
}
```

This means the server is ready for network access! Just restart your dev server to apply the changes.

