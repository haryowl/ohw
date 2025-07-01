# 📱 Galileosky Parser - Complete Mobile Installation Guide

## 🎯 Overview
This guide will help you install the Galileosky parser on a new Android phone from scratch. The parser includes peer-to-peer sync capabilities and can run as a mobile server that receives and processes tracking data.

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

## 📥 Step 3: Download Galileosky Parser

```bash
# Navigate to home directory
cd ~

# Clone the OHW Parser repository
git clone https://github.com/haryowl/ohw.git

# Enter the project directory
cd ohw

# Verify the download
ls -la
```

**Expected Output:**
```
backend/  frontend/  documentP/  termux-*.sh  *.md
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

# Install frontend dependencies (optional - we'll use mobile frontend)
cd frontend
npm install --no-optional
cd ..
```

**Note:** If you get build errors, that's normal - we'll use the mobile-optimized frontend.

---

## 🏗️ Step 5: Setup Mobile Configuration

```bash
# Create data directories
mkdir -p backend/data backend/logs backend/output

# Create mobile configuration
cd backend
cat > .env << 'EOF'
NODE_ENV=production
PORT=3001
TCP_PORT=3003
WS_PORT=3001
DATABASE_URL=sqlite://./data/mobile.sqlite
LOG_LEVEL=info
MAX_PACKET_SIZE=512
CORS_ORIGIN=*
PEER_SYNC_ENABLED=true
PEER_SYNC_PORT=3004
EOF

cd ..
```

---

## 🚀 Step 6: Create Management Scripts

```bash
# Create start script
cat > ~/galileosky-start.sh << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash

echo "🚀 Starting Galileosky Parser..."

cd ~/ohw

# Check if already running
if [ -f "$HOME/galileosky-server.pid" ]; then
    PID=$(cat "$HOME/galileosky-server.pid")
    if kill -0 $PID 2>/dev/null; then
        echo "✅ Server is already running (PID: $PID)"
        exit 0
    fi
fi

# Start the enhanced backend
nohup node backend/src/enhanced-backend.js > "$HOME/galileosky-server.log" 2>&1 &
SERVER_PID=$!

# Save the PID
echo $SERVER_PID > "$HOME/galileosky-server.pid"

# Wait and check if started successfully
sleep 3
if kill -0 $SERVER_PID 2>/dev/null; then
    echo "✅ Server started successfully (PID: $SERVER_PID)"
    echo "🌐 Local URL: http://localhost:3001"
    echo "📡 TCP Server: localhost:3003"
    echo "🔄 Peer Sync: localhost:3004"
    
    # Get IP address
    IP_ADDRESSES=$(ip route get 1 | awk '{print $7; exit}')
    if [ -n "$IP_ADDRESSES" ]; then
        echo "📱 Network URL: http://$IP_ADDRESSES:3001"
        echo "🔄 Peer Sync URL: http://$IP_ADDRESSES:3004"
    fi
else
    echo "❌ Failed to start server"
    rm -f "$HOME/galileosky-server.pid"
    exit 1
fi
EOF

# Create status script
cat > ~/galileosky-status.sh << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash

echo "📊 Galileosky Parser Status"
echo "=========================="

# Check if server is running
if [ -f "$HOME/galileosky-server.pid" ]; then
    PID=$(cat "$HOME/galileosky-server.pid")
    if kill -0 $PID 2>/dev/null; then
        echo "✅ Server is running (PID: $PID)"
        echo "🌐 Local URL: http://localhost:3001"
        echo "📡 TCP Server: localhost:3003"
        echo "🔄 Peer Sync: localhost:3004"
        
        # Get IP address
        IP_ADDRESSES=$(ip route get 1 | awk '{print $7; exit}')
        if [ -n "$IP_ADDRESSES" ]; then
            echo "📱 Network URL: http://$IP_ADDRESSES:3001"
            echo "🔄 Peer Sync URL: http://$IP_ADDRESSES:3004"
        fi
        
        # Show recent logs
        echo ""
        echo "📋 Recent logs:"
        tail -10 "$HOME/galileosky-server.log"
    else
        echo "❌ Server is not running"
        rm -f "$HOME/galileosky-server.pid"
    fi
else
    echo "❌ Server is not running"
fi
EOF

# Create stop script
cat > ~/galileosky-stop.sh << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash

echo "🛑 Stopping Galileosky Parser..."

if [ -f "$HOME/galileosky-server.pid" ]; then
    PID=$(cat "$HOME/galileosky-server.pid")
    if kill -0 $PID 2>/dev/null; then
        kill $PID
        echo "✅ Server stopped (PID: $PID)"
    else
        echo "⚠️ Server was not running"
    fi
    rm -f "$HOME/galileosky-server.pid"
else
    echo "⚠️ No server PID file found"
fi
EOF

# Make scripts executable
chmod +x ~/galileosky-start.sh
chmod +x ~/galileosky-status.sh
chmod +x ~/galileosky-stop.sh
```

