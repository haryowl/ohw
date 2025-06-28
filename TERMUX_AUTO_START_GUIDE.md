# 📱 Termux Auto-Start Guide for OHW Parser

## 🚨 PM2 Startup Issue

The error you encountered:
```
[PM2][ERROR] Init system not found
```

This happens because **PM2's `startup` command doesn't work in Termux** since Android doesn't have a traditional init system like systemd.

## 🔧 Alternative Auto-Start Solutions

### Option 1: Termux:Boot (Recommended)

#### Step 1: Install Termux:Boot
```bash
# Install the Termux:Boot package
pkg install termux-boot -y
```

#### Step 2: Run Auto-Start Setup
```bash
# Navigate to your project
cd ~/galileosky-parser

# Make the setup script executable
chmod +x termux-auto-start-setup.sh

# Run the setup
./termux-auto-start-setup.sh
```

#### Step 3: Install Termux:Boot App
1. Download **Termux:Boot** from F-Droid: https://f-droid.org/en/packages/com.termux.boot/
2. Install the app
3. Enable it in your Android system settings

#### Step 4: Test Auto-Start
```bash
# Close Termux completely
# Reopen Termux
# Check if server started automatically
~/ohw-status.sh
```

### Option 2: Manual Boot Script

If you prefer manual setup:

```bash
# Create boot directory
mkdir -p ~/.termux/boot

# Copy the boot script
cp ~/galileosky-parser/termux-boot-startup.sh ~/.termux/boot/ohw-parser-boot.sh

# Make it executable
chmod +x ~/.termux/boot/ohw-parser-boot.sh
```

### Option 3: Termux Widget (Alternative)

#### Install Termux:Widget
```bash
pkg install termux-widget -y
```

#### Create Widget Scripts
```bash
# Create widget directory
mkdir -p ~/.shortcuts

# Start server widget
cat > ~/.shortcuts/ohw-start << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash
cd ~/galileosky-parser
nohup node backend/src/server.js > ~/ohw-server.log 2>&1 &
echo $! > ~/ohw-server.pid
termux-toast "OHW Parser started"
EOF

# Stop server widget
cat > ~/.shortcuts/ohw-stop << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash
if [ -f ~/ohw-server.pid ]; then
    kill $(cat ~/ohw-server.pid)
    rm ~/ohw-server.pid
    termux-toast "OHW Parser stopped"
else
    termux-toast "Server not running"
fi
EOF

# Status widget
cat > ~/.shortcuts/ohw-status << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash
if [ -f ~/ohw-server.pid ]; then
    PID=$(cat ~/ohw-server.pid)
    if kill -0 $PID 2>/dev/null; then
        termux-toast "Server running (PID: $PID)"
    else
        termux-toast "Server not running"
    fi
else
    termux-toast "Server not running"
fi
EOF

# Make widgets executable
chmod +x ~/.shortcuts/ohw-*
```

## 📋 Available Commands

After setup, you'll have these commands available:

```bash
# Check server status
~/ohw-status.sh

# Stop the server
~/ohw-stop.sh

# Restart the server
~/ohw-restart.sh

# View boot logs
tail -f ~/ohw-boot.log

# View server logs
tail -f ~/ohw-server.log
```

## 🔍 Troubleshooting

### Issue: Server doesn't start on boot
**Solutions:**
1. Check if Termux:Boot app is installed and enabled
2. Check boot logs: `cat ~/ohw-boot.log`
3. Verify boot script exists: `ls -la ~/.termux/boot/`
4. Test boot script manually: `~/.termux/boot/ohw-parser-boot.sh`

### Issue: Permission denied
**Solutions:**
```bash
# Make scripts executable
chmod +x ~/galileosky-parser/termux-boot-startup.sh
chmod +x ~/.termux/boot/ohw-parser-boot.sh
chmod +x ~/ohw-*.sh
```

### Issue: Port already in use
**Solutions:**
```bash
# Check what's using port 3001
netstat -tlnp | grep :3001

# Kill existing process
pkill -f "node.*server.js"

# Or use the stop script
~/ohw-stop.sh
```

### Issue: Node.js not found
**Solutions:**
```bash
# Install Node.js
pkg install nodejs -y

# Verify installation
node --version
```

## 📱 Mobile-Specific Tips

### Battery Optimization
- Add Termux to battery optimization exceptions
- Disable battery optimization for Termux:Boot app

### Network Access
- Ensure Termux has network permissions
- Check firewall settings if using mobile hotspot

### Storage
- Monitor storage space: `df -h`
- Clean logs if needed: `rm ~/ohw-*.log`

## 🔄 Alternative: Manual Start

If auto-start doesn't work, you can manually start the server:

```bash
# Navigate to project
cd ~/galileosky-parser

# Start server
nohup node backend/src/server.js > ~/ohw-server.log 2>&1 &
echo $! > ~/ohw-server.pid

# Check status
~/ohw-status.sh
```

## 📊 Monitoring

### Check Server Status
```bash
# Quick status check
~/ohw-status.sh

# Real-time logs
tail -f ~/ohw-server.log

# Check process
ps aux | grep "node.*server.js"
```

### Network Information
```bash
# Get IP address
ip route get 1 | awk '{print $7; exit}'

# Check if port is listening
netstat -tlnp | grep :3001
```

## ✅ Success Indicators

When auto-start is working correctly:
- ✅ Server starts automatically when Termux opens
- ✅ `~/ohw-status.sh` shows "Server is running"
- ✅ Web interface accessible at `http://localhost:3001`
- ✅ Network URL shows your device's IP address

---

**Note**: Termux:Boot is the most reliable method for auto-start in Termux. The PM2 startup command will not work in the Android environment. 