# 📱 Mobile Peer-to-Peer Sync Testing Guide

## 🎯 Overview
This guide will walk you through testing the mobile peer-to-peer sync functionality step by step. The system allows multiple mobile devices to sync Galileosky tracking data without requiring internet connectivity.

## 🏗️ System Architecture
- **Sync Service**: Runs on port 3001 (HTTP) and 3003 (TCP)
- **Web Interface**: Accessible at `http://[IP]:3001/mobile-peer-sync-ui.html`
- **Data Storage**: Local JSON files in `data/` directory
- **Peer Communication**: Direct HTTP requests between devices

## 🚀 Step-by-Step Testing Process

### Phase 1: Single Device Setup

#### Step 1: Start the Mobile Peer Sync Backend
```bash
# Navigate to your project directory
cd /path/to/gali-parse

# Make the startup script executable
chmod +x start-mobile-peer-sync.sh

# Start the mobile peer sync backend
./start-mobile-peer-sync.sh
```

**Expected Output:**
```
🚀 ========================================
🚀 STARTING MOBILE PEER SYNC BACKEND
🚀 ========================================

📦 Installing dependencies...
📁 Creating directories...
🔧 Configuration:
   IP Address: 192.168.1.100
   TCP Port: 3003
   HTTP Port: 3001
   Environment: production

🚀 Starting mobile peer sync backend...
📱 Peer sync will be available on port 3001
🌐 Web interface: http://192.168.1.100:3001/mobile-peer-sync-ui.html
📡 TCP server: 192.168.1.100:3003
```

#### Step 2: Access the Web Interface
1. Open your browser
2. Navigate to: `http://[YOUR_IP]:3001/mobile-peer-sync-ui.html`
3. You should see the mobile peer sync interface

#### Step 3: Verify Initial Status
1. Check the "Server Status" section
2. Verify "Server Running" shows ✅
3. Check "Connection URL" displays your device's IP and port
4. Note the "Device ID" (should be auto-generated)

### Phase 2: Data Preparation

#### Step 4: Generate Test Data
```bash
# Create test data directory
mkdir -p data

# Create sample parsed data
cat > data/parsed_data.json << 'EOF'
[
  {
    "timestamp": "2025-01-27T10:00:00.000Z",
    "deviceId": "TEST001",
    "latitude": 40.7128,
    "longitude": -74.0060,
    "altitude": 10,
    "speed": 25,
    "course": 180,
    "satellites": 8,
    "hdop": 1.2,
    "battery": 85
  },
  {
    "timestamp": "2025-01-27T10:05:00.000Z",
    "deviceId": "TEST001",
    "latitude": 40.7130,
    "longitude": -74.0062,
    "altitude": 12,
    "speed": 30,
    "course": 185,
    "satellites": 9,
    "hdop": 1.1,
    "battery": 84
  }
]
EOF

# Create sample devices data
cat > data/devices.json << 'EOF'
{
  "TEST001": {
    "imei": "123456789012345",
    "name": "Test Device 1",
    "lastSeen": "2025-01-27T10:05:00.000Z",
    "totalRecords": 2
  }
}
EOF

# Create sample last IMEI data
cat > data/last_imei.json << 'EOF'
{
  "lastIMEI": "123456789012345",
  "timestamp": "2025-01-27T10:05:00.000Z"
}
EOF
```

#### Step 5: Verify Data Loading
1. In the web interface, click "📊 Load Data"
2. Check the "Data Status" section shows:
   - Records: 2
   - Devices: 1
   - Last IMEI: 123456789012345

### Phase 3: Peer Server Testing

#### Step 6: Start Peer Server
1. In the web interface, click "▶️ Start Server"
2. Verify status changes to "Server Active"
3. Note the connection URL (e.g., `http://192.168.1.100:3001`)

#### Step 7: Test Server Endpoints
```bash
# Test server status
curl http://localhost:3001/api/peer/status

# Expected response:
{
  "serverRunning": true,
  "deviceId": "device-xxx",
  "connectionUrl": "http://192.168.1.100:3001",
  "dataStats": {
    "records": 2,
    "devices": 1
  }
}

# Test data export
curl http://localhost:3001/peer/export

# Expected response:
{
  "success": true,
  "data": {
    "records": [...],
    "devices": {...},
    "lastIMEI": "..."
  }
}
```

