# 📱 Mobile IP Address Guide

## 🎉 Server is Running!

Your Galileosky Parser server is now running successfully on your mobile phone!

## 🔍 Finding Your Mobile IP Address

### Method 1: Using Termux Commands
```bash
# Get your IP address
ip addr show

# Or use this simpler command
hostname -I

# Or check network interfaces
ifconfig

# Or use the ip command
ip route get 1.1.1.1 | awk '{print $7}'
```

### Method 2: Using Android Settings
1. Go to **Settings** → **Network & Internet** → **Wi-Fi**
2. Tap on your connected network
3. Look for **IP address** (usually starts with 192.168.x.x or 10.0.x.x)

### Method 3: Using Termux Network Tools
```bash
# Install network tools
pkg install -y net-tools

# Get IP address
ifconfig wlan0 | grep "inet " | awk '{print $2}'
```

## 🌐 Access Your Server

Once you have your IP address (let's say it's `192.168.1.100`), you can access:

### From Your Phone's Browser
- **HTTP API**: http://localhost:3001
- **Status Page**: http://localhost:3001/api/status

### From Other Devices on Same Network
- **HTTP API**: http://192.168.1.100:3001
- **Status Page**: http://192.168.1.100:3001/api/status
- **WebSocket**: ws://192.168.1.100:3001

### From Internet (if configured)
- **HTTP API**: http://your-public-ip:3001
- **Status Page**: http://your-public-ip:3001/api/status

## 📡 API Endpoints

Your server provides these endpoints:

### Status Check
```bash
curl http://localhost:3001/api/status
```

### Get Devices
```bash
curl http://localhost:3001/api/devices
```

### Get Device Data
```bash
curl http://localhost:3001/api/data/device-id
```

## 🔧 Network Configuration

### Check if Ports are Open
```bash
# Check if port 3001 is listening
netstat -tlnp | grep 3001

# Check if port 3003 is listening
netstat -tlnp | grep 3003
```

### Firewall Settings
If you can't access from other devices:
1. Check if your phone's firewall is blocking the ports
2. Make sure you're on the same WiFi network
3. Try accessing from another device on the same network

## 📱 Mobile-Specific Tips

### Battery Optimization
- Add Termux to battery optimization exceptions
- Keep screen on while server is running
- Use a power bank for extended use

### Network Stability
- Use WiFi instead of mobile data for better stability
- Keep phone connected to power
- Monitor network connection

### Access from Other Devices
1. **Computer**: Open browser and go to `http://your-phone-ip:3001`
2. **Other Phone**: Open browser and go to `http://your-phone-ip:3001`
3. **Tablet**: Same as computer

## 🚀 Quick Commands

```bash
# Get your IP address quickly
hostname -I

# Test the server locally
curl http://localhost:3001/api/status

# Check server logs
# (The server is already showing logs in your terminal)
```

## 📊 Server Information

Your server is running:
- **HTTP Server**: Port 3001
- **TCP Server**: Port 3003 (for Galileosky devices)
- **WebSocket**: Port 3001 (for real-time updates)
- **Storage**: In-memory (no database)
- **Features**: TCP parsing, WebSocket, HTTP API

## 🔐 Security Note

- The server is currently accessible to anyone on your network
- For production use, consider adding authentication
- Keep your phone secure and updated

## 📞 Troubleshooting

### Can't Access from Other Devices?
1. Check if devices are on same network
2. Verify IP address is correct
3. Check firewall settings
4. Try accessing from phone's browser first

### Server Stops Working?
1. Check if Termux is still running
2. Restart the server: `./start-simple.sh`
3. Check for error messages
4. Restart Termux if needed 