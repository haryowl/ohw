# 📱 OHW Parser - Complete Mobile Installation Guide

## 🎯 Overview
This guide will help you install the OHW parser on a new Android phone from scratch. The parser will run as a mobile server that can receive and process tracking data.

## 📋 Prerequisites
- **Android 7.0+** (API 24+)
- **2GB+ free storage**
- **Internet connection** (for initial setup)
- **Basic Android knowledge**

---

## 🚀 Step 1: Install Termux

### Option A: F-Droid (Recommended)
1. **Download F-Droid** from https://f-droid.org/
2. **Install F-Droid** on your phone
3. **Open F-Droid** and search for "Termux"
4. **Install Termux** from the official repository

### Option B: Google Play Store
1. **Open Google Play Store**
2. **Search for "Termux"**
3. **Install Termux** (official version)

---

## 🔧 Step 2: Initial Termux Setup

```bash
# Open Termux app on your phone

# Update package list
pkg update -y

# Install essential packages
pkg install nodejs git sqlite wget curl -y

# Verify installations
node --version
npm --version
git --version
```

**Expected Output:**
```
Node.js v18.x.x
npm v9.x.x
git version 2.x.x
```

---

## 📥 Step 3: Download OHW Parser

```bash
# Navigate to home directory
cd ~

# Clone the OHW Parser repository
git clone https://github.com/haryowl/galileosky-parser.git

# Enter the project directory
cd galileosky-parser

# Verify the download
ls -la
```

**Expected Output:**
```
backend/  frontend/  simple-frontend.html  termux-*.sh  *.md
```

---

## 📦 Step 4: Install Dependencies

```bash
# Install root dependencies
npm install --no-optional

# Install backend dependencies
cd backend
npm install --no-optional
cd ..

# Install frontend dependencies
cd frontend
npm install --no-optional
cd ..
```

**Note:** If you get build errors, that's normal - we'll use the pre-built frontend.

---

## 🏗️ Step 5: Build Frontend (Optional)

### If Build Succeeds:
```bash
cd frontend
npm run build
cd ..
```

### If Build Fails (Most Common):
```bash
# Create a simple frontend directory
mkdir -p frontend/build

# Copy the simple frontend
cp simple-frontend.html frontend/build/index.html
```

---

## ⚙️ Step 6: Configure Mobile Settings

```bash
# Create data directories
mkdir -p backend/data backend/logs

# Create mobile configuration
cd backend
cat > .env << 'EOF'
NODE_ENV=production
PORT=3001
TCP_PORT=3003
WS_PORT=3001
DATABASE_URL=sqlite://./data/mobile.sqlite
LOG_LEVEL=warn
MAX_PACKET_SIZE=512
CORS_ORIGIN=*
EOF

cd ..
```

---

## 🚀 Step 7: Create Management Scripts

```bash
# Create start script
cat > ~/ohw-start.sh << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash

echo "🚀 Starting OHW Parser..."

cd ~/galileosky-parser

# Check if already running
if [ -f "$HOME/ohw-server.pid" ]; then
    PID=$(cat "$HOME/ohw-server.pid")
    if kill -0 $PID 2>/dev/null; then
        echo "✅ Server is already running (PID: $PID)"
        exit 0
    fi
fi

# Start the server
nohup node backend/src/server.js > "$HOME/ohw-server.log" 2>&1 &
SERVER_PID=$!

# Save the PID
echo $SERVER_PID > "$HOME/ohw-server.pid"

# Wait and check if started successfully
sleep 3
if kill -0 $SERVER_PID 2>/dev/null; then
    echo "✅ Server started successfully (PID: $SERVER_PID)"
    echo "🌐 Local URL: http://localhost:3001"
    
    # Get IP address
    IP_ADDRESSES=$(ip route get 1 | awk '{print $7; exit}')
    if [ -n "$IP_ADDRESSES" ]; then
        echo "📱 Network URL: http://$IP_ADDRESSES:3001"
    fi
else
    echo "❌ Failed to start server"
    rm -f "$HOME/ohw-server.pid"
    exit 1
fi
EOF

# Create status script
cat > ~/ohw-status.sh << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash

echo "📊 OHW Parser Status"
echo "==================="

# Check if server is running
if [ -f "$HOME/ohw-server.pid" ]; then
    PID=$(cat "$HOME/ohw-server.pid")
    if kill -0 $PID 2>/dev/null; then
        echo "✅ Server is running (PID: $PID)"
        echo "🌐 Local URL: http://localhost:3001"
        
        # Get IP addresses
        IP_ADDRESSES=$(ip route get 1 | awk '{print $7; exit}')
        if [ -n "$IP_ADDRESSES" ]; then
            echo "📱 Network URL: http://$IP_ADDRESSES:3001"
        fi
        
        # Show recent logs
        echo ""
        echo "📋 Recent Logs:"
        if [ -f "$HOME/ohw-server.log" ]; then
            tail -5 "$HOME/ohw-server.log"
        else
            echo "No logs found"
        fi
    else
        echo "❌ Server is not running (PID file exists but process not found)"
    fi
else
    echo "❌ Server is not running (no PID file)"
fi
EOF

# Create stop script
cat > ~/ohw-stop.sh << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash

echo "🛑 Stopping OHW Parser..."

if [ -f "$HOME/ohw-server.pid" ]; then
    PID=$(cat "$HOME/ohw-server.pid")
    if kill -0 $PID 2>/dev/null; then
        kill $PID
        echo "✅ Server stopped (PID: $PID)"
        rm -f "$HOME/ohw-server.pid"
    else
        echo "❌ Server was not running"
        rm -f "$HOME/ohw-server.pid"
    fi
else
    echo "❌ No PID file found"
fi
EOF

# Create restart script
cat > ~/ohw-restart.sh << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash

echo "🔄 Restarting OHW Parser..."

# Stop if running
if [ -f "$HOME/ohw-stop.sh" ]; then
    source "$HOME/ohw-stop.sh"
fi

# Wait a moment
sleep 2

# Start again
if [ -f "$HOME/ohw-start.sh" ]; then
    source "$HOME/ohw-start.sh"
    echo "✅ Server restarted"
else
    echo "❌ Start script not found"
fi
EOF

# Make all scripts executable
chmod +x ~/ohw-*.sh
```

