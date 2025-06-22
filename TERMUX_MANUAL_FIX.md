# 🔧 Termux Manual Fix - Correct Commands

## ❌ The Problem
The command `npm config set python $(which python)` is incorrect syntax.

## ✅ Correct Commands

### Step 1: Install Python and Build Tools
```bash
pkg install -y python build-essential
```

### Step 2: Set Environment Variables
```bash
export PYTHON=$(which python)
export PYTHONPATH=$(which python)
```

### Step 3: Set npm Configuration (Correct Syntax)
```bash
npm config set python "$PYTHON"
```

### Step 4: Install Dependencies
```bash
cd backend
npm install --python="$PYTHON" --build-from-source
```

## 🚀 Complete Fix Commands

Run these commands one by one:

```bash
# 1. Install required packages
pkg install -y python build-essential

# 2. Set Python path
export PYTHON=$(which python)

# 3. Configure npm
npm config set python "$PYTHON"

# 4. Go to backend directory
cd backend

# 5. Clean npm cache
npm cache clean --force

# 6. Install dependencies
npm install --python="$PYTHON" --build-from-source
```

## 🔍 Alternative: Use the Fix Script

```bash
# Download and run the fix script
wget https://raw.githubusercontent.com/haryowl/galileosky-parser/main/termux-python-fix.sh
chmod +x termux-python-fix.sh
./termux-python-fix.sh
```

## 🎯 If sqlite3 Still Fails

If you still get sqlite3 build errors, use the simplified version:

```bash
# Download simplified installer
wget https://raw.githubusercontent.com/haryowl/galileosky-parser/main/termux-simple-install.sh
chmod +x termux-simple-install.sh
./termux-simple-install.sh

# Start simplified server
./start-simple.sh
```

## 📱 Simplified vs Full Version

### Simplified Version (Recommended for Termux)
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

## 🚀 Quick Start (Simplified)

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

## 🌐 Access Your Server

After successful installation:
- **HTTP API**: http://localhost:3001
- **TCP Server**: localhost:3003
- **WebSocket**: ws://localhost:3001

## 📞 Need Help?

- Try the simplified version first
- Check if you have enough storage space
- Make sure you're in the correct directory
- Restart Termux if needed 