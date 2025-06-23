// backend/src/services/packetProcessor.js

const config = require('../config');
const logger = require('../utils/logger');
const csvLogger = require('../utils/csvLogger');
const { DataPoint, Record } = require('../models');
const deviceManager = require('./deviceManager');
const deviceMapper = require('./deviceMapper');
const alertManager = require('./alertManager');
const GalileoskyParser = require('./parser');

class PacketProcessor {
    constructor() {
        this.parser = new GalileoskyParser();
        this.processors = new Map();
        this.initializeProcessors();
    }

    initializeProcessors() {
        this.processors.set('main', this.processMainPacket.bind(this));
        this.processors.set('type33', this.processType33Packet.bind(this));
        this.processors.set('confirmation', this.processConfirmationPacket.bind(this));
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

            // Parse the packet first using the new parseSinglePacket function
            const parsedData = await this.parser.parseSinglePacket(packet);
            if (!parsedData) {
                logger.error('Failed to parse packet');
                return null;
            }

            // Handle multiple records if present
            if (parsedData.records && parsedData.records.length > 1) {
                logger.info(`Processing ${parsedData.records.length} records from packet`);
                
                const processedRecords = [];
                
                for (let i = 0; i < parsedData.records.length; i++) {
                    const record = parsedData.records[i];
                    
                    // Extract IMEI from record
                    const imei = record.tags['0x03']?.value || parsedData.imei;
                    if (!imei) {
                        logger.warn(`No IMEI found in record ${i}`);
                        continue;
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
                        
                        // Save to database (already done by parser, but ensure it's processed)
                        await this.saveToDatabase(mapped, device.id);
                        
                        // Check for alerts
                        await this.checkAlerts(device.id, mapped);
                        
                        processedRecords.push(mapped);
                    }
                }
                
                logger.info(`Successfully processed ${processedRecords.length} records`);
                return processedRecords.length > 0 ? processedRecords[0] : null; // Return first record for compatibility
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
                    case '0x40': // Status
                        result.data.status = value;
                        break;
                    case '0x41': // Supply Voltage
                        result.data.supplyVoltage = value;
                        break;
                    case '0x42': // Battery Voltage
                        result.data.batteryVoltage = value;
                        break;
                    case '0x43': // Temperature
                        result.data.temperature = value;
                        break;
                    case '0x44': // Acceleration
                        result.data.acceleration = value;
                        break;
                    case '0x45': // Outputs
                        result.data.outputs = value;
                        break;
                    case '0x46': // Inputs
                        result.data.inputs = value;
                        break;
                    case '0x47': // ECO Driving
                        result.data.ecoDriving = value;
                        break;
                    case '0x48': // Expanded Status
                        result.data.expandedStatus = value;
                        break;
                    case '0x49': // Transmission Channel
                        result.data.transmissionChannel = value;
                        break;
                    case '0x50': // Input Voltage 0
                        result.data.inputVoltage0 = value;
                        break;
                    case '0x51': // Input Voltage 1
                        result.data.inputVoltage1 = value;
                        break;
                    case '0x52': // Input Voltage 2
                        result.data.inputVoltage2 = value;
                        break;
                    case '0x53': // Input Voltage 3
                        result.data.inputVoltage3 = value;
                        break;
                    case '0x20': // Date Time
                        result.data.timestamp = value;
                        break;
                    case '0x21': // Milliseconds
                        result.data.milliseconds = value;
                        break;
                    case '0x10': // Archive Record Number
                        result.data.recordNumber = value;
                        break;
                    case '0xe2': // User Data 0
                        result.data.userData0 = value;
                        break;
                    case '0x0001': // Modbus 0
                        result.data.modbus0 = value;
                        break;
                    case '0x0002': // Modbus 1
                        result.data.modbus1 = value;
                        break;
                    default:
                        // Store unknown tags with their original names
                        result.data[tag] = value;
                        logger.debug(`Processed unknown tag: ${tag} = ${value}`);
                }
            }

