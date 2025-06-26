// ========================================
// GALILEOSKY MOBILE BACKEND WITH PEER SYNC
// ========================================
// Enhanced mobile backend with peer-to-peer sync capabilities
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

// Clear startup identification
console.log('🚀 ========================================');
console.log('🚀 GALILEOSKY MOBILE BACKEND WITH PEER SYNC');
console.log('🚀 ========================================');
console.log('🚀 Enhanced mobile backend with peer-to-peer sync');
console.log('🚀 Last updated: 2025-01-27');
console.log('🚀 ========================================');
console.log('');

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
const MAX_RECORDS = 10000; // Maximum number of records to keep in memory and storage

// Global variables for IMEI persistence
let lastIMEI = null;
let parsedData = [];
let devices = new Map();

// Initialize mobile peer sync
const mobilePeerSync = new MobilePeerSync('mobile-device-' + Math.random().toString(36).substr(2, 9), 3001);

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

// Configuration
const config = {
    tcpPort: process.env.TCP_PORT || 3003,
    httpPort: process.env.HTTP_PORT || 3001,
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

// Tag definitions from tagDefinitions.js
const tagDefinitions = {
    '0x01': { type: 'uint8', description: 'Number Archive Records' },
    '0x02': { type: 'uint8', description: 'Number Event Records' },
    '0x03': { type: 'string', length: 15, description: 'IMEI' },
    '0x04': { type: 'uint8', description: 'Number Service Records' },
    '0x10': { type: 'uint16', description: 'Number Archive Records' },
    '0x20': { type: 'datetime', description: 'Date and Time' },
    '0x21': { type: 'uint16', description: 'Milliseconds' },
    '0x30': { type: 'coordinates', description: 'Coordinates' },
    '0x33': { type: 'speedDirection', description: 'Speed and Direction' },
    '0x34': { type: 'uint16', description: 'Height' },
    '0x35': { type: 'uint8', description: 'HDOP' },
    '0x40': { type: 'status', description: 'Status' },
    '0x41': { type: 'uint16', description: 'Supply Voltage' },
    '0x42': { type: 'uint16', description: 'Battery Voltage' },
    '0x43': { type: 'int16', description: 'Temperature' },
    '0x45': { type: 'uint8', description: 'Outputs' },
    '0x46': { type: 'uint8', description: 'Inputs' },
    '0x50': { type: 'uint16', description: 'Input Voltage 0' },
    '0x51': { type: 'uint16', description: 'Input Voltage 1' },
    '0x52': { type: 'uint16', description: 'Input Voltage 2' }
};

// ... existing code ... 