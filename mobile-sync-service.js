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
const BACKUP_DIR = path.join(__dirname, 'mobile-sync-backups');
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Store synchronized data
let syncData = {
    devices: {},
    records: [],
    lastUpdate: null,
    deviceStates: {} // Track which devices have synced
};

// Configuration
const MAX_RECORDS = 200000; // Maximum records to keep in memory
const BACKUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
const MAX_BACKUPS = 10; // Keep last 10 backups

// Load existing sync data with enhanced error handling
function loadSyncData() {
    const syncFile = path.join(DATA_DIR, 'sync_data.json');
    const backupFiles = getBackupFiles();
    
    // Try to load from main file first
    if (fs.existsSync(syncFile)) {
        try {
            const data = JSON.parse(fs.readFileSync(syncFile, 'utf8'));
            syncData = { ...syncData, ...data };
            console.log(`✅ Loaded sync data: ${syncData.records.length} records, ${Object.keys(syncData.devices).length} devices`);
            return;
        } catch (error) {
            console.error('❌ Error loading main sync data:', error.message);
        }
    }
    
    // Try to load from latest backup if main file failed
    if (backupFiles.length > 0) {
        const latestBackup = backupFiles[backupFiles.length - 1];
        try {
            const data = JSON.parse(fs.readFileSync(latestBackup, 'utf8'));
            syncData = { ...syncData, ...data };
            console.log(`✅ Loaded sync data from backup: ${syncData.records.length} records, ${Object.keys(syncData.devices).length} devices`);
            
            // Restore main file from backup
            fs.copyFileSync(latestBackup, syncFile);
            console.log('✅ Restored main data file from backup');
            return;
        } catch (error) {
            console.error('❌ Error loading from backup:', error.message);
        }
    }
    
    // If all else fails, start with empty data
    console.log('⚠️ Starting with empty sync data');
    syncData = {
        devices: {},
        records: [],
        lastUpdate: null,
        deviceStates: {}
    };
}

// Enhanced save sync data with backup
function saveSyncData() {
    try {
        const syncFile = path.join(DATA_DIR, 'sync_data.json');
        
        // Create backup before saving
        createBackup();
        
        // Save main data
        fs.writeFileSync(syncFile, JSON.stringify(syncData, null, 2));
        console.log(`✅ Sync data saved: ${syncData.records.length} records`);
        
        // Clean up old backups
        cleanupOldBackups();
        
    } catch (error) {
        console.error('❌ Error saving sync data:', error);
    }
}

// Create backup of current data
function createBackup() {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFile = path.join(BACKUP_DIR, `sync_data_backup_${timestamp}.json`);
        fs.writeFileSync(backupFile, JSON.stringify(syncData, null, 2));
        console.log(`💾 Backup created: ${backupFile}`);
    } catch (error) {
        console.error('❌ Error creating backup:', error);
    }
}

// Get list of backup files
function getBackupFiles() {
    try {
        const files = fs.readdirSync(BACKUP_DIR);
        return files
            .filter(file => file.startsWith('sync_data_backup_') && file.endsWith('.json'))
            .map(file => path.join(BACKUP_DIR, file))
            .sort();
    } catch (error) {
        console.error('❌ Error reading backup directory:', error);
        return [];
    }
}

// Clean up old backups
function cleanupOldBackups() {
    try {
        const backupFiles = getBackupFiles();
        if (backupFiles.length > MAX_BACKUPS) {
            const filesToDelete = backupFiles.slice(0, backupFiles.length - MAX_BACKUPS);
            filesToDelete.forEach(file => {
                fs.unlinkSync(file);
                console.log(`🗑️ Deleted old backup: ${file}`);
            });
        }
    } catch (error) {
        console.error('❌ Error cleaning up backups:', error);
    }
}

// Data recovery function
function recoverData() {
    console.log('🔧 Attempting data recovery...');
    
    const backupFiles = getBackupFiles();
    if (backupFiles.length === 0) {
        console.log('⚠️ No backup files found for recovery');
        return false;
    }
    
    // Try to recover from the most recent backup
    for (let i = backupFiles.length - 1; i >= 0; i--) {
        try {
            const backupFile = backupFiles[i];
            const data = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
            
            if (data.records && Array.isArray(data.records)) {
                syncData = { ...syncData, ...data };
                console.log(`✅ Data recovered from backup: ${syncData.records.length} records`);
                
                // Save recovered data to main file
                const syncFile = path.join(DATA_DIR, 'sync_data.json');
                fs.writeFileSync(syncFile, JSON.stringify(syncData, null, 2));
                console.log('✅ Recovered data saved to main file');
                return true;
            }
        } catch (error) {
            console.error(`❌ Failed to recover from backup ${i}:`, error.message);
        }
    }
    
    console.log('❌ Data recovery failed');
    return false;
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

        // Log current state before processing
        console.log(`📊 Before processing: ${syncData.records.length} existing records, ${MAX_RECORDS} max allowed`);

        // Merge records (avoid duplicates by timestamp and deviceId)
        const existingRecordIds = new Set(syncData.records.map(r => `${r.timestamp}_${r.deviceId}`));
        const newRecords = data.filter(record => {
            const recordId = `${record.timestamp}_${record.deviceId}`;
            return !existingRecordIds.has(recordId);
        });

        console.log(`📊 After deduplication: ${newRecords.length} new unique records`);

        syncData.records.push(...newRecords);
        
        console.log(`📊 After adding new records: ${syncData.records.length} total records`);
        
        // Keep only last MAX_RECORDS to prevent memory issues
        if (syncData.records.length > MAX_RECORDS) {
            const removedCount = syncData.records.length - MAX_RECORDS;
            syncData.records = syncData.records.slice(-MAX_RECORDS);
            console.log(`⚠️ Truncated ${removedCount} old records to stay within ${MAX_RECORDS} limit`);
        }

        console.log(`📊 Final record count: ${syncData.records.length}/${MAX_RECORDS}`);

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
    try {
        // Create backup before clearing
        createBackup();
        
        syncData = {
            devices: {},
            records: [],
            lastUpdate: null,
            deviceStates: {}
        };
        saveSyncData();
        io.emit('dataCleared');
        res.json({ success: true, message: 'All data cleared (backup created)' });
    } catch (error) {
        console.error('❌ Error clearing data:', error);
        res.status(500).json({ error: 'Failed to clear data' });
    }
});

// Recover data from backup
app.post('/api/sync/recover', (req, res) => {
    try {
        const recovered = recoverData();
        if (recovered) {
            io.emit('dataRecovered', {
                totalRecords: syncData.records.length,
                totalDevices: Object.keys(syncData.devices).length
            });
            res.json({ 
                success: true, 
                message: 'Data recovered successfully',
                totalRecords: syncData.records.length,
                totalDevices: Object.keys(syncData.devices).length
            });
        } else {
            res.status(404).json({ error: 'No backup data found to recover' });
        }
    } catch (error) {
        console.error('❌ Error recovering data:', error);
        res.status(500).json({ error: 'Failed to recover data' });
    }
});

// Get backup information
app.get('/api/sync/backups', (req, res) => {
    try {
        const backupFiles = getBackupFiles();
        const backups = backupFiles.map(file => {
            const stats = fs.statSync(file);
            return {
                filename: path.basename(file),
                size: stats.size,
                created: stats.birthtime,
                modified: stats.mtime
            };
        });
        
        res.json({
            backups: backups,
            totalBackups: backups.length,
            maxBackups: MAX_BACKUPS
        });
    } catch (error) {
        console.error('❌ Error getting backup info:', error);
        res.status(500).json({ error: 'Failed to get backup information' });
    }
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