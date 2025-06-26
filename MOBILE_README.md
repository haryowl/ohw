# 📱 Galileosky Parser Mobile

A mobile-friendly backend server for parsing Galileosky device data, designed to run on Android phones using Termux.

## 🚀 Quick Start

### For New Users (Complete Setup)
1. **Install Termux** from F-Droid: https://f-droid.org/
2. **Run the installation script**:
   ```bash
   curl -sSL https://raw.githubusercontent.com/haryowl/galileosky-parser/main/mobile-install.sh | bash
   ```
3. **Start the server**:
   ```bash
   ./start-mobile-server.sh
   ```
4. **Access the interface**: http://localhost:3000

### For Experienced Users
```bash
# Install dependencies
pkg install -y git nodejs npm

# Clone and setup
git clone https://github.com/haryowl/galileosky-parser.git
cd galileosky-parser
npm install

# Start server
node termux-enhanced-backend.js
```

## 📚 Documentation

- **[Complete Installation Guide](MOBILE_INSTALLATION_GUIDE.md)** - Step-by-step instructions
- **[Quick Reference](MOBILE_QUICK_REFERENCE.md)** - Essential commands
- **[Troubleshooting](TERMUX_QUICK_FIX.md)** - Common issues and solutions

## 🌟 Features

- **Real-time data parsing** from Galileosky devices
- **Mobile-optimized web interface** with responsive design
- **Data tracking and visualization** with maps
- **CSV export functionality** with custom parameters
- **Offline mode support** for areas without internet
- **Multiple backend options** (enhanced, simple, quick-start)

## 📱 Mobile Interface

The web interface includes:
- **Dashboard** - Real-time data and connection status
- **Data Tracking** - Historical data with map visualization
- **Data Export** - Custom CSV export with parameter selection
- **Settings** - Configuration and preferences

## 🔧 Configuration

### Device Setup
Configure your Galileosky devices to send data to:
- **IP Address**: Your phone's IP address
- **Port**: 3000
- **Protocol**: TCP/UDP (as configured in your device)

### Network Access
- **Local access**: http://localhost:3000
- **Remote access**: http://YOUR_PHONE_IP:3000
- **Find your IP**: `ip addr show wlan0`

## 🛠️ Available Backends

1. **Enhanced Backend** (`termux-enhanced-backend.js`)
   - Full feature set
   - Database storage
   - Advanced logging
   - Recommended for production

2. **Simple Backend** (`termux-simple-backend.js`)
   - Lightweight
   - Basic functionality
   - Good for testing

3. **Quick Start** (`termux-quick-start.sh`)
   - Automated setup
   - One-command start
   - Good for beginners

## 📊 System Requirements

- **Android**: 7.0 or higher
- **Storage**: 500MB free space
- **Memory**: 2GB RAM recommended
- **Network**: WiFi connection for device communication

## 🔄 Updates

To update to the latest version:
```bash
cd /data/data/com.termux/files/home/galileosky-parser
git pull
npm install
```

## 🆘 Support

### Common Issues
- **Permission denied**: `chmod +x *.sh *.js`
- **Port in use**: `pkill -f node`
- **Cannot access**: Check firewall and IP address
- **Database errors**: Delete `data/parser.db` and restart

### Emergency Reset
```bash
cd /data/data/com.termux/files/home
rm -rf galileosky-parser
git clone https://github.com/haryowl/galileosky-parser.git
cd galileosky-parser && npm install
```

## 📞 Getting Help

1. Check the troubleshooting guides
2. Review the logs: `tail -f logs/parser.log`
3. Create an issue on GitHub
4. Check the documentation files

---

**Remember**: Keep your phone plugged in when running the server for extended periods!

## 🎯 Next Steps

After installation:
1. Configure your Galileosky devices
2. Test data reception
3. Explore the mobile interface
4. Set up auto-start if needed
5. Configure data export preferences

---

*For detailed instructions, see the [Complete Installation Guide](MOBILE_INSTALLATION_GUIDE.md)* 