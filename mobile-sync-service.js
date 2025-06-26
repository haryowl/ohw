const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Data storage directory
const DATA_DIR = path.join(__dirname, 'mobile-sync-data');
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Store synchronized data
let syncData = {
    devices: {},
    records: [],
    lastUpdate: null,
    deviceStates: {} // Track which devices have synced
};

// Load existing sync data
function loadSyncData() {
    const syncFile = path.join(DATA_DIR, 'sync_data.json');
    if (fs.existsSync(syncFile)) {
        try {
            const data = JSON.parse(fs.readFileSync(syncFile, 'utf8'));
            syncData = { ...syncData, ...data };
            console.log(`Loaded sync data: ${syncData.records.length} records, ${Object.keys(syncData.devices).length} devices`);
        } catch (error) {
            console.error('Error loading sync data:', error);
        }
    }
}

// Save sync data
function saveSyncData() {
    try {
        const syncFile = path.join(DATA_DIR, 'sync_data.json');
        fs.writeFileSync(syncFile, JSON.stringify(syncData, null, 2));
        console.log(`Sync data saved: ${syncData.records.length} records`);
    } catch (error) {
        console.error('Error saving sync data:', error);
    }
}

// API Routes

// Get sync status
app.get('/api/sync/status', (req, res) => {
    res.json({
        totalRecords: syncData.records.length,
        totalDevices: Object.keys(syncData.devices).length,
        lastUpdate: syncData.lastUpdate,
        deviceStates: syncData.deviceStates
    });
});

// Upload data from mobile phone
app.post('/api/sync/upload', (req, res) => {
    try {
        const { deviceId, data, devices, lastIMEI, timestamp } = req.body;
        
        if (!deviceId || !data) {
            return res.status(400).json({ error: 'Missing required data' });
        }

        console.log(`📱 Upload from device ${deviceId}: ${data.length} records`);

        // Merge devices
        if (devices) {
            syncData.devices = { ...syncData.devices, ...devices };
        }

        // Merge records (avoid duplicates by timestamp and deviceId)
        const existingRecordIds = new Set(syncData.records.map(r => `${r.timestamp}_${r.deviceId}`));
        const newRecords = data.filter(record => {
            const recordId = `${record.timestamp}_${record.deviceId}`;
            return !existingRecordIds.has(recordId);
        });

        syncData.records.push(...newRecords);
        
        // Keep only last 50,000 records to prevent memory issues
        if (syncData.records.length > 50000) {
            syncData.records = syncData.records.slice(-50000);
        }

        // Update device state
        syncData.deviceStates[deviceId] = {
            lastSync: new Date().toISOString(),
            recordsUploaded: newRecords.length,
            totalRecords: data.length
        };

        syncData.lastUpdate = new Date().toISOString();

        // Save to file
        saveSyncData();

        // Notify other devices about new data
        io.emit('dataUpdated', {
            deviceId,
            newRecords: newRecords.length,
            totalRecords: syncData.records.length
        });

        res.json({
            success: true,
            newRecords: newRecords.length,
            totalRecords: syncData.records.length,
            message: `Successfully synced ${newRecords.length} new records`
        });

    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Upload failed' });
    }
});

// Download data to mobile phone
app.post('/api/sync/download', (req, res) => {
    try {
        const { deviceId, lastSyncTime } = req.body;
        
        if (!deviceId) {
            return res.status(400).json({ error: 'Device ID required' });
        }

        console.log(`📱 Download request from device ${deviceId}`);

        // Filter records based on last sync time
        let recordsToSend = syncData.records;
        if (lastSyncTime) {
            const lastSync = new Date(lastSyncTime);
            recordsToSend = syncData.records.filter(record => 
                new Date(record.timestamp) > lastSync
            );
        }

        // Update device state
        syncData.deviceStates[deviceId] = {
            lastSync: new Date().toISOString(),
            recordsDownloaded: recordsToSend.length,
            totalRecords: syncData.records.length
        };

        res.json({
            success: true,
            records: recordsToSend,
            devices: syncData.devices,
            totalRecords: syncData.records.length,
            downloadedRecords: recordsToSend.length,
            lastUpdate: syncData.lastUpdate
        });

    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ error: 'Download failed' });
    }
});

// Get all data (for backup/export)
app.get('/api/sync/data', (req, res) => {
    res.json({
        records: syncData.records,
        devices: syncData.devices,
        lastUpdate: syncData.lastUpdate,
        deviceStates: syncData.deviceStates
    });
});

// Clear all data
app.post('/api/sync/clear', (req, res) => {
    syncData = {
        devices: {},
        records: [],
        lastUpdate: null,
        deviceStates: {}
    };
    saveSyncData();
    io.emit('dataCleared');
    res.json({ success: true, message: 'All data cleared' });
});

// Socket.IO for real-time updates
io.on('connection', (socket) => {
    console.log('📱 Mobile device connected:', socket.id);
    
    socket.on('joinDevice', (deviceId) => {
        socket.join(deviceId);
        console.log(`Device ${deviceId} joined room`);
    });
    
    socket.on('disconnect', () => {
        console.log('📱 Mobile device disconnected:', socket.id);
    });
});

// Auto-save every 5 minutes
setInterval(() => {
    if (syncData.records.length > 0) {
        saveSyncData();
    }
}, 5 * 60 * 1000);

// Load existing data on startup
loadSyncData();

const PORT = process.env.PORT || 3002;
server.listen(PORT, '0.0.0.0', () => {
    console.log('🚀 Mobile Sync Service started');
    console.log(`📡 Server running on port ${PORT}`);
    console.log(`🌐 API available at: http://0.0.0.0:${PORT}/api/`);
    console.log(`📱 WebSocket available at: ws://0.0.0.0:${PORT}`);
    console.log(`📊 Current data: ${syncData.records.length} records, ${Object.keys(syncData.devices).length} devices`);
});

module.exports = { app, server, io }; 