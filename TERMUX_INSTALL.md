# 📱 Termux Installation Guide (No GCC Required)

## 🚀 Quick Setup for Termux

### Prerequisites
- Android 7.0+ (API 24+)
- Termux app from F-Droid (recommended) or Google Play
- 2GB+ free storage
- Internet connection

### Step 1: Install Termux
```bash
# Download from F-Droid (recommended)
# https://f-droid.org/en/packages/com.termux/

# Or from Google Play Store
# Search: "Termux"
```

### Step 2: Basic Setup
```bash
# Update package list
pkg update -y

# Install essential packages (no gcc required)
pkg install nodejs git sqlite wget curl -y

# Verify installation
node --version
npm --version
```

### Step 3: Clone Project
```bash
# Navigate to home directory
cd ~

# Clone the project
git clone https://github.com/your-repo/galileosky-parser.git
cd galileosky-parser
```

### Step 4: Install Dependencies (No Build Tools)
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

### Step 5: Build Frontend (Alternative Methods)

#### Option A: Use Pre-built Frontend
```bash
# If you have a pre-built frontend, copy it
# Copy the build folder from your computer to:
# ~/galileosky-parser/frontend/build/
```

#### Option B: Build on Computer and Transfer
```bash
# On your computer:
cd galileosky-parser/frontend
npm install
npm run build

# Transfer the build folder to your phone:
# - Use USB file transfer
# - Use cloud storage (Google Drive, Dropbox)
# - Use ADB: adb push build /sdcard/Download/
# - Use scp if you have SSH access
```

#### Option C: Try Building in Termux (Limited Success)
```bash
# Try to install minimal build tools
pkg install clang make -y

# Try building
cd frontend
npm run build --legacy-peer-deps
```

### Step 6: Configure for Mobile
```bash
# Create mobile configuration
cd backend
mkdir -p data logs

# Create .env file
cat > .env << EOF
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

### Step 7: Start the Server
```bash
# Use the automated script
chmod +x termux-start.sh
./termux-start.sh start
```

## 🔧 Alternative Installation Methods

### Method 1: Minimal Installation (Backend Only)
```bash
# Install only backend (no frontend build required)
pkg install nodejs git sqlite -y

cd ~/galileosky-parser/backend
npm install --no-optional

# Start backend only
node src/server.js
```

### Method 2: Use Serve for Frontend
```bash
# Install serve globally
npm install -g serve

# Serve the frontend build directory
cd frontend
serve -s build -l 3002
```

### Method 3: Use Python Simple Server
```bash
# If you have Python installed
pkg install python -y

# Serve frontend with Python
cd frontend/build
python -m http.server 3002
```

## 🚨 Troubleshooting

### Issue: "gcc not found"
**Solution**: This is expected in Termux. Use the alternative methods above.

### Issue: "Build failed"
**Solutions**:
1. Use pre-built frontend from computer
2. Build on computer and transfer
3. Use backend-only mode

### Issue: "npm install failed"
**Solutions**:
```bash
# Try with legacy peer deps
npm install --legacy-peer-deps

# Try without optional dependencies
npm install --no-optional

# Clear npm cache
npm cache clean --force
```

### Issue: "Port already in use"
**Solutions**:
```bash
# Check what's using the port
netstat -tlnp | grep :3001

# Kill the process
pkill -f "node.*server.js"
```

### Issue: "Permission denied"
**Solutions**:
```bash
# Make script executable
chmod +x termux-start.sh

# Check file permissions
ls -la termux-start.sh
```

## 📱 Mobile-Specific Commands

### Check Device Status
```bash
# Get device info
./termux-start.sh info

# Check server status
./termux-start.sh status

# Get mobile status via API
curl http://localhost:3001/api/mobile/status
```

### Manage Servers
```bash
# Start servers
./termux-start.sh start

# Stop servers
./termux-start.sh stop

# Install dependencies
./termux-start.sh install
```

### Network Access
```bash
# Get your IP address
ip route get 1 | awk '{print $7; exit}'

# Check if ports are open
netstat -tlnp | grep -E ":(3001|3002|3003)"

# Test connectivity
curl http://localhost:3001/api/devices
```

## 🔄 Alternative Approaches

### 1. Backend-Only Mode
If frontend build fails, you can run just the backend:
```bash
cd backend
node src/server.js
```

Access via:
- API: `http://YOUR_IP:3001/api/devices`
- WebSocket: `ws://YOUR_IP:3001/ws`
- TCP: `YOUR_IP:3003`

### 2. Use External Frontend
Build frontend on computer and access via:
```bash
# On computer, build and serve
cd frontend
npm run build
npx serve -s build -l 3000

# On phone, access computer's IP
# http://COMPUTER_IP:3000
```

### 3. Use Cloud Deployment
Deploy to cloud and access via mobile browser:
- Heroku
- Vercel
- Netlify
- Railway

## 📊 Performance Tips

### Memory Optimization
```bash
# Check memory usage
free -h

# If low memory, reduce Node.js heap
export NODE_OPTIONS="--max-old-space-size=512"
```

### Storage Optimization
```bash
# Check storage
df -h

# Clean npm cache
npm cache clean --force

# Remove old logs
rm -rf backend/logs/*.log
```

### Battery Optimization
```bash
# Reduce polling frequency
export POLLING_INTERVAL=60000

# Use power save mode
curl -X POST http://localhost:3001/api/mobile/optimize \
  -H "Content-Type: application/json" \
  -d '{"level": "power_save"}'
```

## 🎯 Quick Reference

| Command | Description |
|---------|-------------|
| `./termux-start.sh start` | Start all servers |
| `./termux-start.sh stop` | Stop all servers |
| `./termux-start.sh status` | Check server status |
| `./termux-start.sh info` | Show device info |
| `./termux-start.sh install` | Install dependencies |

## 🔗 Useful URLs

Once running, access:
- **Frontend**: `http://YOUR_IP:3002`
- **Backend API**: `http://YOUR_IP:3001/api/devices`
- **Mobile Status**: `http://YOUR_IP:3001/api/mobile/status`
- **WebSocket**: `ws://YOUR_IP:3001/ws`

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Try the alternative installation methods
3. Use backend-only mode if frontend fails
4. Build frontend on computer and transfer

**Your Android phone can run the Galileosky Parser server without gcc!** 🚀 