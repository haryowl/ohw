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
const packetQueue = require('./packetQueue');

class PacketProcessor {
    constructor() {
        this.parser = new GalileoskyParser();
        this.processors = new Map();
        this.initializeProcessors();
        this.processingStats = {
            totalProcessed: 0,
            totalErrors: 0,
            averageProcessingTime: 0,
            lastProcessed: null
        };
    }

    initializeProcessors() {
        this.processors.set('main', this.processMainPacket.bind(this));
        this.processors.set('type33', this.processType33Packet.bind(this));
        this.processors.set('confirmation', this.processConfirmationPacket.bind(this));
    }

    // Main entry point - now uses queue for async processing
    async processPacket(packet, socket) {
        try {
            // Add to queue for asynchronous processing
            const queued = await packetQueue.addPacket(packet, socket, this.processPacketSync.bind(this));
            
            if (!queued) {
                logger.warn('Failed to queue packet - queue may be full');
                return null;
            }

            return { queued: true, timestamp: Date.now() };
        } catch (error) {
            logger.error('Error queuing packet:', error);
            return null;
        }
    }

    // Synchronous processing (called by queue)
    async processPacketSync(packet, socket) {
        const startTime = Date.now();
        
        try {
            // Log raw packet data (with size limit)
            const packetHex = packet.toString('hex').toUpperCase();
            const truncatedHex = packetHex.length > 200 ? packetHex.substring(0, 200) + '...' : packetHex;
            
            logger.info('Processing packet:', {
                hex: truncatedHex,
                length: packet.length,
                timestamp: new Date().toISOString()
            });

            // Log to CSV (with size check)
            if (packet.length <= 1024) { // Only log reasonable sized packets
                csvLogger.logDeviceData(packetHex);
            }

            // Parse the packet first
            const parsedData = parsePacket(packet);
            if (!parsedData) {
                logger.error('Failed to parse packet');
                this.processingStats.totalErrors++;
                return null;
            }

            // Handle multiple records if present
            if (parsedData.records && parsedData.records.length > 1) {
                logger.info(`Processing ${parsedData.records.length} records from packet`);
                
                const processedRecords = [];
                
                // Process records in batches to avoid memory issues
                const batchSize = 10;
                for (let i = 0; i < parsedData.records.length; i += batchSize) {
                    const batch = parsedData.records.slice(i, i + batchSize);
                    
                    const batchPromises = batch.map(async (record, batchIndex) => {
                        const recordIndex = i + batchIndex;
                        
                        // Extract IMEI from record
                        const imei = record.tags['0x03']?.value || parsedData.imei;
                        if (!imei) {
                            logger.warn(`No IMEI found in record ${recordIndex}`);
                            return null;
                        }

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
                        }

                        // Process the record
                        const processed = await this.processMainPacket(record, device.id);
                        if (processed) {
                            // Map the data according to device configuration
                            const mapped = await this.mapPacketData(processed, device.id);
                            
                            // Save to database
                            await this.saveToDatabase(mapped, device.id);
                            
                            // Check for alerts
                            await this.checkAlerts(device.id, mapped);
                            
                            return mapped;
                        }
                        return null;
                    });

                    // Wait for batch to complete
                    const batchResults = await Promise.all(batchPromises);
                    processedRecords.push(...batchResults.filter(r => r !== null));
                    
                    // Small delay between batches to prevent blocking
                    if (i + batchSize < parsedData.records.length) {
                        await new Promise(resolve => setTimeout(resolve, 1));
                    }
                }
                
                logger.info(`Successfully processed ${processedRecords.length} records`);
                this.updateProcessingStats(startTime);
                return processedRecords.length > 0 ? processedRecords[0] : null;
            }

            // Single record processing (existing logic)
            const imei = parsedData.imei;
            if (!imei) {
                logger.error('No IMEI found in packet');
                this.processingStats.totalErrors++;
                return null;
            }

            // Log specific device parameters (with limit)
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
                this.processingStats.totalErrors++;
                return null;
            }

            const processed = await processor(parsedData, device.id);
            if (!processed) {
                logger.error('Failed to process packet');
                this.processingStats.totalErrors++;
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

            this.updateProcessingStats(startTime);
            return mapped;
        } catch (error) {
            logger.error('Packet processing error:', {
                error: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString()
            });
            this.processingStats.totalErrors++;
            throw error;
        }
    }

    // Update processing statistics
    updateProcessingStats(startTime) {
        const processingTime = Date.now() - startTime;
        this.processingStats.totalProcessed++;
        this.processingStats.lastProcessed = new Date().toISOString();
        
        // Calculate rolling average
        const totalTime = this.processingStats.averageProcessingTime * (this.processingStats.totalProcessed - 1) + processingTime;
        this.processingStats.averageProcessingTime = totalTime / this.processingStats.totalProcessed;
    }

    // Get processing statistics
    getProcessingStats() {
        return {
            ...this.processingStats,
            queueStats: packetQueue.getStats(),
            timestamp: new Date().toISOString()
        };
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

    async mapPacketData(processed, deviceId) {
        try {
            // Get device mapping configuration
            const mappings = await deviceMapper.getDeviceMappings(deviceId);
            
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
}

module.exports = new PacketProcessor();