            return result;
        } catch (error) {
            logger.error('Error processing main packet:', error);
            throw error;
        }
    }

    async processType33Packet(parsed, deviceId) {
        try {
            const result = {
                type: 'type33',
                deviceId,
                timestamp: new Date(),
                records: parsed.records.map(record => ({
                    timestamp: record.timestamp,
                    coordinates: record.coordinates,
                    speed: record.speed,
                    course: record.course,
                    status: record.status,
                    flags: record.flags
                }))
            };

            return result;
        } catch (error) {
            logger.error('Error processing type 33 packet:', error);
            throw error;
        }
    }

    async processConfirmationPacket(parsed, deviceId) {
        return {
            type: 'confirmation',
            deviceId,
            timestamp: new Date(),
            checksum: parsed.checksum
        };
    }

    async mapPacketData(processed, deviceId) {
        // Get device configuration
        const config = await deviceManager.getDeviceConfig(deviceId);
        if (!config) {
            return processed;
        }

        // Apply mapping rules from configuration
        const mapped = { ...processed };
        if (config.mapping) {
            for (const [key, mapping] of Object.entries(config.mapping)) {
                if (processed.data && processed.data[key]) {
                    mapped.data[key] = this.applyMapping(processed.data[key], mapping);
                }
            }
        }

        return mapped;
    }

    applyMapping(value, mapping) {
        if (!mapping) return value;

        let result = value;

        // Apply scaling if specified
        if (mapping.scale) {
            result *= mapping.scale;
        }

        // Apply offset if specified
        if (mapping.offset) {
            result += mapping.offset;
        }

        // Apply unit conversion if specified
        if (mapping.unit) {
            result = this.convertUnit(result, mapping.unit);
        }

        return result;
    }

    convertUnit(value, unit) {
        // Add unit conversion logic here
        return value;
    }

    async saveToDatabase(data, deviceId) {
        try {
            // Create record with all the parsed data
            const record = await Record.create({
                deviceImei: data.deviceImei,
                timestamp: data.timestamp,
                recordNumber: data.recordNumber,
                milliseconds: data.milliseconds,
                latitude: data.coordinates?.latitude,
                longitude: data.coordinates?.longitude,
                satellites: data.satellites,
                coordinateCorrectness: data.coordinateCorrectness,
                speed: data.speed,
                direction: data.direction,
                height: data.height,
                hdop: data.hdop,
                status: data.status,
                supplyVoltage: data.supplyVoltage,
                batteryVoltage: data.batteryVoltage,
                temperature: data.temperature,
                acceleration: data.acceleration,
                outputs: data.outputs,
                inputs: data.inputs,
                ecoDriving: data.ecoDriving,
                expandedStatus: data.expandedStatus,
                transmissionChannel: data.transmissionChannel,
                inputVoltages: {
                    inputVoltage0: data.inputVoltage0,
                    inputVoltage1: data.inputVoltage1,
                    inputVoltage2: data.inputVoltage2,
                    inputVoltage3: data.inputVoltage3
                },
                gsmInfo: data.gsmInfo,
                sensors: data.sensors,
                userData: {
                    userData0: data.userData0,
                    userData1: data.userData1,
                    userData2: data.userData2,
                    userData3: data.userData3,
                    userData4: data.userData4,
                    userData5: data.userData5,
                    userData6: data.userData6,
                    userData7: data.userData7
                },
                modbusData: {
                    modbus0: data.modbus0,
                    modbus1: data.modbus1,
                    modbus2: data.modbus2,
                    modbus3: data.modbus3,
                    modbus4: data.modbus4,
                    modbus5: data.modbus5,
                    modbus6: data.modbus6,
                    modbus7: data.modbus7,
                    modbus8: data.modbus8,
                    modbus9: data.modbus9,
                    modbus10: data.modbus10,
                    modbus11: data.modbus11,
                    modbus12: data.modbus12,
                    modbus13: data.modbus13,
                    modbus14: data.modbus14,
                    modbus15: data.modbus15
                },
                rawData: data.rawData
            });
            
            logger.info('Record saved successfully:', {
                deviceImei: data.deviceImei,
                timestamp: data.timestamp
            });
        } catch (error) {
            logger.error('Error saving to database:', error);
            throw error;
        }
    }

    async checkAlerts(deviceId, data) {
        try {
            // Get device alerts configuration
            const alerts = await deviceManager.getDeviceAlerts(deviceId);
            if (!alerts) return;

            // Check each alert condition
            for (const alert of alerts) {
                if (this.evaluateAlertCondition(data, alert.condition)) {
                    await this.triggerAlert(deviceId, alert, data);
                }
            }
        } catch (error) {
            logger.error('Error checking alerts:', error);
        }
    }

    evaluateAlertCondition(data, condition) {
        // Add alert condition evaluation logic here
        return false;
    }

    async triggerAlert(deviceId, alert, data) {
        try {
            // Trigger alert
            await db.collection('alerts').insertOne({
                deviceId,
                alertId: alert.id,
                data,
                triggeredAt: new Date()
            });

            // Notify through configured channels
            if (alert.notifications) {
                for (const notification of alert.notifications) {
                    await this.sendNotification(notification, alert, data);
                }
            }
        } catch (error) {
            logger.error('Error triggering alert:', error);
        }
    }

    async sendNotification(notification, alert, data) {
        // Add notification sending logic here
    }

    logDeviceParameters(tags, imei) {
        const parameters = {
            imei: tags['0x03']?.value || tags['0x03'],
            coordinates: tags['0x30']?.value || tags['0x30'],
            timestamp: tags['0x20']?.value || tags['0x20'],
            supplyVoltage: tags['0x41']?.value || tags['0x41'],
            batteryVoltage: tags['0x42']?.value || tags['0x42']
        };

        logger.info('Device Parameters:', {
            imei: parameters.imei,
            coordinates: parameters.coordinates ? {
                latitude: parameters.coordinates.latitude,
                longitude: parameters.coordinates.longitude,
                satellites: parameters.coordinates.satellites
            } : null,
            timestamp: parameters.timestamp ? new Date(parameters.timestamp * 1000).toISOString() : null,
            supplyVoltage: parameters.supplyVoltage ? `${parameters.supplyVoltage}mV` : null,
            batteryVoltage: parameters.batteryVoltage ? `${parameters.batteryVoltage}mV` : null
        });
    }
}

module.exports = PacketProcessor;
