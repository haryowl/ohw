# 📱 Peer-to-Peer Sync - Galileosky Mobile Application

## 🚀 Overview

The Peer-to-Peer Sync feature allows mobile devices running the Galileosky parser to sync data directly with each other without requiring an internet connection. This is perfect for field operations where multiple devices need to share tracking data.

## ✨ Features

- **🔄 Real-time Sync**: Sync data between devices in real-time
- **📡 No Internet Required**: Works over local WiFi or direct connection
- **📱 Mobile Optimized**: Designed for mobile devices and Termux
- **💾 Data Persistence**: Automatically saves synced data to local storage
- **🌐 Web Interface**: Easy-to-use web UI for managing sync operations
- **🔍 Peer Discovery**: Find and connect to other devices on the network

## 🏗️ Architecture

### Components

1. **MobilePeerSync Class** (`mobile-peer-sync.js`)
   - Manages peer sync operations
   - Integrates with mobile backend's in-memory data structure
   - Handles data persistence

2. **PeerToPeerSync Service** (`backend/src/services/peerToPeerSync.js`)
   - Core peer sync functionality
   - HTTP server for peer communication
   - Data merging and conflict resolution

3. **Mobile Backend** (`termux-peer-sync-backend.js`)
   - Enhanced mobile backend with peer sync integration
   - TCP server for device connections
   - HTTP server for web interface

4. **Web Interface** (`mobile-peer-sync-ui.html`)
   - Mobile-optimized web UI
   - Real-time status updates
   - Easy peer connection management

## 🚀 Quick Start

### 1. Start the Mobile Peer Sync Backend

```bash
# Make the script executable
chmod +x start-mobile-peer-sync.sh

# Start the backend
./start-mobile-peer-sync.sh
```

### 2. Access the Web Interface

Open your browser and navigate to:
```
http://localhost:3001/mobile-peer-sync-ui.html
```

### 3. Start Peer Server

1. Click "▶️ Start Server" to make your device available for connections
2. Note the connection URL displayed
3. Share this URL with other devices

### 4. Connect to Another Device

1. Enter the peer device's URL in the "Peer Device URL" field
2. Click "🔍 Check Peer" to verify the connection
3. Click "🔄 Sync" to synchronize data

## 📋 API Endpoints

### Peer Sync API (`/api/peer/`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/status` | GET | Get peer sync status |
| `/start` | POST | Start peer server |
| `/stop` | POST | Stop peer server |
| `/connect` | POST | Connect to peer and sync |
| `/export` | GET | Export data for peer |
| `/import` | POST | Import data from peer |
| `/discovery` | GET | Get peer discovery info |

### Direct Peer Endpoints (`/peer/`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/peer/status` | GET | Get device status |
| `/peer/export` | GET | Export data to peer |
| `/peer/import` | POST | Import data from peer |
| `/peer/sync` | POST | Full sync (export + import) |

## 🔧 Configuration

### Environment Variables

```bash
export TCP_PORT=3003      # TCP server port for device connections
export HTTP_PORT=3001     # HTTP server port for web interface
export NODE_ENV=production # Environment mode
```

### Data Storage

Data is stored in the following files:
- `data/parsed_data.json` - Parsed tracking data
- `data/devices.json` - Device information
- `data/last_imei.json` - Last known IMEI

## 📱 Usage Examples

### Basic Peer Sync

```javascript
// Initialize mobile peer sync
const mobilePeerSync = new MobilePeerSync('device-001', 3001);
mobilePeerSync.initialize(parsedData, devices, lastIMEI);

// Start peer server
mobilePeerSync.startPeerServer();

// Connect to peer
const result = await mobilePeerSync.connectToPeer('http://192.168.1.100:3001');
console.log(`Synced ${result.syncResult.newRecords} new records`);
```

### Web Interface Usage

1. **Server Mode**: Make your device available for other devices to connect
2. **Client Mode**: Connect to another device to sync data
3. **Quick Actions**: Export/import data, auto-sync
4. **Sync Log**: Monitor sync operations and troubleshoot issues

## 🔄 Sync Process

### 1. Peer Discovery
- Devices broadcast their presence on the network
- Each device has a unique device ID
- Connection URLs are shared between devices

### 2. Data Exchange
- Source device exports its data (records, devices, last IMEI)
- Target device receives and merges the data
- Duplicate records are automatically filtered
- Data is sorted by timestamp

### 3. Conflict Resolution
- Records are uniquely identified by `timestamp + deviceId`
- Newer records take precedence
- No data loss during sync

### 4. Data Persistence
- Synced data is automatically saved to local storage
- Data is preserved across device restarts
- Backup files are created for safety

## 🛠️ Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   # Check what's using the port
   netstat -tulpn | grep :3001
   
   # Kill the process or change the port
   export HTTP_PORT=3002
   ```

2. **Peer Not Reachable**
   - Check if both devices are on the same network
   - Verify firewall settings
   - Ensure peer server is running

3. **Sync Fails**
   - Check network connectivity
   - Verify peer URL format
   - Check sync log for error details

### Debug Mode

Enable debug logging by setting:
```bash
export DEBUG=peer-sync:*
```

## 📊 Performance

### Data Limits
- Maximum 10,000 records per device
- Automatic cleanup of old records
- Efficient data merging algorithms

### Network Usage
- Minimal bandwidth usage
- Compressed data transfer
- Connection timeouts for reliability

## 🔒 Security

### Data Protection
- Local data storage only
- No data sent to external servers
- Secure peer-to-peer communication

### Network Security
- CORS headers for cross-device requests
- Input validation and sanitization
- Error handling for malicious data

## 📈 Monitoring

### Sync Statistics
- Total records synced
- Number of devices connected
- Last sync timestamp
- Sync success/failure rates

### Health Checks
- Server status monitoring
- Connection health checks
- Data integrity verification

## 🚀 Advanced Features

### Auto Sync
- Automatic sync every minute
- Configurable sync intervals
- Background sync operations

### Data Export/Import
- JSON format export
- File-based data transfer
- Backup and restore functionality

### Multi-Device Sync
- Support for multiple peer connections
- Concurrent sync operations
- Load balancing across devices

## 📝 Development

### Adding New Features

1. **Extend MobilePeerSync Class**
   ```javascript
   class MobilePeerSync {
       // Add new methods here
       async customSync() {
           // Custom sync logic
       }
   }
   ```

2. **Update Web Interface**
   - Add new UI elements
   - Implement JavaScript functions
   - Update API calls

3. **Test Integration**
   - Test with multiple devices
   - Verify data consistency
   - Check performance impact

### Contributing

1. Fork the repository
2. Create a feature branch
3. Implement your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For issues and questions:
- Check the troubleshooting section
- Review the sync log for errors
- Test with a simple peer connection first
- Ensure all dependencies are installed

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Happy Syncing! 📱🔄📱** 