### Phase 4: Multi-Device Testing

#### Step 8: Setup Second Device (Simulation)
Since you're testing on one device, we'll simulate a second device by:
1. Using a different port
2. Creating separate test data

```bash
# Create second device simulation
mkdir -p test-device-2/data

# Create different test data for second device
cat > test-device-2/data/parsed_data.json << 'EOF'
[
  {
    "timestamp": "2025-01-27T10:10:00.000Z",
    "deviceId": "TEST002",
    "latitude": 40.7140,
    "longitude": -74.0065,
    "altitude": 15,
    "speed": 35,
    "course": 190,
    "satellites": 10,
    "hdop": 1.0,
    "battery": 90
  },
  {
    "timestamp": "2025-01-27T10:15:00.000Z",
    "deviceId": "TEST002",
    "latitude": 40.7145,
    "longitude": -74.0070,
    "altitude": 18,
    "speed": 40,
    "course": 195,
    "satellites": 11,
    "hdop": 0.9,
    "battery": 89
  }
]
EOF

cat > test-device-2/data/devices.json << 'EOF'
{
  "TEST002": {
    "imei": "987654321098765",
    "name": "Test Device 2",
    "lastSeen": "2025-01-27T10:15:00.000Z",
    "totalRecords": 2
  }
}
EOF

cat > test-device-2/data/last_imei.json << 'EOF'
{
  "lastIMEI": "987654321098765",
  "timestamp": "2025-01-27T10:15:00.000Z"
}
EOF
```

#### Step 9: Start Second Device (Different Port)
```bash
# Set different ports for second device
export HTTP_PORT=3002
export TCP_PORT=3004

# Start second device backend
cd test-device-2
node ../termux-peer-sync-backend.js
```

#### Step 10: Test Peer Connection
1. Open second device web interface: `http://localhost:3002/mobile-peer-sync-ui.html`
2. Load the test data for device 2
3. Start the peer server on device 2
4. In device 1's interface, enter device 2's URL: `http://localhost:3002`
5. Click "🔍 Check Peer" to verify connection
6. Click "🔄 Sync" to synchronize data

#### Step 11: Verify Sync Results
After sync, both devices should have:
- **Device 1**: 4 records (2 original + 2 from device 2)
- **Device 2**: 4 records (2 original + 2 from device 1)
- **Combined devices**: TEST001 and TEST002

### Phase 5: Advanced Testing

#### Step 12: Test Data Conflicts
```bash
# Create conflicting data (same timestamp, different values)
cat > data/conflict_test.json << 'EOF'
[
  {
    "timestamp": "2025-01-27T10:20:00.000Z",
    "deviceId": "TEST001",
    "latitude": 40.7150,
    "longitude": -74.0075,
    "altitude": 20,
    "speed": 45,
    "course": 200,
    "satellites": 12,
    "hdop": 0.8,
    "battery": 88
  }
]
EOF
```

1. Load conflict test data on device 1
2. Sync with device 2
3. Verify conflict resolution (newer data should prevail)

#### Step 13: Test Auto-Sync
1. Enable auto-sync in the web interface
2. Set sync interval to 30 seconds
3. Make changes to data on one device
4. Wait for automatic sync to occur
5. Verify changes appear on the other device

#### Step 14: Test Network Disconnection
1. Disconnect network temporarily
2. Make changes to data
3. Reconnect network
4. Verify sync resumes automatically
5. Check sync log for reconnection messages

### Phase 6: Performance Testing

#### Step 15: Test Large Data Sets
```bash
# Generate larger test dataset
node -e "
const fs = require('fs');
const data = [];
for(let i = 0; i < 1000; i++) {
  data.push({
    timestamp: new Date(Date.now() + i * 60000).toISOString(),
    deviceId: 'PERF001',
    latitude: 40.7128 + (i * 0.0001),
    longitude: -74.0060 + (i * 0.0001),
    altitude: 10 + i,
    speed: 25 + (i % 20),
    course: 180 + (i % 360),
    satellites: 8 + (i % 4),
    hdop: 1.0 + (i % 10) / 10,
    battery: 85 - (i % 20)
  });
}
fs.writeFileSync('data/large_dataset.json', JSON.stringify(data, null, 2));
"
```

1. Load large dataset
2. Test sync performance
3. Monitor memory usage
4. Check sync completion time

