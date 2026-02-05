# Spotify Scraper - VNC Manual Login Guide

## Problem: Session Expired
When you see this error:
```
SESSION_EXPIRED: Redirected to login page when accessing song
Automated re-login is DISABLED. Please login via VNC to continue.
```

The Spotify session has expired and you need to manually login to refresh it.

## Solution: VNC Remote Desktop

### Step 1: SSH into the Server
```bash
ssh root@your-server-ip
cd /root/arti-marketing-ops/spotify_scraper
```

### Step 2: Start VNC + Login Browser
```bash
bash start_vnc_and_login.sh
```

This will:
1. Start Xvfb (virtual display)
2. Start x11vnc (VNC server on port 5900)
3. Open browser for manual login

### Step 3: Connect with VNC Client
Download a VNC client:
- **Windows**: [RealVNC Viewer](https://www.realvnc.com/download/viewer/) or [TightVNC](https://www.tightvnc.com/)
- **Mac**: Use built-in Screen Sharing (Cmd+K in Finder, `vnc://server-ip:5900`)
- **Linux**: `vncviewer server-ip:5900`

Connect to:
```
Host: your-server-ip:5900
Password: spotify123
```

### Step 4: Login to Spotify
1. In the VNC viewer, you'll see a browser window
2. Login to Spotify for Artists with your credentials
3. Complete any CAPTCHA challenge
4. Verify you reach the Spotify for Artists dashboard

### Step 5: Close and Test
1. Press `Ctrl+C` in the SSH terminal to close the browser
2. Test the scraper:
   ```bash
   bash run_production_scraper.sh
   ```

## Firewall Note
If you can't connect, make sure port 5900 is open:
```bash
# For ufw (Ubuntu)
ufw allow 5900/tcp

# For iptables
iptables -A INPUT -p tcp --dport 5900 -j ACCEPT
```

## Alternative: SSH Tunnel (More Secure)
If you don't want to expose port 5900 publicly:
```bash
# On your local machine, create SSH tunnel:
ssh -L 5900:localhost:5900 root@your-server-ip

# Then connect VNC client to:
localhost:5900
```

## Troubleshooting

### VNC Connection Refused
```bash
# Check if x11vnc is running
pgrep -a x11vnc

# Check if port 5900 is listening
netstat -tlnp | grep 5900

# Restart VNC
pkill x11vnc
x11vnc -display :99 -forever -shared -rfbauth /root/.vnc/passwd -bg
```

### Browser Won't Start
```bash
# Clear browser locks
rm -f data/browser_data/SingletonLock
rm -f data/browser_data/SingletonCookie
rm -f data/browser_data/SingletonSocket

# Kill any zombie chrome processes
pkill -9 chromium
pkill -9 chrome
```

### Black Screen in VNC
```bash
# Check if Xvfb is running
pgrep -a Xvfb

# Restart Xvfb
pkill Xvfb
Xvfb :99 -screen 0 1920x1080x24 -ac &
export DISPLAY=:99
```

## Session Lifetime
After logging in, the session typically lasts 1-2 weeks before needing to re-login. The scraper saves the session to:
```
/root/arti-marketing-ops/spotify_scraper/data/browser_data/
```

This directory contains cookies and localStorage that maintain your login state.
