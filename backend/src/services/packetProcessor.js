// backend/src/services/packetProcessor.js

const config = require('../config');
const logger = require('../utils/logger');
const csvLogger = require('../utils/csvLogger');
const { DataPoint, Record } = require('../models');
const deviceManager = require('./deviceManager');
const deviceMapper = require('./deviceMapper');
const alertManager = require('./alertManager');
const parser = require('./parser');
const { parsePacket } = require('./parser');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const os = require('os');

class PacketProcessor {
    constructor() {
        this.parser = parser;
        this.processors = new Map();
        this.maxWorkers = 4;
        this.batchSize = 100;
        this.maxConcurrency = 10;
        this.deviceMappingsCache = new Map(); // Cache for device mappings
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes cache timeout
        
        this.initializeProcessors();
        this.initializeWorkerPool();
    }

    initializeProcessors() {
        this.processors.set('main', this.processMainPacket.bind(this));
        this.processors.set('type33', this.processType33Packet.bind(this));
        this.processors.set('confirmation', this.processConfirmationPacket.bind(this));
    }

    initializeWorkerPool() {
        // Initialize worker pool for parallel processing
        if (this.maxConcurrency > 1) {
            logger.info(`Initializing worker pool with ${this.maxConcurrency} workers for parallel processing`);
        }
    }

    async processPacket(packet, socket) {
        try {
            // Log raw packet data
            logger.info('Processing packet:', {
                hex: packet.toString('hex').toUpperCase(),
                length: packet.length,
                timestamp: new Date().toISOString()
            });

            // Log to CSV
            csvLogger.logDeviceData(packet.toString('hex'));

            // Parse the packet first
            const parsedData = parsePacket(packet);
            if (!parsedData) {
                logger.error('Failed to parse packet');
                return null;
            }

            // Handle multiple records if present
            if (parsedData.records && parsedData.records.length > 1) {
                logger.info(`Processing ${parsedData.records.length} records from packet`);
                
                const startTime = Date.now();
                
                // Group records by IMEI for batch processing
                const recordsByImei = new Map();
                
                for (let i = 0; i < parsedData.records.length; i++) {
                    const record = parsedData.records[i];
                    const imei = record.tags['0x03']?.value || parsedData.imei;
                    
                    if (!imei) {
                        logger.warn(`No IMEI found in record ${i}`);
                        continue;
                    }

                    if (!recordsByImei.has(imei)) {
                        recordsByImei.set(imei, []);
                    }
                    recordsByImei.get(imei).push(record);
                }
                
                // Process all IMEIs in parallel
                const devicePromises = Array.from(recordsByImei.keys()).map(async (imei) => {
                    // Register or get device (only once per IMEI)
                    let device = await deviceManager.getDevice(imei);
                    if (!device) {
                        device = await deviceManager.registerDevice(imei);
                        logger.info('New device registered:', {
                            imei,
                            timestamp: new Date().toISOString()
                        });
                    } else {
                        await deviceManager.updateDeviceStatus(imei, 'online');
                    }
                    return { imei, device };
                });
                
                const devices = await Promise.all(devicePromises);
                const deviceMap = new Map(devices.map(d => [d.imei, d.device]));
                
                // Process all records using chunked parallel processing
                const allRecords = [];
                
                for (const [imei, records] of recordsByImei.entries()) {
                    const device = deviceMap.get(imei);
                    
                    // Use chunked processing for large record sets
                    const processedRecords = await this.processRecordsInChunks(records, device.id, imei);
                    allRecords.push(...processedRecords);
                }
                
                const validRecords = allRecords.filter(r => r !== null);
                
                // Batch save to database
                if (validRecords.length > 0) {
                    await this.batchSaveToDatabase(validRecords);
                    
                    // Batch check alerts
                    await this.batchCheckAlerts(validRecords);
                }
                
                const processingTime = Date.now() - startTime;
                const recordsPerSecond = (validRecords.length / processingTime * 1000).toFixed(1);
                logger.info(`Successfully processed ${validRecords.length} records in ${processingTime}ms (${recordsPerSecond} records/sec) using parallel processing`);
                
                return validRecords.length > 0 ? validRecords[0] : null;
            }

            // Single record processing (existing logic)
            const imei = parsedData.imei;
            if (!imei) {
                logger.error('No IMEI found in packet');
                return null;
            }

            // Log specific device parameters
            this.logDeviceParameters(parsedData.tags, imei);

            // Register or get device
            let device = await deviceManager.getDevice(imei);
            if (!device) {
                device = await deviceManager.registerDevice(imei);
                logger.info('New device registered:', {
                    imei,
                    timestamp: new Date().toISOString()
                });
            } else {
                await deviceManager.updateDeviceStatus(imei, 'online');
                logger.info('Device status updated:', {
                    imei,
                    status: 'online',
                    timestamp: new Date().toISOString()
                });
            }

            // Process the packet based on its type
            const processor = this.processors.get(parsedData.type);
            if (!processor) {
                logger.error(`No processor found for packet type: ${parsedData.type}`);
                return null;
            }

            const processed = await processor(parsedData, device.id);
            if (!processed) {
                logger.error('Failed to process packet');
                return null;
            }

            // Map the data according to device configuration
            const mapped = await this.mapPacketData(processed, device.id);

            // Save to database
            await this.saveToDatabase(mapped, device.id);

            // Check for alerts
            await this.checkAlerts(device.id, mapped);

            // Log successful processing
            logger.info('Packet processed successfully:', {
                type: parsedData.type,
                imei,
                timestamp: new Date().toISOString()
            });

            return mapped;
        } catch (error) {
            logger.error('Packet processing error:', {
                error: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString()
            });
            throw error;
        }
    }