---

## 🎯 Step 8: Start the Server

```bash
# Start the OHW Parser server
~/ohw-start.sh
```

**Expected Output:**
```
🚀 Starting OHW Parser...
✅ Server started successfully (PID: 12345)
🌐 Local URL: http://localhost:3001
📱 Network URL: http://192.168.1.100:3001
```

---

## 🌐 Step 9: Access the Web Interface

### Option A: Local Access
1. **Open your phone's browser**
2. **Go to:** `http://localhost:3001`
3. **You should see the OHW Parser interface**

### Option B: Network Access (Other Devices)
1. **Use the Network URL** shown in the start output
2. **Example:** `http://192.168.1.100:3001`
3. **Other devices on the same network can access it**

---

## 📱 Step 10: Test the Installation

```bash
# Check server status
~/ohw-status.sh

# View real-time logs
tail -f ~/ohw-server.log

# Test web interface
# Open browser and go to the URLs shown above
```

---

## 🔄 Step 11: Auto-Start Setup (Optional)

### Option A: Termux:Boot (Recommended)
```bash
# Install Termux:Boot app from F-Droid
# https://f-droid.org/en/packages/com.termux.boot/

# Create boot directory
mkdir -p ~/.termux/boot

# Copy boot script
cp termux-boot-startup.sh ~/.termux/boot/ohw-parser-boot.sh

# Make executable
chmod +x ~/.termux/boot/ohw-parser-boot.sh
```

### Option B: Termux Widget
```bash
# Install Termux:Widget
pkg install termux-widget -y

# Create widget directory
mkdir -p ~/.shortcuts

# Create start widget
cat > ~/.shortcuts/ohw-start << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash
~/ohw-start.sh
termux-toast "OHW Parser started"
EOF

# Create stop widget
cat > ~/.shortcuts/ohw-stop << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash
~/ohw-stop.sh
termux-toast "OHW Parser stopped"
EOF

# Make widgets executable
chmod +x ~/.shortcuts/ohw-*
```

---

## 📋 Available Commands

After installation, you have these commands:

```bash
# Start the server
~/ohw-start.sh

# Check status
~/ohw-status.sh

# Stop the server
~/ohw-stop.sh

# Restart the server
~/ohw-restart.sh

# View logs
tail -f ~/ohw-server.log

# View recent logs
tail -20 ~/ohw-server.log
```

---

## 🔍 Troubleshooting

### Issue: "Permission denied"
```bash
# Fix script permissions
chmod +x ~/ohw-*.sh
```

### Issue: "Port already in use"
```bash
# Kill existing processes
pkill -f "node.*server.js"

# Or use the stop script
~/ohw-stop.sh
```

### Issue: "Node.js not found"
```bash
# Reinstall Node.js
pkg install nodejs -y
```

### Issue: "Cannot access web interface"
```bash
# Check if server is running
~/ohw-status.sh

# Check firewall settings
# Ensure Termux has network permissions
```

### Issue: "Build failed"
```bash
# This is normal - use the simple frontend
cp simple-frontend.html frontend/build/index.html
```

---

## 📊 Verification Checklist

- ✅ Termux installed and working
- ✅ Node.js and npm installed
- ✅ OHW Parser downloaded
- ✅ Dependencies installed
- ✅ Server starts successfully
- ✅ Web interface accessible
- ✅ Network URL working
- ✅ Management scripts working

---

## 🎉 Success!

Your OHW Parser is now running on your mobile phone! 

**Key Information:**
- **Local Access:** `http://localhost:3001`
- **Network Access:** `http://[YOUR_IP]:3001`
- **Status Check:** `~/ohw-status.sh`
- **Logs:** `tail -f ~/ohw-server.log`

**Next Steps:**
1. **Configure your tracking devices** to send data to the server
2. **Set up peer-to-peer sync** if needed
3. **Monitor the logs** for incoming data
4. **Access the web interface** to view tracking data

---

## 📞 Need Help?

If you encounter issues:
1. **Check the logs:** `tail -f ~/ohw-server.log`
2. **Verify status:** `~/ohw-status.sh`
3. **Restart server:** `~/ohw-restart.sh`
4. **Check network:** Ensure your phone has internet access

**The OHW Parser is now ready to receive and process tracking data!** 🚀 