---

## 🎯 Step 7: Quick Start Options

### Option A: Use Quick Start Script
```bash
# Navigate to project directory
cd ~/ohw

# Run quick start
./termux-quick-start.sh
```

### Option B: Manual Start
```bash
# Navigate to project directory
cd ~/ohw

# Start the server
./galileosky-start.sh

# Check status
./galileosky-status.sh
```

---

## 📱 Step 8: Access the Mobile Interface

### Option A: Use Mobile Frontend
1. **Open your phone's browser**
2. **Navigate to:** `http://localhost:3001`
3. **Or use the mobile-optimized interface:** `http://localhost:3001/mobile`

### Option B: Use Peer Sync Interface
1. **Open your phone's browser**
2. **Navigate to:** `http://localhost:3001/peer-sync`
3. **This interface allows peer-to-peer data syncing**

---

## 🔄 Step 9: Peer-to-Peer Sync Setup

### For Hotspot Phone (Primary):
```bash
# Start the server
./galileosky-start.sh

# The server will automatically enable peer sync on port 3004
```

### For Client Phone (Secondary):
1. **Connect to the hotspot phone's WiFi**
2. **Get the hotspot phone's IP address**
3. **Open browser and go to:** `http://[HOTSPOT_IP]:3001/peer-sync`
4. **Click "Connect to Peer" and enter the hotspot IP**

---

## 📊 Step 10: Verify Installation

### Check Server Status:
```bash
./galileosky-status.sh
```

### Test API Endpoints:
```bash
# Test basic connectivity
curl http://localhost:3001/api/health

# Test device list
curl http://localhost:3001/api/devices

# Test data endpoint
curl http://localhost:3001/api/data
```

### Expected Output:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## 🛠️ Troubleshooting

### Common Issues:

#### 1. Port Already in Use
```bash
# Check what's using the port
netstat -tulpn | grep :3001

# Kill the process
kill -9 [PID]

# Restart server
./galileosky-start.sh
```

#### 2. Permission Denied
```bash
# Fix script permissions
chmod +x ~/galileosky-*.sh

# Fix project permissions
chmod -R 755 ~/ohw
```

#### 3. Database Issues
```bash
# Clear database and restart
rm -f backend/data/mobile.sqlite
./galileosky-start.sh
```

#### 4. Network Issues
```bash
# Check IP address
ip route get 1

# Test connectivity
ping 8.8.8.8
```

---

## 📱 Mobile-Specific Features

### 1. Mobile Hotspot Setup
- **Enable mobile hotspot** on your phone
- **Other devices can connect** and sync data
- **Static IP setup** available for stable connections

### 2. Peer-to-Peer Sync
- **Real-time data synchronization** between devices
- **Bidirectional sync** with conflict resolution
- **Device identification** using IMEI numbers

### 3. Mobile-Optimized Interface
- **Touch-friendly controls**
- **Responsive design**
- **Offline capability**

---

## 🔧 Advanced Configuration

### Custom Ports:
```bash
# Edit the .env file
nano backend/.env

# Change ports as needed
PORT=3001
TCP_PORT=3003
PEER_SYNC_PORT=3004
```

### Log Level:
```bash
# Set log level in .env
LOG_LEVEL=debug  # Options: error, warn, info, debug
```

### Database Location:
```bash
# Change database path in .env
DATABASE_URL=sqlite://./data/custom.sqlite
```

---

## 📞 Support

### Logs Location:
- **Server logs:** `~/galileosky-server.log`
- **Application logs:** `backend/logs/`

### Useful Commands:
```bash
# View server logs
tail -f ~/galileosky-server.log

# Check disk usage
du -sh ~/ohw

# Check memory usage
ps aux | grep node
```

### GitHub Repository:
- **URL:** https://github.com/haryowl/ohw
- **Issues:** Report problems on GitHub
- **Updates:** Pull latest changes with `git pull origin main`

---

## ✅ Installation Complete!

Your Galileosky parser is now installed and running on your mobile phone. You can:

1. **Receive tracking data** via TCP on port 3003
2. **View data** via web interface on port 3001
3. **Sync with other devices** via peer-to-peer on port 3004
4. **Manage the server** using the provided scripts

**Next Steps:**
- Configure your tracking devices to send data to your phone's IP
- Set up peer-to-peer sync with other phones
- Customize the interface and settings as needed 