    async processMainPacket(parsed, deviceId) {
        try {
            const result = {
                type: 'main',
                deviceId,
                timestamp: new Date(),
                data: {}
            };

            // Handle both old and new record structures
            const tags = parsed.tags || parsed;
            
            // Process each tag
            for (const [tag, tagData] of Object.entries(tags)) {
                const value = tagData.value !== undefined ? tagData.value : tagData;
                
                switch (tag) {
                    case '0x03': // IMEI
                        result.data.imei = value;
                        result.data.deviceId = value;
                        break;
                    case '0x30': // Coordinates
                        if (value && typeof value === 'object' && value.latitude && value.longitude) {
                            result.data.latitude = value.latitude;
                            result.data.longitude = value.longitude;
                            result.data.satellites = value.satellites;
                            result.data.coordinateCorrectness = value.correctness;
                        }
                        break;
                    case '0x33': // Speed and Direction
                        if (value && typeof value === 'object') {
                            result.data.speed = value.speed;
                            result.data.direction = value.direction;
                        }
                        break;
                    case '0x34': // Height
                        result.data.height = value;
                        break;
                    case '0x35': // HDOP
                        result.data.hdop = value;
                        break;
                    case '0x36': // VDOP
                        result.data.vdop = value;
                        break;
                    case '0x37': // PDOP
                        result.data.pdop = value;
                        break;
                    case '0x38': // Number of Satellites
                        result.data.satellites = value;
                        break;
                    case '0x39': // GPS Status
                        result.data.gpsStatus = value;
                        break;
                    case '0x3A': // GPS Time
                        result.data.gpsTime = value;
                        break;
                    case '0x3B': // GPS Date
                        result.data.gpsDate = value;
                        break;
                    case '0x3C': // GPS DateTime
                        result.data.gpsDateTime = value;
                        break;
                    case '0x3D': // GPS Accuracy
                        result.data.gpsAccuracy = value;
                        break;
                    case '0x3E': // GPS Mode
                        result.data.gpsMode = value;
                        break;
                    case '0x3F': // GPS Fix Type
                        result.data.gpsFixType = value;
                        break;
                    case '0x40': // GPS Fix Quality
                        result.data.gpsFixQuality = value;
                        break;
                    case '0x41': // GPS Fix Status
                        result.data.gpsFixStatus = value;
                        break;
                    case '0x42': // GPS Fix Mode
                        result.data.gpsFixMode = value;
                        break;
                    case '0x43': // GPS Fix Type
                        result.data.gpsFixType = value;
                        break;
                    case '0x44': // GPS Fix Quality
                        result.data.gpsFixQuality = value;
                        break;
                    case '0x45': // GPS Fix Status
                        result.data.gpsFixStatus = value;
                        break;
                    case '0x46': // GPS Fix Mode
                        result.data.gpsFixMode = value;
                        break;
                    case '0x47': // GPS Fix Type
                        result.data.gpsFixType = value;
                        break;
                    case '0x48': // GPS Fix Quality
                        result.data.gpsFixQuality = value;
                        break;
                    case '0x49': // GPS Fix Status
                        result.data.gpsFixStatus = value;
                        break;
                    case '0x4A': // GPS Fix Mode
                        result.data.gpsFixMode = value;
                        break;
                    case '0x4B': // GPS Fix Type
                        result.data.gpsFixType = value;
                        break;
                    case '0x4C': // GPS Fix Quality
                        result.data.gpsFixQuality = value;
                        break;
                    case '0x4D': // GPS Fix Status
                        result.data.gpsFixStatus = value;
                        break;
                    case '0x4E': // GPS Fix Mode
                        result.data.gpsFixMode = value;
                        break;
                    case '0x4F': // GPS Fix Type
                        result.data.gpsFixType = value;
                        break;
                    case '0x50': // GPS Fix Quality
                        result.data.gpsFixQuality = value;
                        break;
                    case '0x51': // GPS Fix Status
                        result.data.gpsFixStatus = value;
                        break;
                    case '0x52': // GPS Fix Mode
                        result.data.gpsFixMode = value;
                        break;
                    case '0x53': // GPS Fix Type
                        result.data.gpsFixType = value;
                        break;
                    case '0x54': // GPS Fix Quality
                        result.data.gpsFixQuality = value;
                        break;
                    case '0x55': // GPS Fix Status
                        result.data.gpsFixStatus = value;
                        break;
                    case '0x56': // GPS Fix Mode
                        result.data.gpsFixMode = value;
                        break;
                    case '0x57': // GPS Fix Type
                        result.data.gpsFixType = value;
                        break;
                    case '0x58': // GPS Fix Quality
                        result.data.gpsFixQuality = value;
                        break;
                    case '0x59': // GPS Fix Status
                        result.data.gpsFixStatus = value;
                        break;
                    case '0x5A': // GPS Fix Mode
                        result.data.gpsFixMode = value;
                        break;
                    case '0x5B': // GPS Fix Type
                        result.data.gpsFixType = value;
                        break;
                    case '0x5C': // GPS Fix Quality
                        result.data.gpsFixQuality = value;
                        break;
                    case '0x5D': // GPS Fix Status
                        result.data.gpsFixStatus = value;
                        break;
                    case '0x5E': // GPS Fix Mode
                        result.data.gpsFixMode = value;
                        break;
                    case '0x5F': // GPS Fix Type
                        result.data.gpsFixType = value;
                        break;
                    case '0x60': // GPS Fix Quality
                        result.data.gpsFixQuality = value;
                        break;
                    case '0x61': // GPS Fix Status
                        result.data.gpsFixStatus = value;
                        break;
                    case '0x62': // GPS Fix Mode
                        result.data.gpsFixMode = value;
                        break;
                    case '0x63': // GPS Fix Type
                        result.data.gpsFixType = value;
                        break;
                    case '0x64': // GPS Fix Quality
                        result.data.gpsFixQuality = value;
                        break;
                    case '0x65': // GPS Fix Status
                        result.data.gpsFixStatus = value;
                        break;
                    case '0x66': // GPS Fix Mode
                        result.data.gpsFixMode = value;
                        break;
                    case '0x67': // GPS Fix Type
                        result.data.gpsFixType = value;
                        break;
                    case '0x68': // GPS Fix Quality
                        result.data.gpsFixQuality = value;
                        break;
                    case '0x69': // GPS Fix Status
                        result.data.gpsFixStatus = value;
                        break;
                    case '0x6A': // GPS Fix Mode
                        result.data.gpsFixMode = value;
                        break;
                    case '0x6B': // GPS Fix Type
                        result.data.gpsFixType = value;
                        break;
                    case '0x6C': // GPS Fix Quality
                        result.data.gpsFixQuality = value;
                        break;
                    case '0x6D': // GPS Fix Status
                        result.data.gpsFixStatus = value;
                        break;
                    case '0x6E': // GPS Fix Mode
                        result.data.gpsFixMode = value;
                        break;
                    case '0x6F': // GPS Fix Type
                        result.data.gpsFixType = value;
                        break;
                    case '0x70': // GPS Fix Quality
                        result.data.gpsFixQuality = value;
                        break;
                    case '0x71': // GPS Fix Status
                        result.data.gpsFixStatus = value;
                        break;
                    case '0x72': // GPS Fix Mode
                        result.data.gpsFixMode = value;
                        break;
                    case '0x73': // GPS Fix Type
                        result.data.gpsFixType = value;
                        break;
                    case '0x74': // GPS Fix Quality
                        result.data.gpsFixQuality = value;
                        break;
                    case '0x75': // GPS Fix Status
                        result.data.gpsFixStatus = value;
                        break;
                    case '0x76': // GPS Fix Mode
                        result.data.gpsFixMode = value;
                        break;
                    case '0x77': // GPS Fix Type
                        result.data.gpsFixType = value;
                        break;
                    case '0x78': // GPS Fix Quality
                        result.data.gpsFixQuality = value;
                        break;
                    case '0x79': // GPS Fix Status
                        result.data.gpsFixStatus = value;
                        break;
                    case '0x7A': // GPS Fix Mode
                        result.data.gpsFixMode = value;
                        break;
                    case '0x7B': // GPS Fix Type
                        result.data.gpsFixType = value;
                        break;
                    case '0x7C': // GPS Fix Quality
                        result.data.gpsFixQuality = value;
                        break;
                    case '0x7D': // GPS Fix Status
                        result.data.gpsFixStatus = value;
                        break;
                    case '0x7E': // GPS Fix Mode
                        result.data.gpsFixMode = value;
                        break;
                    case '0x7F': // GPS Fix Type
                        result.data.gpsFixType = value;
                        break;
                    case '0x80': // GPS Fix Quality
                        result.data.gpsFixQuality = value;
                        break;
                    case '0x81': // GPS Fix Status
                        result.data.gpsFixStatus = value;
                        break;
                    case '0x82': // GPS Fix Mode
                        result.data.gpsFixMode = value;
                        break;
                    case '0x83': // GPS Fix Type
                        result.data.gpsFixType = value;
                        break;
                    case '0x84': // GPS Fix Quality
                        result.data.gpsFixQuality = value;
                        break;
                    case '0x85': // GPS Fix Status
                        result.data.gpsFixStatus = value;
                        break;
                    case '0x86': // GPS Fix Mode
                        result.data.gpsFixMode = value;
                        break;
                    case '0x87': // GPS Fix Type
                        result.data.gpsFixType = value;
                        break;
                    case '0x88': // GPS Fix Quality
                        result.data.gpsFixQuality = value;
                        break;
                    case '0x89': // GPS Fix Status
                        result.data.gpsFixStatus = value;
                        break;
                    case '0x8A': // GPS Fix Mode
                        result.data.gpsFixMode = value;
                        break;
                    case '0x8B': // GPS Fix Type
                        result.data.gpsFixType = value;
                        break;
                    case '0x8C': // GPS Fix Quality
                        result.data.gpsFixQuality = value;
                        break;
                    case '0x8D': // GPS Fix Status
                        result.data.gpsFixStatus = value;
                        break;
                    case '0x8E': // GPS Fix Mode
                        result.data.gpsFixMode = value;
                        break;
                    case '0x8F': // GPS Fix Type
                        result.data.gpsFixType = value;
                        break;
                    case '0x90': // GPS Fix Quality
                        result.data.gpsFixQuality = value;
                        break;
                    case '0x91': // GPS Fix Status
                        result.data.gpsFixStatus = value;
                        break;
                    case '0x92': // GPS Fix Mode
                        result.data.gpsFixMode = value;
                        break;
                    case '0x93': // GPS Fix Type
                        result.data.gpsFixType = value;
                        break;
                    case '0x94': // GPS Fix Quality
                        result.data.gpsFixQuality = value;
                        break;
                    case '0x95': // GPS Fix Status
                        result.data.gpsFixStatus = value;
                        break;
                    case '0x96': // GPS Fix Mode
                        result.data.gpsFixMode = value;
                        break;
                    case '0x97': // GPS Fix Type
                        result.data.gpsFixType = value;
                        break;
                    case '0x98': // GPS Fix Quality
                        result.data.gpsFixQuality = value;
                        break;
                    case '0x99': // GPS Fix Status
                        result.data.gpsFixStatus = value;
                        break;
                    case '0x9A': // GPS Fix Mode
                        result.data.gpsFixMode = value;
                        break;
                    case '0x9B': // GPS Fix Type
                        result.data.gpsFixType = value;
                        break;
                    case '0x9C': // GPS Fix Quality
                        result.data.gpsFixQuality = value;
                        break;
                    case '0x9D': // GPS Fix Status
                        result.data.gpsFixStatus = value;
                        break;
                    case '0x9E': // GPS Fix Mode
                        result.data.gpsFixMode = value;
                        break;
                    case '0x9F': // GPS Fix Type
                        result.data.gpsFixType = value;
                        break;
                    case '0xA0': // GPS Fix Quality
                        result.data.gpsFixQuality = value;
                        break;
                    case '0xA1': // GPS Fix Status
                        result.data.gpsFixStatus = value;
                        break;
                    case '0xA2': // GPS Fix Mode
                        result.data.gpsFixMode = value;
                        break;
                    case '0xA3': // GPS Fix Type
                        result.data.gpsFixType = value;
                        break;
                    case '0xA4': // GPS Fix Quality
                        result.data.gpsFixQuality = value;
                        break;
                    case '0xA5': // GPS Fix Status
                        result.data.gpsFixStatus = value;
                        break;
                    case '0xA6': // GPS Fix Mode
                        result.data.gpsFixMode = value;
                        break;
                    case '0xA7': // GPS Fix Type
                        result.data.gpsFixType = value;
                        break;
                    case '0xA8': // GPS Fix Quality
                        result.data.gpsFixQuality = value;
                        break;
                    case '0xA9': // GPS Fix Status
                        result.data.gpsFixStatus = value;
                        break;
                    case '0xAA': // GPS Fix Mode
                        result.data.gpsFixMode = value;
                        break;
                    case '0xAB': // GPS Fix Type
                        result.data.gpsFixType = value;
                        break;
                    case '0xAC': // GPS Fix Quality
                        result.data.gpsFixQuality = value;
                        break;
                    case '0xAD': // GPS Fix Status
                        result.data.gpsFixStatus = value;
                        break;
                    case '0xAE': // GPS Fix Mode
                        result.data.gpsFixMode = value;
                        break;
                    case '0xAF': // GPS Fix Type
                        result.data.gpsFixType = value;
                        break;
                    case '0xB0': // GPS Fix Quality
                        result.data.gpsFixQuality = value;
                        break;
                    case '0xB1': // GPS Fix Status
                        result.data.gpsFixStatus = value;
                        break;
                    case '0xB2': // GPS Fix Mode
                        result.data.gpsFixMode = value;
                        break;
                    case '0xB3': // GPS Fix Type
                        result.data.gpsFixType = value;
                        break;
                    case '0xB4': // GPS Fix Quality
                        result.data.gpsFixQuality = value;
                        break;
                    case '0xB5': // GPS Fix Status
                        result.data.gpsFixStatus = value;
                        break;
                    case '0xB6': // GPS Fix Mode
                        result.data.gpsFixMode = value;
                        break;
                    case '0xB7': // GPS Fix Type
                        result.data.gpsFixType = value;
                        break;
                    case '0xB8': // GPS Fix Quality
                        result.data.gpsFixQuality = value;
                        break;
                    case '0xB9': // GPS Fix Status
                        result.data.gpsFixStatus = value;
                        break;
                    case '0xBA': // GPS Fix Mode
                        result.data.gpsFixMode = value;
                        break;
                    case '0xBB': // GPS Fix Type
                        result.data.gpsFixType = value;
                        break;
                    case '0xBC': // GPS Fix Quality
                        result.data.gpsFixQuality = value;
                        break;
                    case '0xBD': // GPS Fix Status
                        result.data.gpsFixStatus = value;
                        break;
                    case '0xBE': // GPS Fix Mode
                        result.data.gpsFixMode = value;
                        break;
                    case '0xBF': // GPS Fix Type
                        result.data.gpsFixType = value;
                        break;
                    case '0xC0': // GPS Fix Quality
                        result.data.gpsFixQuality = value;
                        break;
                    case '0xC1': // GPS Fix Status
                        result.data.gpsFixStatus = value;
                        break;
                    case '0xC2': // GPS Fix Mode
                        result.data.gpsFixMode = value;
                        break;
                    case '0xC3': // GPS Fix Type
                        result.data.gpsFixType = value;
                        break;
                    case '0xC4': // GPS Fix Quality
                        result.data.gpsFixQuality = value;
                        break;
                    case '0xC5': // GPS Fix Status
                        result.data.gpsFixStatus = value;
                        break;
                    case '0xC6': // GPS Fix Mode
                        result.data.gpsFixMode = value;
                        break;
                    case '0xC7': // GPS Fix Type
                        result.data.gpsFixType = value;
                        break;
                    case '0xC8': // GPS Fix Quality
                        result.data.gpsFixQuality = value;
                        break;
                    case '0xC9': // GPS Fix Status
                        result.data.gpsFixStatus = value;
                        break;
                    case '0xCA': // GPS Fix Mode
                        result.data.gpsFixMode = value;
                        break;
                    case '0xCB': // GPS Fix Type
                        result.data.gpsFixType = value;
                        break;
                    case '0xCC': // GPS Fix Quality
                        result.data.gpsFixQuality = value;
                        break;
                    case '0xCD': // GPS Fix Status
                        result.data.gpsFixStatus = value;
                        break;
                    case '0xCE': // GPS Fix Mode
                        result.data.gpsFixMode = value;
                        break;
                    case '0xCF': // GPS Fix Type
                        result.data.gpsFixType = value;
                        break;
                    case '0xD0': // GPS Fix Quality
                        result.data.gpsFixQuality = value;
                        break;
                    case '0xD1': // GPS Fix Status
                        result.data.gpsFixStatus = value;
                        break;
                    case '0xD2': // GPS Fix Mode
                        result.data.gpsFixMode = value;
                        break;
                    case '0xD3': // GPS Fix Type
                        result.data.gpsFixType = value;
                        break;
                    case '0xD4': // GPS Fix Quality
                        result.data.gpsFixQuality = value;
                        break;
                    case '0xD5': // GPS Fix Status
                        result.data.gpsFixStatus = value;
                        break;
                    case '0xD6': // GPS Fix Mode
                        result.data.gpsFixMode = value;
                        break;
                    case '0xD7': // GPS Fix Type
                        result.data.gpsFixType = value;
                        break;
                    case '0xD8': // GPS Fix Quality
                        result.data.gpsFixQuality = value;
                        break;
                    case '0xD9': // GPS Fix Status
                        result.data.gpsFixStatus = value;
                        break;
                    case '0xDA': // GPS Fix Mode
                        result.data.gpsFixMode = value;
                        break;
                    case '0xDB': // GPS Fix Type
                        result.data.gpsFixType = value;
                        break;
                    case '0xDC': // GPS Fix Quality
                        result.data.gpsFixQuality = value;
                        break;
                    case '0xDD': // GPS Fix Status
                        result.data.gpsFixStatus = value;
                        break;
                    case '0xDE': // GPS Fix Mode
                        result.data.gpsFixMode = value;
                        break;
                    case '0xDF': // GPS Fix Type
                        result.data.gpsFixType = value;
                        break;
                    case '0xE0': // GPS Fix Quality
                        result.data.gpsFixQuality = value;
                        break;
                    case '0xE1': // GPS Fix Status
                        result.data.gpsFixStatus = value;
                        break;
                    case '0xE2': // GPS Fix Mode
                        result.data.gpsFixMode = value;
                        break;
                    case '0xE3': // GPS Fix Type
                        result.data.gpsFixType = value;
                        break;
                    case '0xE4': // GPS Fix Quality
                        result.data.gpsFixQuality = value;
                        break;
                    case '0xE5': // GPS Fix Status
                        result.data.gpsFixStatus = value;
                        break;
                    case '0xE6': // GPS Fix Mode
                        result.data.gpsFixMode = value;
                        break;
                    case '0xE7': // GPS Fix Type
                        result.data.gpsFixType = value;
                        break;
                    case '0xE8': // GPS Fix Quality
                        result.data.gpsFixQuality = value;
                        break;
                    case '0xE9': // GPS Fix Status
                        result.data.gpsFixStatus = value;
                        break;
                    case '0xEA': // GPS Fix Mode
                        result.data.gpsFixMode = value;
                        break;
                    case '0xEB': // GPS Fix Type
                        result.data.gpsFixType = value;
                        break;
                    case '0xEC': // GPS Fix Quality
                        result.data.gpsFixQuality = value;
                        break;
                    case '0xED': // GPS Fix Status
                        result.data.gpsFixStatus = value;
                        break;
                    case '0xEE': // GPS Fix Mode
                        result.data.gpsFixMode = value;
                        break;
                    case '0xEF': // GPS Fix Type
                        result.data.gpsFixType = value;
                        break;
                    case '0xF0': // GPS Fix Quality
                        result.data.gpsFixQuality = value;
                        break;
                    case '0xF1': // GPS Fix Status
                        result.data.gpsFixStatus = value;
                        break;
                    case '0xF2': // GPS Fix Mode
                        result.data.gpsFixMode = value;
                        break;
                    case '0xF3': // GPS Fix Type
                        result.data.gpsFixType = value;
                        break;
                    case '0xF4': // GPS Fix Quality
                        result.data.gpsFixQuality = value;
                        break;
                    case '0xF5': // GPS Fix Status
                        result.data.gpsFixStatus = value;
                        break;
                    case '0xF6': // GPS Fix Mode
                        result.data.gpsFixMode = value;
                        break;
                    case '0xF7': // GPS Fix Type
                        result.data.gpsFixType = value;
                        break;
                    case '0xF8': // GPS Fix Quality
                        result.data.gpsFixQuality = value;
                        break;
                    case '0xF9': // GPS Fix Status
                        result.data.gpsFixStatus = value;
                        break;
                    case '0xFA': // GPS Fix Mode
                        result.data.gpsFixMode = value;
                        break;
                    case '0xFB': // GPS Fix Type
                        result.data.gpsFixType = value;
                        break;
                    case '0xFC': // GPS Fix Quality
                        result.data.gpsFixQuality = value;
                        break;
                    case '0xFD': // GPS Fix Status
                        result.data.gpsFixStatus = value;
                        break;
                    case '0xFE': // GPS Fix Mode
                        result.data.gpsFixMode = value;
                        break;
                    case '0xFF': // GPS Fix Type
                        result.data.gpsFixType = value;
                        break;
                    default:
                        // Store unknown tags as raw data
                        result.data[tag] = value;
                        break;
                }
            }

            return result;
        } catch (error) {
            logger.error('Error processing main packet:', error);
            return null;
        }
    }

