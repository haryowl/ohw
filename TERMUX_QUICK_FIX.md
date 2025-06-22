# 🔧 Termux Quick Fix Guide

## ❌ Current Issues
1. **Wrong package command** - Used `install` instead of `pkg install`
2. **Missing Python** - Required for sqlite3 build
3. **sqlite3 build failure** - Native module compilation issues

## 🚀 Quick Solutions

### Option 1: Install Python and Fix (Recommended)
```bash
# Install Python and build tools
pkg install -y python build-essential

# Set Python path for npm
export PYTHON=$(which python)
npm config set python $(which python)

# Try installing again
cd backend
npm install --build-from-source
```

### Option 2: Use Simplified Version (Easiest)
```bash
# Download the simplified installer
wget https://raw.githubusercontent.com/haryowl/galileosky-parser/main/termux-simple-install.sh
chmod +x termux-simple-install.sh
./termux-simple-install.sh
```

### Option 3: Manual Fix
```bash
# Step 1: Install correct packages
pkg update -y
pkg install -y nodejs git python build-essential

# Step 2: Set Python path
export PYTHON=$(which python)
npm config set python $(which python)

# Step 3: Install with specific flags
cd backend
npm install --no-optional --ignore-scripts
npm install sqlite3 --build-from-source --python=$(which python)
```

## 🔍 What Went Wrong

### Issue 1: Wrong Package Command
```bash
# ❌ Wrong
install nodejs git sqlite wget curl -y

# ✅ Correct
pkg install -y nodejs git python wget curl
```

### Issue 2: Missing Python
The sqlite3 package needs Python to build native modules:
```bash
# Install Python
pkg install -y python build-essential

# Set Python path
export PYTHON=$(which python)
npm config set python $(which python)
```

### Issue 3: Build Dependencies
Termux needs build tools for native modules:
```bash
pkg install -y build-essential python-dev
```

## 🎯 Recommended Approach

### For Quick Setup (Simplified)
```bash
# Download and run simplified installer
wget https://raw.githubusercontent.com/haryowl/galileosky-parser/main/termux-simple-install.sh
chmod +x termux-simple-install.sh
./termux-simple-install.sh
```

### For Full Features (With Python)
```bash
# Download and run fixed installer
wget https://raw.githubusercontent.com/haryowl/galileosky-parser/main/termux-fixed-install.sh
chmod +x termux-fixed-install.sh
./termux-fixed-install.sh
```

## 📱 Simplified vs Full Version

### Simplified Version
- ✅ **No build dependencies** required
- ✅ **In-memory storage** (no database)
- ✅ **TCP server** for Galileosky devices
- ✅ **WebSocket** for real-time updates
- ✅ **HTTP API** endpoints
- ❌ No persistent data storage

### Full Version
- ✅ **Complete database** support
- ✅ **Persistent storage** with SQLite
- ✅ **All features** from original
- ❌ Requires Python and build tools
- ❌ More complex installation

## 🚀 Quick Start Commands

### For Simplified Version:
```bash
# Install basic packages
pkg install -y nodejs git wget curl

# Clone repository
git clone https://github.com/haryowl/galileosky-parser.git
cd galileosky-parser

# Run simplified installer
chmod +x termux-simple-install.sh
./termux-simple-install.sh

# Start server
./start-simple.sh
```

### For Full Version:
```bash
# Install all required packages
pkg install -y nodejs git python build-essential

# Clone repository
git clone https://github.com/haryowl/galileosky-parser.git
cd galileosky-parser

# Run fixed installer
chmod +x termux-fixed-install.sh
./termux-fixed-install.sh

# Start server
./start-backend.sh
```

## 🌐 Access Your Server

After successful installation:
- **HTTP API**: http://localhost:3001
- **TCP Server**: localhost:3003
- **WebSocket**: ws://localhost:3001

## 📞 Need Help?

- Check the logs for specific error messages
- Try the simplified version first
- Make sure you have enough storage space
- Restart Termux if needed 