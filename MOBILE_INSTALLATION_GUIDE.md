# 📱 Galileosky Parser Mobile Installation Guide

## 🎯 Overview
This guide will help you set up the Galileosky parser mobile application on a new Android phone from scratch. The application will run a backend server that can receive and parse Galileosky device data.

## 📋 Prerequisites
- Android phone (Android 7.0 or higher recommended)
- Internet connection for initial setup
- At least 500MB free storage space

---

## 🚀 Step 1: Install Termux

### Option A: Install from F-Droid (Recommended)
1. **Download F-Droid**
   - Open your browser and go to: https://f-droid.org/
   - Download the F-Droid APK file
   - Install the APK (allow installation from unknown sources if prompted)

2. **Install Termux from F-Droid**
   - Open F-Droid app
   - Search for "Termux"
   - Install Termux (this is the official version with full functionality)

### Option B: Install from Google Play Store (Limited)
- Search for "Termux" in Google Play Store
- Install Termux (note: this version has limited functionality)

---

## 🔧 Step 2: Initial Termux Setup

1. **Open Termux**
   - Launch the Termux app from your app drawer

2. **Update package lists**
   ```bash
   pkg update
   ```

3. **Install essential packages**
   ```bash
   pkg install -y git curl wget nodejs npm
   ```

4. **Verify installations**
   ```bash
   node --version
   npm --version
   git --version
   ```

---

## 📥 Step 3: Download the Galileosky Parser

1. **Navigate to a suitable directory**
   ```bash
   cd /data/data/com.termux/files/home
   ```

2. **Clone the repository**
   ```bash
   git clone https://github.com/haryowl/galileosky-parser.git
   ```

3. **Navigate to the project directory**
   ```bash
   cd galileosky-parser
   ```

4. **Verify the files are downloaded**
   ```bash
   ls -la
   ```

---

## ⚙️ Step 4: Install Dependencies

1. **Install Node.js dependencies**
   ```bash
   npm install
   ```

2. **Wait for installation to complete**
   - This may take a few minutes depending on your internet speed

3. **Verify installation**
   ```bash
   npm list --depth=0
   ```

---

## 🔧 Step 5: Configure the Application

1. **Create configuration directory**
   ```bash
   mkdir -p config
   ```

2. **Create basic configuration file**
   ```bash
   cat > config/config.json << 'EOF'
   {
     "port": 3000,
     "host": "0.0.0.0",
     "database": {
       "path": "./data/parser.db"
     },
     "logging": {
       "level": "info",
       "file": "./logs/parser.log"
     }
   }
   EOF
   ```

3. **Create necessary directories**
   ```bash
   mkdir -p data logs output
   ```

---

## 🚀 Step 6: Start the Mobile Backend

### Option A: Use the Enhanced Backend (Recommended)
```bash
node termux-enhanced-backend.js
```

### Option B: Use the Simple Backend
```bash
node termux-simple-backend.js
```

### Option C: Use the Quick Start Script
```bash
bash termux-quick-start.sh
```

---

## 📱 Step 7: Access the Mobile Interface

1. **Find your phone's IP address**
   ```bash
   ip addr show wlan0
   ```
   Look for the `inet` address (usually starts with 192.168.x.x or 10.x.x.x)

2. **Open the mobile interface**
   - Open your phone's browser
   - Go to: `http://YOUR_IP_ADDRESS:3000`
   - Example: `http://192.168.1.100:3000`

3. **Alternative: Use localhost**
   - If accessing from the same phone: `http://localhost:3000`

---

## 🔧 Step 8: Configure Device Connection

### For Galileosky Devices:
1. **Configure device to send data to your phone**
   - Device IP: Your phone's IP address
   - Port: 3000
   - Protocol: TCP/UDP (as configured in your device)

2. **Test connection**
   - Send a test packet from your device
   - Check the mobile interface for received data

### For Testing (Optional):
1. **Use the test script**
   ```bash
   node test-mobile-parsing.js
   ```

---

## 📊 Step 9: Using the Mobile Interface

### Available Tabs:
1. **Dashboard**
   - Real-time data display
   - Connection status
   - Device information

2. **Data Tracking**
   - View historical tracking data
   - Download tracking data
   - Map visualization

3. **Data Export**
   - Export data in CSV format
   - Custom parameter selection
   - Date range filtering

4. **Settings**
   - Configure API endpoints
   - Connection settings
   - System preferences

---

## 🔄 Step 10: Auto-Start Setup (Optional)

### Create a startup script:
```bash
cat > start-mobile-server.sh << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash
cd /data/data/com.termux/files/home/galileosky-parser
node termux-enhanced-backend.js
EOF
```

### Make it executable:
```bash
chmod +x start-mobile-server.sh
```

### To start manually:
```bash
./start-mobile-server.sh
```

---

## 🛠️ Troubleshooting

### Common Issues:

1. **"Permission denied" errors**
   ```bash
   chmod +x *.sh
   chmod +x *.js
   ```

2. **Port already in use**
   ```bash
   pkill -f node
   # or change port in config.json
   ```

3. **Cannot access from other devices**
   - Check firewall settings
   - Verify IP address is correct
   - Ensure both devices are on same network

4. **Database errors**
   ```bash
   rm -rf data/parser.db
   # Restart the application
   ```

5. **Node.js not found**
   ```bash
   pkg install nodejs npm
   ```

### Reset Everything:
```bash
cd /data/data/com.termux/files/home
rm -rf galileosky-parser
git clone https://github.com/haryowl/galileosky-parser.git
cd galileosky-parser
npm install
```

---

## 📞 Support

### If you encounter issues:
1. Check the logs: `tail -f logs/parser.log`
2. Verify configuration: `cat config/config.json`
3. Test network: `ping google.com`
4. Check Node.js: `node --version`

### Useful Commands:
```bash
# View running processes
ps aux | grep node

# Check disk space
df -h

# Check memory usage
free -h

# View recent logs
tail -20 logs/parser.log
```

---

## ✅ Verification Checklist

- [ ] Termux installed and working
- [ ] Node.js and npm installed
- [ ] Repository cloned successfully
- [ ] Dependencies installed
- [ ] Configuration file created
- [ ] Backend server started
- [ ] Mobile interface accessible
- [ ] Device can connect to server
- [ ] Data is being received and parsed
- [ ] Mobile interface shows data correctly

---

## 🎉 Congratulations!

Your Galileosky parser mobile application is now set up and ready to use! 

**Next Steps:**
1. Configure your Galileosky devices to send data to your phone
2. Test the data reception and parsing
3. Explore the mobile interface features
4. Set up auto-start if needed

**Remember:** Keep your phone connected to power when running the server for extended periods, as it will consume battery power.

---

*For additional help, refer to the other documentation files in the repository or create an issue on GitHub.* 