    async processType33Packet(parsed, deviceId) {
        try {
            const result = {
                type: 'type33',
                deviceId,
                timestamp: new Date(),
                data: {}
            };

            // Process Type33 specific data
            const tags = parsed.tags || parsed;
            
            for (const [tag, tagData] of Object.entries(tags)) {
                const value = tagData.value !== undefined ? tagData.value : tagData;
                result.data[tag] = value;
            }

            return result;
        } catch (error) {
            logger.error('Error processing Type33 packet:', error);
            return null;
        }
    }

    async processConfirmationPacket(parsed, deviceId) {
        try {
            const result = {
            type: 'confirmation',
            deviceId,
            timestamp: new Date(),
                data: {}
            };

            // Process confirmation specific data
            const tags = parsed.tags || parsed;
            
            for (const [tag, tagData] of Object.entries(tags)) {
                const value = tagData.value !== undefined ? tagData.value : tagData;
                result.data[tag] = value;
            }

            return result;
        } catch (error) {
            logger.error('Error processing confirmation packet:', error);
            return null;
        }
    }

    // Get device mappings with caching
    async getDeviceMappingsCached(deviceId) {
        const cacheKey = deviceId;
        const cached = this.deviceMappingsCache.get(cacheKey);
        
        if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
            return cached.mappings;
        }
        
