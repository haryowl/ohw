// ========================================
// GALILEOSKY MOBILE BACKEND WITH STATIC IP
// ========================================
// Enhanced mobile backend with static IP management
// Last updated: 2025-01-27
// ========================================

const net = require('net');
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const express = require('express');
const socketIo = require('socket.io');
const cors = require('cors');
const MobilePeerSync = require('./mobile-peer-sync');
const StaticIpManager = require('./backend/src/services/staticIpManager');

// Clear startup identification
console.log('🚀 ========================================');
console.log('🚀 GALILEOSKY MOBILE BACKEND WITH STATIC IP');
console.log('🚀 ========================================');
console.log('🚀 Enhanced mobile backend with static IP management');
console.log('🚀 Last updated: 2025-01-27');
console.log('🚀 ========================================');
console.log('');

// Initialize static IP manager
const staticIpManager = new StaticIpManager();

// Ensure logs and data directories exist
const logsDir = path.join(__dirname, 'logs');
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
}
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}

// Data storage files
const PARSED_DATA_FILE = path.join(dataDir, 'parsed_data.json');
const DEVICES_FILE = path.join(dataDir, 'devices.json');
const LAST_IMEI_FILE = path.join(dataDir, 'last_imei.json');

// Configuration constants
const MAX_RECORDS = 200000; // Maximum number of records to keep in memory and storage

// Global variables for IMEI persistence
let lastIMEI = null;
let parsedData = [];
let devices = new Map();

// Initialize mobile peer sync with static IP
const deviceId = 'mobile-static-' + Math.random().toString(36).substr(2, 9);
const mobilePeerSync = new MobilePeerSync(deviceId, 3001);

// Data persistence functions
function saveData() {
    try {
        // Save parsed data (keep only last MAX_RECORDS to prevent file from getting too large)
        const dataToSave = parsedData.slice(-MAX_RECORDS);
        fs.writeFileSync(PARSED_DATA_FILE, JSON.stringify(dataToSave, null, 2));
        
        // Save devices data
        const devicesData = Object.fromEntries(devices);
        fs.writeFileSync(DEVICES_FILE, JSON.stringify(devicesData, null, 2));
        
        // Save last IMEI
        if (lastIMEI) {
            fs.writeFileSync(LAST_IMEI_FILE, JSON.stringify({ lastIMEI }, null, 2));
        }
        
        logger.info(`Data saved: ${dataToSave.length} records, ${devices.size} devices`);
        
        // Also save through mobile peer sync
        mobilePeerSync.saveData();
    } catch (error) {
        logger.error('Error saving data:', { error: error.message });
    }
}

function loadData() {
    try {
        // Load parsed data
        if (fs.existsSync(PARSED_DATA_FILE)) {
            const data = JSON.parse(fs.readFileSync(PARSED_DATA_FILE, 'utf8'));
            parsedData = data;
            logger.info(`Loaded ${parsedData.length} records from storage`);
        }
        
        // Load devices data
        if (fs.existsSync(DEVICES_FILE)) {
            const devicesData = JSON.parse(fs.readFileSync(DEVICES_FILE, 'utf8'));
            devices = new Map(Object.entries(devicesData));
            logger.info(`Loaded ${devices.size} devices from storage`);
        }
        
        // Load last IMEI
        if (fs.existsSync(LAST_IMEI_FILE)) {
            const imeiData = JSON.parse(fs.readFileSync(LAST_IMEI_FILE, 'utf8'));
            lastIMEI = imeiData.lastIMEI;
            logger.info(`Loaded last IMEI: ${lastIMEI}`);
        }
        
        // Initialize mobile peer sync with loaded data
        mobilePeerSync.initialize(parsedData, devices, lastIMEI);
        
    } catch (error) {
        logger.error('Error loading data:', { error: error.message });
        // If loading fails, start with empty data
        parsedData = [];
        devices = new Map();
        lastIMEI = null;
        
        // Initialize mobile peer sync with empty data
        mobilePeerSync.initialize(parsedData, devices, lastIMEI);
    }
}

