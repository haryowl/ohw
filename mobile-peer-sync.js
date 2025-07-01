// ========================================
// MOBILE PEER-TO-PEER SYNC SERVICE
// ========================================
// Integrates with mobile backend's in-memory data structure
// Last updated: 2025-01-27
// ========================================

const PeerToPeerSync = require('./backend/src/services/peerToPeerSync');
const fs = require('fs');
const path = require('path');

class MobilePeerSync {
    constructor(deviceId, port = 3001) {
        this.deviceId = deviceId;
        this.port = port;
        this.peerSync = new PeerToPeerSync(deviceId, port);
        this.isInitialized = false;
        
        // Data directories
        this.dataDir = path.join(__dirname, 'data');
        this.PARSED_DATA_FILE = path.join(this.dataDir, 'parsed_data.json');
        this.DEVICES_FILE = path.join(this.dataDir, 'devices.json');
        this.LAST_IMEI_FILE = path.join(this.dataDir, 'last_imei.json');
        
        // Ensure data directory exists
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
    }

    // Initialize with mobile backend data
    initialize(parsedData, devices, lastIMEI) {
        if (this.isInitialized) {
            console.log('📱 Mobile peer sync already initialized');
            return;
        }

        // Set global data references for the peer sync service
        global.parsedData = parsedData;
        global.devices = devices;
        global.lastIMEI = lastIMEI;

        this.isInitialized = true;
        console.log(`📱 Mobile peer sync initialized with ${parsedData.length} records, ${devices.size} devices`);
    }

    // Start peer server
    startPeerServer() {
        if (!this.isInitialized) {
            throw new Error('Mobile peer sync not initialized. Call initialize() first.');
        }

        this.peerSync.startPeerServer(global.parsedData, global.devices, global.lastIMEI);
        console.log(`📱 Mobile peer server started on port ${this.port}`);
    }

    // Stop peer server
    stopPeerServer() {
        this.peerSync.stopPeerServer();
        console.log('📱 Mobile peer server stopped');
    }

    // Connect to peer and sync
    async connectToPeer(peerUrl) {
        if (!this.isInitialized) {
            throw new Error('Mobile peer sync not initialized. Call initialize() first.');
        }

        const result = await this.peerSync.connectToPeer(peerUrl, global.parsedData, global.devices, global.lastIMEI);
        
        // Save data after successful sync
        this.saveData();
        
        return result;
    }

    // Get sync status
    getStatus() {
        const status = this.peerSync.getStatus();
        status.totalRecords = global.parsedData.length;
        status.totalDevices = global.devices.size;
        status.lastIMEI = global.lastIMEI;
        return status;
    }

    // Save data to files (mobile backend style)
    saveData() {
        try {
            // Save parsed data - save ALL records for peer sync
            const dataToSave = global.parsedData; // Save ALL records
            fs.writeFileSync(this.PARSED_DATA_FILE, JSON.stringify(dataToSave, null, 2));
            
            // Save devices data
            const devicesData = Object.fromEntries(global.devices);
            fs.writeFileSync(this.DEVICES_FILE, JSON.stringify(devicesData, null, 2));
            
            // Save last IMEI
            if (global.lastIMEI) {
                fs.writeFileSync(this.LAST_IMEI_FILE, JSON.stringify({ lastIMEI: global.lastIMEI }, null, 2));
            }
            
            console.log(`📱 Data saved: ${dataToSave.length} records, ${global.devices.size} devices`);
        } catch (error) {
            console.error('📱 Error saving data:', error.message);
        }
    }

    // Load data from files (mobile backend style)
    loadData() {
        try {
            // Load parsed data
            if (fs.existsSync(this.PARSED_DATA_FILE)) {
                const data = JSON.parse(fs.readFileSync(this.PARSED_DATA_FILE, 'utf8'));
                global.parsedData = data;
                console.log(`📱 Loaded ${global.parsedData.length} records from storage`);
            }
            
            // Load devices data
            if (fs.existsSync(this.DEVICES_FILE)) {
                const devicesData = JSON.parse(fs.readFileSync(this.DEVICES_FILE, 'utf8'));
                global.devices = new Map(Object.entries(devicesData));
                console.log(`📱 Loaded ${global.devices.size} devices from storage`);
            }
            
            // Load last IMEI
            if (fs.existsSync(this.LAST_IMEI_FILE)) {
                const imeiData = JSON.parse(fs.readFileSync(this.LAST_IMEI_FILE, 'utf8'));
                global.lastIMEI = imeiData.lastIMEI;
                console.log(`📱 Loaded last IMEI: ${global.lastIMEI}`);
            }
        } catch (error) {
            console.error('📱 Error loading data:', error.message);
            // If loading fails, start with empty data
            global.parsedData = [];
            global.devices = new Map();
            global.lastIMEI = null;
        }
    }

    // Get device IP for peer connection
    getDeviceIP() {
        return this.peerSync.getDeviceIP();
    }

    // Export data for peer sync
    exportData() {
        return {
            deviceId: this.deviceId,
            records: global.parsedData,
            devices: Object.fromEntries(global.devices),
            lastIMEI: global.lastIMEI,
            exportTime: new Date().toISOString()
        };
    }

    // Import data from peer
    importData(importData) {
        if (!importData || !importData.records) {
            throw new Error('Invalid import data');
        }

        const result = this.peerSync.mergePeerData(global.parsedData, global.devices, importData);
        
        // Save data after import
        this.saveData();
        
        return result;
    }
}

module.exports = MobilePeerSync; 