### Phase 7: Error Handling Testing

#### Step 16: Test Invalid Peer URL
1. Enter invalid URL in peer connection field
2. Click "🔍 Check Peer"
3. Verify error message appears
4. Check sync log for error details

#### Step 17: Test Corrupted Data
```bash
# Create corrupted data file
echo "invalid json data" > data/corrupted.json
```

1. Try to load corrupted data
2. Verify error handling
3. Check sync log for error messages

#### Step 18: Test Port Conflicts
1. Try to start server on already used port
2. Verify error handling
3. Test automatic port selection

## 📊 Testing Checklist

### ✅ Basic Functionality
- [ ] Server starts successfully
- [ ] Web interface loads
- [ ] Data loads correctly
- [ ] Peer server starts
- [ ] Peer connection works
- [ ] Data syncs between devices
- [ ] Sync log shows operations

### ✅ Data Integrity
- [ ] No data loss during sync
- [ ] Duplicate records filtered
- [ ] Conflict resolution works
- [ ] Data persistence maintained
- [ ] Backup files created

### ✅ Network Handling
- [ ] Works without internet
- [ ] Handles network disconnection
- [ ] Auto-reconnection works
- [ ] Timeout handling works
- [ ] Error messages clear

### ✅ Performance
- [ ] Large datasets handled
- [ ] Memory usage reasonable
- [ ] Sync speed acceptable
- [ ] UI responsive during sync
- [ ] No memory leaks

### ✅ Error Handling
- [ ] Invalid URLs handled
- [ ] Corrupted data handled
- [ ] Port conflicts handled
- [ ] Network errors handled
- [ ] Clear error messages

## 🐛 Troubleshooting Common Issues

### Issue: "Server won't start"
**Solution:**
```bash
# Check if port is in use
netstat -tulpn | grep :3001

# Kill existing process or change port
export HTTP_PORT=3002
```

### Issue: "Peer connection failed"
**Solution:**
- Verify both devices on same network
- Check firewall settings
- Ensure peer server is running
- Verify URL format

### Issue: "Sync not working"
**Solution:**
- Check sync log for errors
- Verify data format
- Check network connectivity
- Restart both devices

### Issue: "Data not persisting"
**Solution:**
- Check file permissions
- Verify data directory exists
- Check disk space
- Review error logs

## 📈 Performance Benchmarks

### Expected Performance
- **Small datasets (< 100 records)**: Sync in < 5 seconds
- **Medium datasets (100-1000 records)**: Sync in < 30 seconds
- **Large datasets (1000+ records)**: Sync in < 2 minutes
- **Memory usage**: < 100MB for 10,000 records
- **Network usage**: < 1MB per 1000 records

### Monitoring Commands
```bash
# Monitor memory usage
watch -n 1 'ps aux | grep node'

# Monitor network usage
iftop -i wlan0

# Monitor disk usage
du -sh data/
```

## 🎉 Success Criteria

Your mobile peer-to-peer sync is working correctly if:

1. ✅ Two devices can sync data without internet
2. ✅ No data loss occurs during sync
3. ✅ Sync completes within expected timeframes
4. ✅ Error handling works properly
5. ✅ Data persists across device restarts
6. ✅ Web interface is responsive and informative
7. ✅ Sync log provides clear operation details

## 📞 Next Steps

After successful testing:

1. **Deploy to real devices**: Test on actual mobile devices
2. **Network testing**: Test on different network configurations
3. **Load testing**: Test with multiple devices simultaneously
4. **Security review**: Implement authentication if needed
5. **Documentation**: Update user guides with testing results

---

**Happy Testing! 🚀**

For additional support, check the logs in the `logs/` directory or refer to the main README.md file.

## 🚀 Quick Start Commands

To begin testing immediately:

```bash
# 1. Start the mobile peer sync backend
chmod +x start-mobile-peer-sync.sh
./start-mobile-peer-sync.sh

# 2. Access web interface
# Open: http://localhost:3001/mobile-peer-sync-ui.html

# 3. For second device (simulation), use port 3002:
export HTTP_PORT=3002
export TCP_PORT=3004
node termux-peer-sync-backend.js
# Then access: http://localhost:3002/mobile-peer-sync-ui.html

# 4. Generate test data
mkdir -p data
# (Use the sample data commands from the guide)
``` 