// Auto-save data every 30 seconds
let autoSaveInterval = null;

function startAutoSave() {
    if (autoSaveInterval) {
        clearInterval(autoSaveInterval);
    }
    autoSaveInterval = setInterval(() => {
        if (parsedData.length > 0 || devices.size > 0) {
            saveData();
        }
    }, 30000); // Save every 30 seconds
    logger.info('Auto-save enabled (every 30 seconds)');
}

function stopAutoSave() {
    if (autoSaveInterval) {
        clearInterval(autoSaveInterval);
        autoSaveInterval = null;
        logger.info('Auto-save disabled');
    }
}

// Configuration with static IP support
const config = {
    tcpPort: process.env.TCP_PORT || 3003,
    httpPort: process.env.HTTP_PORT || 3000,
    peerSyncPort: process.env.PEER_SYNC_PORT || 3001,
    host: '0.0.0.0',
    maxConnections: 100,
    connectionTimeout: 30000,
    keepAliveTime: 60000
};

// MIME types for HTTP server
const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

// Simple logger
const logger = {
    info: (message, data = {}) => {
        const timestamp = new Date().toISOString();
        const logMessage = `[INFO] ${timestamp} - ${message}`;
        console.log(logMessage);
        if (data.address) {
            console.log(`  Address: ${data.address}`);
        }
        if (data.hex) {
            console.log(`  Data: ${data.hex}`);
        }
    },
    error: (message, data = {}) => {
        const timestamp = new Date().toISOString();
        const logMessage = `[ERROR] ${timestamp} - ${message}`;
        console.error(logMessage);
        if (data.address) {
            console.error(`  Address: ${data.address}`);
        }
        if (data.error) {
            console.error(`  Error: ${data.error}`);
        }
    },
    warn: (message, data = {}) => {
        const timestamp = new Date().toISOString();
        const logMessage = `[WARN] ${timestamp} - ${message}`;
        console.warn(logMessage);
        if (data.address) {
            console.warn(`  Address: ${data.address}`);
        }
    }
};

// Track active connections
const activeConnections = new Map();
let tcpServer = null;
let httpServer = null;
let peerSyncServer = null;

// Display network information
function displayNetworkInfo() {
    const networkInfo = staticIpManager.getNetworkInfo();
    const connectionInfo = staticIpManager.getConnectionInfo();
    
    console.log('');
    console.log('🌐 NETWORK CONFIGURATION');
    console.log('========================');
    console.log(`Current IP: ${networkInfo.currentIp}`);
    console.log(`Static IP: ${networkInfo.staticIp || 'Not configured'}`);
    console.log(`Preferred IP: ${networkInfo.preferredIp}`);
    console.log(`Static IP Configured: ${networkInfo.isStaticConfigured ? 'Yes' : 'No'}`);
    console.log('');
    console.log('📱 SERVER URLs');
    console.log('==============');
    console.log(`Mobile Interface: ${networkInfo.urls.http}`);
    console.log(`Peer Sync Interface: ${networkInfo.urls.peerSyncUI}`);
    console.log(`TCP Server: ${networkInfo.urls.tcp}`);
    console.log('');
    
    if (connectionInfo.suggestedIp && !networkInfo.isStaticConfigured) {
        console.log('💡 SUGGESTED STATIC IP');
        console.log('======================');
        console.log(`Suggested IP: ${connectionInfo.suggestedIp}`);
        console.log('To set up static IP, run:');
        console.log('  curl -sSL https://raw.githubusercontent.com/haryowl/galileosky-parser/main/mobile-static-ip-setup.sh | bash');
        console.log('');
    }
    
    if (connectionInfo.instructions) {
        console.log('🔧 SETUP INSTRUCTIONS');
        console.log('=====================');
        connectionInfo.instructions.steps.forEach((step, index) => {
            console.log(`${index + 1}. ${step}`);
        });
        console.log('');
    }
}

// ... existing code ... 