        // Fetch fresh mappings from database
        const mappings = await deviceMapper.getDeviceMappings(deviceId);
        
        // Cache the mappings
        this.deviceMappingsCache.set(cacheKey, {
            mappings,
            timestamp: Date.now()
        });
        
        return mappings;
    }

    async mapPacketData(processed, deviceId) {
        try {
            // Get device mapping configuration with caching
            const mappings = await this.getDeviceMappingsCached(deviceId);
            
            if (!mappings || Object.keys(mappings).length === 0) {
                return processed; // Return as-is if no mappings
            }

        const mapped = { ...processed };

            // Apply mappings to data
            for (const [field, mapping] of Object.entries(mappings)) {
                if (processed.data[field] !== undefined) {
                    mapped.data[field] = this.applyMapping(processed.data[field], mapping);
            }
        }

        return mapped;
        } catch (error) {
            logger.error('Error mapping packet data:', error);
            return processed; // Return original if mapping fails
        }
    }

    applyMapping(value, mapping) {
        try {
        let result = value;

            // Apply transformations
            if (mapping.transform) {
                switch (mapping.transform) {
                    case 'multiply':
                        result = value * mapping.factor;
                        break;
                    case 'divide':
                        result = value / mapping.factor;
                        break;
                    case 'add':
                        result = value + mapping.offset;
                        break;
                    case 'subtract':
                        result = value - mapping.offset;
                        break;
                }
            }

            // Convert units if specified
        if (mapping.unit) {
            result = this.convertUnit(result, mapping.unit);
        }

        return result;
        } catch (error) {
            logger.error('Error applying mapping:', error);
            return value; // Return original value if mapping fails
        }
    }

    convertUnit(value, unit) {
        // Add unit conversion logic here
        return value;
    }

    async saveToDatabase(data, deviceId) {
        try {
            // Save to DataPoint table
            const dataPoint = await DataPoint.create({
                deviceId,
                timestamp: data.timestamp,
                data: JSON.stringify(data.data),
                type: data.type
            });

            // Save to Record table for historical data
            await Record.create({
                deviceId,
                timestamp: data.timestamp,
                data: JSON.stringify(data.data),
                type: data.type
            });

            logger.debug('Data saved to database:', {
                deviceId,
                dataPointId: dataPoint.id,
                timestamp: data.timestamp
            });

            return dataPoint;
        } catch (error) {
            logger.error('Error saving to database:', error);
            throw error;
        }
    }

    async checkAlerts(deviceId, data) {
        try {
            const alerts = await alertManager.getActiveAlerts(deviceId);

            for (const alert of alerts) {
                const triggered = this.evaluateAlertCondition(data, alert.condition);
                
                if (triggered) {
                    await this.triggerAlert(deviceId, alert, data);
                }
            }
        } catch (error) {
            logger.error('Error checking alerts:', error);
        }
    }

    evaluateAlertCondition(data, condition) {
        // Implement alert condition evaluation logic
        return false;
    }

    async triggerAlert(deviceId, alert, data) {
        try {
            logger.info('Alert triggered:', {
                deviceId,
                alertId: alert.id,
                alertName: alert.name,
                timestamp: new Date().toISOString()
            });

            // Send notification
            await this.sendNotification(alert.notification, alert, data);
            
            // Log alert
            await alertManager.logAlert(deviceId, alert.id, data);
        } catch (error) {
            logger.error('Error triggering alert:', error);
        }
    }

    async sendNotification(notification, alert, data) {
        // Implement notification sending logic
        logger.info('Notification sent:', {
            type: notification.type,
            alertId: alert.id,
            timestamp: new Date().toISOString()
        });
    }

    logDeviceParameters(tags, imei) {
        try {
            const logData = {
                imei,
                timestamp: new Date().toISOString(),
                parameters: {}
            };

            for (const [tag, tagData] of Object.entries(tags)) {
                const value = tagData.value !== undefined ? tagData.value : tagData;
                logData.parameters[tag] = value;
            }

            logger.info('Device parameters:', logData);
        } catch (error) {
            logger.error('Error logging device parameters:', error);
        }
    }

    // Helper method to process a single record asynchronously
    async processRecordAsync(record, deviceId, imei) {
        try {
            // Process the record (this should be fast now with parallel parsing)
            const processed = await this.processMainPacket(record, deviceId);
            if (!processed) {
                return null;
            }

            // Map the data according to device configuration (now cached)
            const mapped = await this.mapPacketData(processed, deviceId);
            
            // Add deviceId to the record for batch operations
            mapped.deviceId = deviceId;
            
            return mapped;
        } catch (error) {
            logger.error(`Error processing record for device ${imei}:`, error);
            return null;
        }
    }

    // Batch save multiple records to database
    async batchSaveToDatabase(records) {
        try {
            // Prepare data for bulk insert
            const dataPointBulk = records.map(record => ({
                deviceId: record.deviceId,
                timestamp: record.timestamp,
                data: JSON.stringify(record.data),
                type: record.type,
                createdAt: new Date(),
                updatedAt: new Date()
            }));

            const recordBulk = records.map(record => ({
                deviceId: record.deviceId,
                timestamp: record.timestamp,
                data: JSON.stringify(record.data),
                type: record.type,
                createdAt: new Date(),
                updatedAt: new Date()
            }));

            // Use bulk insert for better performance
            if (dataPointBulk.length > 0) {
                await DataPoint.bulkCreate(dataPointBulk);
            }
            
            if (recordBulk.length > 0) {
                await Record.bulkCreate(recordBulk);
            }

            logger.debug(`Batch saved ${records.length} records to database using bulk insert`);
        } catch (error) {
            logger.error('Error batch saving to database:', error);
            
            // Fallback to individual inserts if bulk insert fails
            logger.info('Falling back to individual inserts...');
            try {
                for (const record of records) {
                    await this.saveToDatabase(record, record.deviceId);
                }
                logger.info('Fallback individual inserts completed');
            } catch (fallbackError) {
                logger.error('Fallback individual inserts also failed:', fallbackError);
                throw fallbackError;
            }
        }
    }

    // Batch check alerts for multiple records
    async batchCheckAlerts(records) {
        try {
            // Group records by device for efficient alert checking
            const recordsByDevice = new Map();
            
            for (const record of records) {
                if (!recordsByDevice.has(record.deviceId)) {
                    recordsByDevice.set(record.deviceId, []);
                }
                recordsByDevice.get(record.deviceId).push(record);
            }

            // Check alerts for each device in parallel
            const alertPromises = Array.from(recordsByDevice.entries()).map(async ([deviceId, deviceRecords]) => {
                const alerts = await alertManager.getActiveAlerts(deviceId);
                
                for (const alert of alerts) {
                    for (const record of deviceRecords) {
                        const triggered = this.evaluateAlertCondition(record, alert.condition);
                        if (triggered) {
                            await this.triggerAlert(deviceId, alert, record);
                        }
                    }
                }
            });

            await Promise.all(alertPromises);
        } catch (error) {
            logger.error('Error batch checking alerts:', error);
        }
    }

    // Process records in chunks to avoid memory issues
    async processRecordsInChunks(records, deviceId, imei) {
        const chunks = [];
        for (let i = 0; i < records.length; i += this.batchSize) {
            chunks.push(records.slice(i, i + this.batchSize));
        }

        const results = [];
        for (const chunk of chunks) {
            const chunkResults = await this.processRecordChunk(chunk, deviceId, imei);
            results.push(...chunkResults);
        }
        return results;
    }

    // Process a chunk of records with controlled concurrency
    async processRecordChunk(records, deviceId, imei) {
        // Process all records in parallel using Promise.all()
        const recordPromises = records.map(async (record, index) => {
            try {
                const result = await this.processRecordAsync(record, deviceId, imei);
                return result;
            } catch (error) {
                logger.error(`Error processing record ${index}:`, error);
                return null;
            }
        });

        // Wait for all records to be processed in parallel
        const results = await Promise.all(recordPromises);
        return results.filter(r => r !== null);
    }
}

module.exports = new PacketProcessor();

