# 📱 Mobile Setup Quick Reference

## 🚀 Essential Commands

### 1. Install Termux & Dependencies
```bash
# Update packages
pkg update

# Install essentials
pkg install -y git curl wget nodejs npm

# Verify
node --version && npm --version
```

### 2. Download & Setup
```bash
# Clone repository
cd /data/data/com.termux/files/home
git clone https://github.com/haryowl/galileosky-parser.git
cd galileosky-parser

# Install dependencies
npm install

# Create directories
mkdir -p config data logs output
```

### 3. Quick Configuration
```bash
# Create config
cat > config/config.json << 'EOF'
{
  "port": 3000,
  "host": "0.0.0.0",
  "database": { "path": "./data/parser.db" },
  "logging": { "level": "info", "file": "./logs/parser.log" }
}
EOF
```

### 4. Start Server
```bash
# Enhanced backend (recommended)
node termux-enhanced-backend.js

# OR Simple backend
node termux-simple-backend.js

# OR Quick start script
bash termux-quick-start.sh
```

### 5. Access Interface
```bash
# Find IP address
ip addr show wlan0

# Access in browser
http://YOUR_IP:3000
# OR
http://localhost:3000
```

## 🔧 Troubleshooting Commands

```bash
# Kill existing processes
pkill -f node

# Check logs
tail -f logs/parser.log

# Reset everything
cd /data/data/com.termux/files/home
rm -rf galileosky-parser
git clone https://github.com/haryowl/galileosky-parser.git
cd galileosky-parser && npm install

# Fix permissions
chmod +x *.sh *.js

# Check disk space
df -h

# View running processes
ps aux | grep node
```

## 📱 Mobile Interface Tabs

1. **Dashboard** - Real-time data & status
2. **Data Tracking** - Historical data & maps
3. **Data Export** - CSV export & customization
4. **Settings** - Configuration & preferences

## ⚡ Quick Start Script

Create this file for one-command startup:
```bash
cat > quick-start.sh << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash
cd /data/data/com.termux/files/home/galileosky-parser
node termux-enhanced-backend.js
EOF
chmod +x quick-start.sh
./quick-start.sh
```

## 🔗 Important URLs

- **Repository**: https://github.com/haryowl/galileosky-parser
- **F-Droid**: https://f-droid.org/ (for Termux)
- **Mobile Interface**: http://YOUR_IP:3000

## 📞 Emergency Reset

If everything breaks:
```bash
cd /data/data/com.termux/files/home
rm -rf galileosky-parser
git clone https://github.com/haryowl/galileosky-parser.git
cd galileosky-parser
npm install
node termux-enhanced-backend.js
```

---

**Remember**: Keep phone plugged in when running server! 