const express = require('express');
const router = express.Router();
const PeerToPeerSync = require('../services/peerToPeerSync');
const logger = require('../utils/logger');

// Global peer sync instance
let peerSync = null;

// Initialize peer sync with data references
function initializePeerSync(parsedData, devices, lastIMEI) {
    if (!peerSync) {
        const deviceId = `mobile-${Math.random().toString(36).substr(2, 9)}`;
        peerSync = new PeerToPeerSync(deviceId, 3001);
        logger.info('Peer sync initialized', { deviceId });
    }
    return peerSync;
}

// Get peer sync status
router.get('/status', (req, res) => {
    try {
        // Get data from global scope (these should be passed from the mobile backend)
        const parsedData = global.parsedData || [];
        const devices = global.devices || new Map();
        const lastIMEI = global.lastIMEI || null;

        if (!peerSync) {
            return res.json({
                deviceId: 'not-initialized',
                isServerMode: false,
                port: 3001,
                lastSyncTime: null,
                syncInProgress: false,
                deviceIP: 'unknown',
                totalRecords: parsedData.length,
                totalDevices: devices.size,
                lastIMEI: lastIMEI
            });
        }

        const status = peerSync.getStatus();
        status.totalRecords = parsedData.length;
        status.totalDevices = devices.size;
        status.lastIMEI = lastIMEI;
        
        res.json(status);
    } catch (error) {
        logger.error('Error getting peer status:', error);
        res.status(500).json({ error: 'Failed to get peer status' });
    }
});

// Start peer server
router.post('/start', (req, res) => {
    try {
        const { deviceId } = req.body;
        
        // Get data references from global scope
        const parsedData = global.parsedData || [];
        const devices = global.devices || new Map();
        const lastIMEI = global.lastIMEI || null;

        const peerSyncInstance = initializePeerSync(parsedData, devices, lastIMEI);
        
        if (deviceId) {
            peerSyncInstance.deviceId = deviceId;
        }

        peerSyncInstance.startPeerServer(parsedData, devices, lastIMEI);
        
        res.json({
            success: true,
            deviceId: peerSyncInstance.deviceId,
            port: peerSyncInstance.port,
            deviceIP: peerSyncInstance.getDeviceIP(),
            message: 'Peer server started successfully'
        });
    } catch (error) {
        logger.error('Error starting peer server:', error);
        res.status(500).json({ error: 'Failed to start peer server' });
    }
});

// Stop peer server
router.post('/stop', (req, res) => {
    try {
        if (peerSync) {
            peerSync.stopPeerServer();
            res.json({ success: true, message: 'Peer server stopped' });
        } else {
            res.json({ success: true, message: 'No peer server running' });
        }
    } catch (error) {
        logger.error('Error stopping peer server:', error);
        res.status(500).json({ error: 'Failed to stop peer server' });
    }
});

// Connect to peer and sync
router.post('/connect', async (req, res) => {
    try {
        const { peerUrl } = req.body;
        
        if (!peerUrl) {
            return res.status(400).json({ error: 'Peer URL is required' });
        }

        if (!peerSync) {
            return res.status(400).json({ error: 'Peer sync not initialized' });
        }

        // Get data references from global scope
        const parsedData = global.parsedData || [];
        const devices = global.devices || new Map();
        const lastIMEI = global.lastIMEI || null;

        const result = await peerSync.connectToPeer(peerUrl, parsedData, devices, lastIMEI);
        
        res.json({
            success: true,
            newRecords: result.syncResult.newRecords,
            totalRecords: parsedData.length,
            message: `Sync completed: ${result.syncResult.newRecords} new records added`
        });
    } catch (error) {
        logger.error('Error connecting to peer:', error);
        res.status(500).json({ error: error.message || 'Failed to connect to peer' });
    }
});

// Export data to peer
router.get('/export', (req, res) => {
    try {
        const parsedData = global.parsedData || [];
        const devices = global.devices || new Map();
        const lastIMEI = global.lastIMEI || null;

        const exportData = {
            deviceId: peerSync ? peerSync.deviceId : 'unknown',
            records: parsedData,
            devices: Object.fromEntries(devices),
            lastIMEI: lastIMEI,
            exportTime: new Date().toISOString()
        };

        res.json(exportData);
    } catch (error) {
        logger.error('Error exporting data:', error);
        res.status(500).json({ error: 'Failed to export data' });
    }
});

// Import data from peer
router.post('/import', (req, res) => {
    try {
        const importData = req.body;
        
        if (!importData || !importData.records) {
            return res.status(400).json({ error: 'Invalid import data' });
        }

        const parsedData = global.parsedData || [];
        const devices = global.devices || new Map();

        if (peerSync) {
            const result = peerSync.mergePeerData(parsedData, devices, importData);
            
            res.json({
                success: true,
                newRecords: result.newRecords,
                totalRecords: parsedData.length,
                message: `Imported ${result.newRecords} new records from peer`
            });
        } else {
            res.status(400).json({ error: 'Peer sync not initialized' });
        }
    } catch (error) {
        logger.error('Error importing data:', error);
        res.status(500).json({ error: 'Failed to import data' });
    }
});

// Get peer discovery info
router.get('/discovery', (req, res) => {
    try {
        const deviceIP = peerSync ? peerSync.getDeviceIP() : 'unknown';
        const port = peerSync ? peerSync.port : 3001;
        const parsedData = global.parsedData || [];
        const devices = global.devices || new Map();
        
        res.json({
            deviceId: peerSync ? peerSync.deviceId : 'unknown',
            deviceIP: deviceIP,
            port: port,
            connectionUrl: `http://${deviceIP}:${port}/peer/sync`,
            isServerMode: peerSync ? peerSync.isServerMode : false,
            totalRecords: parsedData.length,
            totalDevices: devices.size,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('Error getting discovery info:', error);
        res.status(500).json({ error: 'Failed to get discovery info' });
    }
});

module.exports = router; 