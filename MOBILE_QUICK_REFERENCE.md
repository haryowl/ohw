# 📱 Galileosky Parser - Mobile Quick Reference

## 🚀 One-Command Installation

```bash
# Download and run the installer
curl -sSL https://raw.githubusercontent.com/haryowl/ohw/main/install-mobile.sh | bash
```

## 📋 Prerequisites
- **Android 7.0+** with Termux installed
- **2GB+ free storage**
- **Internet connection** (for initial setup)

## 🔧 Installation Steps

### 1. Install Termux
- **F-Droid:** https://f-droid.org/ → Search "Termux"
- **Google Play:** Search "Termux"

### 2. Run Installation
```bash
# Open Termux and run:
curl -sSL https://raw.githubusercontent.com/haryowl/ohw/main/install-mobile.sh | bash
```

### 3. Start the Server
```bash
~/galileosky-start.sh
```

### 4. Access Interface
- **Main Interface:** http://localhost:3001
- **Mobile Interface:** http://localhost:3001/mobile
- **Peer Sync:** http://localhost:3001/peer-sync

## 📱 Available Commands

| Command | Description |
|---------|-------------|
| `~/galileosky-start.sh` | Start the server |
| `~/galileosky-status.sh` | Check server status |
| `~/galileosky-stop.sh` | Stop the server |
| `~/galileosky-restart.sh` | Restart the server |

## 🌐 Server Ports

| Port | Service | Description |
|------|---------|-------------|
| 3001 | HTTP/WebSocket | Main web interface |
| 3003 | TCP | Device data reception |
| 3004 | Peer Sync | Peer-to-peer synchronization |

## 🔄 Peer-to-Peer Sync Setup

### Hotspot Phone (Primary)
1. **Enable mobile hotspot**
2. **Start server:** `~/galileosky-start.sh`
3. **Note your IP address** from status output

### Client Phone (Secondary)
1. **Connect to hotspot WiFi**
2. **Open browser:** `http://[HOTSPOT_IP]:3001/peer-sync`
3. **Click "Connect to Peer"** and enter hotspot IP

## 📊 Troubleshooting

### Common Issues

#### Server Won't Start
```bash
# Check if port is in use
netstat -tulpn | grep :3001

# Kill conflicting process
kill -9 [PID]

# Restart server
~/galileosky-restart.sh
```

#### Permission Denied
```bash
# Fix script permissions
chmod +x ~/galileosky-*.sh

# Fix project permissions
chmod -R 755 ~/galileosky-parser
```

#### Can't Access Web Interface
```bash
# Check server status
~/galileosky-status.sh

# Check logs
tail -f ~/galileosky-server.log

# Verify IP address
ip route get 1
```

#### Database Issues
```bash
# Clear database and restart
rm -f backend/data/mobile.sqlite
~/galileosky-restart.sh
```

## 📱 Mobile-Specific Features

### 1. Mobile Hotspot Mode
- **Enable hotspot** on your phone
- **Other devices connect** via WiFi
- **Static IP setup** for stable connections

### 2. Peer-to-Peer Sync
- **Real-time data sync** between devices
- **Bidirectional sync** with conflict resolution
- **Device identification** using IMEI

### 3. Mobile-Optimized Interface
- **Touch-friendly controls**
- **Responsive design**
- **Offline capability**

## 🔧 Configuration

### Environment Variables
```bash
# Edit configuration
nano backend/.env

# Key settings:
PORT=3001              # HTTP port
TCP_PORT=3003          # TCP port for devices
PEER_SYNC_PORT=3004    # Peer sync port
LOG_LEVEL=info         # Log level (error, warn, info, debug)
```

### Custom Ports
```bash
# Change ports in .env file
PORT=8080
TCP_PORT=8081
PEER_SYNC_PORT=8082

# Restart server
~/galileosky-restart.sh
```

## 📞 Support

### Logs
- **Server logs:** `~/galileosky-server.log`
- **Application logs:** `backend/logs/`

### Useful Commands
```bash
# View real-time logs
tail -f ~/galileosky-server.log

# Check disk usage
du -sh ~/galileosky-parser

# Check memory usage
ps aux | grep node

# Update to latest version
cd ~/ohw && git pull origin main
```

### GitHub Repository
- **URL:** https://github.com/haryowl/ohw
- **Issues:** Report problems on GitHub
- **Updates:** `git pull origin main`

## ✅ Quick Start Checklist

- [ ] Termux installed
- [ ] Installation script run successfully
- [ ] Server starts without errors
- [ ] Web interface accessible
- [ ] Mobile interface working
- [ ] Peer sync interface available
- [ ] TCP port 3003 open for devices
- [ ] Network URL accessible from other devices

## 🎯 Next Steps

1. **Configure tracking devices** to send data to your phone's IP
2. **Set up peer-to-peer sync** with other phones
3. **Customize interface** and settings as needed
4. **Monitor logs** for incoming data
5. **Set up auto-start** if needed

---

**🎉 Your Galileosky parser is ready to receive and process tracking data!** 