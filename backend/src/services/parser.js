// backend/src/services/parser.js

const EventEmitter = require('events');
const tagDefinitions = require('./tagDefinitions');
const logger = require('../utils/logger');
const config = require('../config');
const PacketTypeHandler = require('./packetTypeHandler');
const TagParser = require('./tagParser');
const { Record, Device } = require('../models');

class GalileoskyParser extends EventEmitter {
    constructor() {
        super();
        this.maxPacketSize = config.parser.maxPacketSize;
        this.validateChecksum = config.parser.validateChecksum;
        this.parsers = new Map();
        this.initializeParsers();
        this.streamBuffer = null;
        this.lastIMEI = null; // Store the last IMEI from small packets
    }

    initializeParsers() {
        // Map packet types according to Galileosky protocol
        this.packetTypes = {
            0x01: this.parseMainPacket,    // Head Packet or Main Packet
            0x15: this.parseIgnorablePacket // Ignorable packet (just needs confirmation)
        };
    }

    /**
     * Main parse entry point
     */
    async parse(buffer) {
        try {
            if (!Buffer.isBuffer(buffer)) {
                throw new Error('Input must be a buffer');
            }

            // Log raw data
            logger.info('Raw packet data:', buffer.toString('hex'));

            if (buffer.length < 3) { // Minimum packet size (header + length)
                throw new Error('Packet too short');
            }

            const header = buffer.readUInt8(0);
            
            // Validate packet structure and checksum
            const { hasUnsentData, actualLength, rawLength } = this.validatePacket(buffer);
            
            // Use PacketTypeHandler to determine packet type
            if (PacketTypeHandler.isMainPacket(header)) {
                // This is a Head Packet or Main Packet
                const result = await this.parseMainPacket(buffer, 0, actualLength);
                result.hasUnsentData = hasUnsentData;
                result.actualLength = actualLength;
                result.rawLength = rawLength;
                return result;
            } else if (PacketTypeHandler.isIgnorablePacket(header)) {
                // This is an ignorable packet, just needs confirmation
                return await this.parseIgnorablePacket(buffer);
            } else {
                // This is an extension packet
                return {
                    type: 'extension',
                    header: header,
                    length: buffer.readUInt16LE(1),
                    hasUnsentData,
                    actualLength,
                    rawLength,
                    raw: buffer
                };
            }
        } catch (error) {
            logger.error('Parsing error:', error);
            throw error;
        }
    }

    /**
     * Validate packet structure and checksum
     */
    validatePacket(buffer) {
        if (buffer.length < 3) {
            throw new Error('Packet too short');
        }

        const header = buffer.readUInt8(0);
        const rawLength = buffer.readUInt16LE(1);
        
        // Extract high-order bit for archive data indicator
        const hasUnsentData = (rawLength & 0x8000) !== 0;
        
        // Extract 15 low-order bits for packet length
        const actualLength = rawLength & 0x7FFF;

        // Check if we have the complete packet (HEAD + LENGTH + DATA + CRC)
        const expectedLength = actualLength + 3;  // Header (1) + Length (2) + Data
        if (buffer.length < expectedLength + 2) {  // +2 for CRC
            throw new Error('Incomplete packet');
        }

        // Verify checksum
        const calculatedChecksum = this.calculateCRC16(buffer.slice(0, expectedLength));
        const receivedChecksum = buffer.readUInt16LE(expectedLength);

        if (calculatedChecksum !== receivedChecksum) {
            throw new Error('Checksum mismatch');
        }

        return {
            hasUnsentData,
            actualLength,
            rawLength
        };
    }

    /**
     * Calculate CRC16 for a packet
     */
    calculateCRC16(buffer) {
        let crc = 0xFFFF;
        for (let i = 0; i < buffer.length; i++) {
            crc ^= buffer[i];
            for (let j = 0; j < 8; j++) {
                if (crc & 0x0001) {
                    crc = (crc >> 1) ^ 0xA001;
                } else {
                    crc = crc >> 1;
                }
            }
        }
        return crc;
    }

    /**
     * Parse main packet
     */
    async parseMainPacket(buffer, offset = 0, actualLength) {
        try {
            const result = {
                header: buffer.readUInt8(offset),
                length: actualLength,
                rawLength: actualLength,
                records: []
            };

            let currentOffset = offset + 3;
            const endOffset = offset + actualLength;

            if (actualLength < 32) {
                const record = { tags: {} };
                let recordOffset = currentOffset;

                while (recordOffset < endOffset - 2) {
                    const tag = buffer.readUInt8(recordOffset);
                    recordOffset++;

                    const tagHex = `0x${tag.toString(16).padStart(2, '0')}`;
                    const definition = tagDefinitions[tagHex];

                    if (!definition) {
                        logger.warn(`Unknown tag: ${tagHex}`);
                        continue;
                    }

                    let value;
                    switch (definition.type) {
                        case 'uint8':
                            value = buffer.readUInt8(recordOffset);
                            recordOffset += 1;
                            break;
                        case 'uint16':
                            value = buffer.readUInt16LE(recordOffset);
                            recordOffset += 2;
                            break;
                        case 'uint32':
                            value = buffer.readUInt32LE(recordOffset);
                            recordOffset += 4;
                            break;
                        case 'uint32_modbus':
                            value = buffer.readUInt32LE(recordOffset)/100;
                            recordOffset += 4;
                            break;
                        case 'int8':
                            value = buffer.readInt8(recordOffset);
                            recordOffset += 1;
                            break;
                        case 'int16':
                            value = buffer.readInt16LE(recordOffset);
                            recordOffset += 2;
                            break;
                        case 'int32':
                            value = buffer.readInt32LE(recordOffset);
                            recordOffset += 4;
                            break;
                        case 'string':
                            value = buffer.toString('utf8', recordOffset, recordOffset + definition.length);
                            recordOffset += definition.length;
                            break;
                        case 'datetime':
                            value = new Date(buffer.readUInt32LE(recordOffset) * 1000);
                            recordOffset += 4;
                            break;
                        case 'coordinates':
                            const satellites = buffer.readUInt8(recordOffset) & 0x0F;
                            const correctness = (buffer.readUInt8(recordOffset) >> 4) & 0x0F;
                            recordOffset++;
                            const lat = buffer.readInt32LE(recordOffset) / 1000000;
                            recordOffset += 4;
                            const lon = buffer.readInt32LE(recordOffset) / 1000000;
                            recordOffset += 4;
                            value = { latitude: lat, longitude: lon, satellites, correctness };
                            break;
                        case 'status':
                            value = buffer.readUInt16LE(recordOffset);
                            recordOffset += 2;
                            break;
                        case 'outputs':
                            const outputsValue = buffer.readUInt16LE(recordOffset);
                            // Convert to binary and create an object with individual output states
                            const outputsBinary = outputsValue.toString(2).padStart(16, '0');
                            value = {
                                raw: outputsValue,
                                binary: outputsBinary,
                                states: {}
                            };
                            // Each bit represents an output state (0-15)
                            for (let i = 0; i < 16; i++) {
                                value.states[`output${i}`] = outputsBinary[15 - i] === '1';
                            }
                            recordOffset += 2;
                            break;
                        case 'inputs':
                            const inputsValue = buffer.readUInt16LE(recordOffset);
                            // Convert to binary and create an object with individual input states
                            const inputsBinary = inputsValue.toString(2).padStart(16, '0');
                            value = {
                                raw: inputsValue,
                                binary: inputsBinary,
                                states: {}
                            };
                            // Each bit represents an input state (0-15)
                            for (let i = 0; i < 16; i++) {
                                value.states[`input${i}`] = inputsBinary[15 - i] === '1';
                            }
                            recordOffset += 2;
                            break;
                        case 'speedDirection':
                            const speedValue = buffer.readUInt16LE(recordOffset);
                            const directionValue = buffer.readUInt16LE(recordOffset + 2);
                            value = {
                                speed: speedValue / 10, // Speed in km/h
                                direction: directionValue / 10 // Direction in degrees
                            };
                            recordOffset += 4;
                            break;
                        default:
                            logger.warn(`Unsupported tag type: ${definition.type}`);
                            recordOffset += definition.length || 1;
                            value = null;
                    }

                    record.tags[tagHex] = {
                        value: value,
                        type: definition.type,
                        description: definition.description
                    };

                    if (tagHex === '0x03' && definition.type === 'string') {
                        this.lastIMEI = value;
                    }
                }

                if (Object.keys(record.tags).length > 0) {
                    result.records.push(record);
                    if (this.lastIMEI) {
                        await this.saveRecordToDatabase(record, this.lastIMEI);
                    }
                }
            } else {
                // For packets >= 32 bytes, check if there's a 0x10 tag (Number Archive Records)
                let hasMultipleRecords = false;
                let searchOffset = currentOffset;
                
                // Look for 0x10 tag to determine if this is a single record or multiple records
                while (searchOffset < endOffset - 2) {
                    if (buffer.readUInt8(searchOffset) === 0x10) {
                        hasMultipleRecords = true;
                        break;
                    }
                    searchOffset++;
                }

                logger.info('Packet analysis:', {
                    actualLength,
                    hasMultipleRecords,
                    searchOffset: searchOffset - currentOffset,
                    timestamp: new Date().toISOString()
                });

                if (hasMultipleRecords) {
                    // Multiple records - parse each record starting with 0x10 tag
                    logger.info('Processing large packet for multiple records');
                    
                    let recordCount = 0;
                    let currentRecordStart = currentOffset;
                    
                    while (currentRecordStart < endOffset - 2) {
                        // Find the next 0x10 tag (start of a new record)
                        let recordStart = currentRecordStart;
                        while (recordStart < endOffset - 2 && buffer.readUInt8(recordStart) !== 0x10) {
                            recordStart++;
                        }
                        
                        if (recordStart >= endOffset - 2) {
                            break; // No more records
                        }
                        
                        recordCount++;
                        logger.info(`Parsing record ${recordCount}, length: ${endOffset - recordStart}`);
                        
                        const record = { tags: {} };
                        let recordOffset = recordStart;
                        const recordEnd = endOffset;
                        
                        // Parse tags for this record
                        while (recordOffset < recordEnd - 2) {
                            const tag = buffer.readUInt8(recordOffset);
                            recordOffset++;
                            
                            // Check if we've reached the start of the next record
                            if (tag === 0x10 && recordOffset > recordStart + 1) {
                                // This is the start of the next record, stop parsing current record
                                recordOffset--;
                                break;
                            }
                            
                            logger.info(`Found tag: 0x${tag.toString(16).padStart(2, '0')}`);
                            
                            if (tag === 0xFE) {
                                const [extendedTags, newOffset] = await this.parseExtendedTags(buffer, recordOffset);
                                Object.assign(record.tags, extendedTags);
                                recordOffset = newOffset;
                                continue;
                            }

                            const tagHex = `0x${tag.toString(16).padStart(2, '0')}`;
                            const definition = tagDefinitions[tagHex];

                            if (!definition) {
                                logger.warn(`Unknown tag: ${tagHex}`);
                                continue;
                            }

                            let value;
                            switch (definition.type) {
                                case 'uint8':
                                    value = buffer.readUInt8(recordOffset);
                                    recordOffset += 1;
                                    break;
                                case 'uint16':
                                    value = buffer.readUInt16LE(recordOffset);
                                    recordOffset += 2;
                                    break;
                                case 'uint32':
                                    value = buffer.readUInt32LE(recordOffset);
                                    recordOffset += 4;
                                    break;
                                case 'uint32_modbus':
                                    value = buffer.readUInt32LE(recordOffset)/100;
                                    recordOffset += 4;
                                    break;
                                case 'int8':
                                    value = buffer.readInt8(recordOffset);
                                    recordOffset += 1;
                                    break;
                                case 'int16':
                                    value = buffer.readInt16LE(recordOffset);
                                    recordOffset += 2;
                                    break;
                                case 'int32':
                                    value = buffer.readInt32LE(recordOffset);
                                    recordOffset += 4;
                                    break;
                                case 'string':
                                    value = buffer.toString('utf8', recordOffset, recordOffset + definition.length);
                                    recordOffset += definition.length;
                                    break;
                                case 'datetime':
                                    value = new Date(buffer.readUInt32LE(recordOffset) * 1000);
                                    recordOffset += 4;
                                    break;
                                case 'coordinates':
                                    const satellites = buffer.readUInt8(recordOffset) & 0x0F;
                                    const correctness = (buffer.readUInt8(recordOffset) >> 4) & 0x0F;
                                    recordOffset++;
                                    const lat = buffer.readInt32LE(recordOffset) / 1000000;
                                    recordOffset += 4;
                                    const lon = buffer.readInt32LE(recordOffset) / 1000000;
                                    recordOffset += 4;
                                    value = { latitude: lat, longitude: lon, satellites, correctness };
                                    break;
                                case 'status':
                                    value = buffer.readUInt16LE(recordOffset);
                                    recordOffset += 2;
                                    break;
                                case 'outputs':
                                    const outputsValue = buffer.readUInt16LE(recordOffset);
                                    // Convert to binary and create an object with individual output states
                                    const outputsBinary = outputsValue.toString(2).padStart(16, '0');
                                    value = {
                                        raw: outputsValue,
                                        binary: outputsBinary,
                                        states: {}
                                    };
                                    // Each bit represents an output state (0-15)
                                    for (let i = 0; i < 16; i++) {
                                        value.states[`output${i}`] = outputsBinary[15 - i] === '1';
                                    }
                                    recordOffset += 2;
                                    break;
                                case 'inputs':
                                    const inputsValue = buffer.readUInt16LE(recordOffset);
                                    // Convert to binary and create an object with individual input states
                                    const inputsBinary = inputsValue.toString(2).padStart(16, '0');
                                    value = {
                                        raw: inputsValue,
                                        binary: inputsBinary,
                                        states: {}
                                    };
                                    // Each bit represents an input state (0-15)
                                    for (let i = 0; i < 16; i++) {
                                        value.states[`input${i}`] = inputsBinary[15 - i] === '1';
                                    }
                                    recordOffset += 2;
                                    break;
                                case 'speedDirection':
                                    const speedValue = buffer.readUInt16LE(recordOffset);
                                    const directionValue = buffer.readUInt16LE(recordOffset + 2);
                                    value = {
                                        speed: speedValue / 10, // Speed in km/h
                                        direction: directionValue / 10 // Direction in degrees
                                    };
                                    recordOffset += 4;
                                    break;
                                default:
                                    logger.warn(`Unsupported tag type: ${definition.type}`);
                                    recordOffset += definition.length || 1;
                                    value = null;
                            }

                            record.tags[tagHex] = {
                                value: value,
                                type: definition.type,
                                description: definition.description
                            };

                            if (tagHex === '0x03' && definition.type === 'string') {
                                this.lastIMEI = value;
                            }
                        }

                        // Log extracted tags for debugging
                        const extractedTags = Object.keys(record.tags);
                        logger.info(`Record ${recordCount} extracted tags: [${extractedTags.join(', ')}]`);

                        if (Object.keys(record.tags).length > 0) {
                            result.records.push(record);
                            if (this.lastIMEI) {
                                await this.saveRecordToDatabase(record, this.lastIMEI);
                            }
                        }

                        // Move to next record start position
                        currentRecordStart = recordOffset;
                    }
                    
                    logger.info(`Found ${recordCount} records in packet`);
                } else {
                    // Single record - parse directly from currentOffset
                    logger.info('Processing single record packet');
                    const record = { tags: {} };
                    let recordOffset = currentOffset;

                    while (recordOffset < endOffset - 2) {
                        const tag = buffer.readUInt8(recordOffset);
                        recordOffset++;

                        if (tag === 0xFE) {
                            const [extendedTags, newOffset] = await this.parseExtendedTags(buffer, recordOffset);
                            Object.assign(record.tags, extendedTags);
                            recordOffset = newOffset;
                            continue;
                        }

                        const tagHex = `0x${tag.toString(16).padStart(2, '0')}`;
                        const definition = tagDefinitions[tagHex];

                        if (!definition) {
                            logger.warn(`Unknown tag: ${tagHex}`);
                            continue;
                        }

                        let value;
                        switch (definition.type) {
                            case 'uint8':
                                value = buffer.readUInt8(recordOffset);
                                recordOffset += 1;
                                break;
                            case 'uint16':
                                value = buffer.readUInt16LE(recordOffset);
                                recordOffset += 2;
                                break;
                            case 'uint32':
                                value = buffer.readUInt32LE(recordOffset);
                                recordOffset += 4;
                                break;
                            case 'uint32_modbus':
                                value = buffer.readUInt32LE(recordOffset)/100;
                                recordOffset += 4;
                                break;
                            case 'int8':
                                value = buffer.readInt8(recordOffset);
                                recordOffset += 1;
                                break;
                            case 'int16':
                                value = buffer.readInt16LE(recordOffset);
                                recordOffset += 2;
                                break;
                            case 'int32':
                                value = buffer.readInt32LE(recordOffset);
                                recordOffset += 4;
                                break;
                            case 'string':
                                value = buffer.toString('utf8', recordOffset, recordOffset + definition.length);
                                recordOffset += definition.length;
                                break;
                            case 'datetime':
                                value = new Date(buffer.readUInt32LE(recordOffset) * 1000);
                                recordOffset += 4;
                                break;
                            case 'coordinates':
                                const satellites = buffer.readUInt8(recordOffset) & 0x0F;
                                const correctness = (buffer.readUInt8(recordOffset) >> 4) & 0x0F;
                                recordOffset++;
                                const lat = buffer.readInt32LE(recordOffset) / 1000000;
                                recordOffset += 4;
                                const lon = buffer.readInt32LE(recordOffset) / 1000000;
                                recordOffset += 4;
                                value = { latitude: lat, longitude: lon, satellites, correctness };
                                break;
                            case 'status':
                                value = buffer.readUInt16LE(recordOffset);
                                recordOffset += 2;
                                break;
                            case 'outputs':
                                const outputsValue = buffer.readUInt16LE(recordOffset);
                                // Convert to binary and create an object with individual output states
                                const outputsBinary = outputsValue.toString(2).padStart(16, '0');
                                value = {
                                    raw: outputsValue,
                                    binary: outputsBinary,
                                    states: {}
                                };
                                // Each bit represents an output state (0-15)
                                for (let i = 0; i < 16; i++) {
                                    value.states[`output${i}`] = outputsBinary[15 - i] === '1';
                                }
                                recordOffset += 2;
                                break;
                            case 'inputs':
                                const inputsValue = buffer.readUInt16LE(recordOffset);
                                // Convert to binary and create an object with individual input states
                                const inputsBinary = inputsValue.toString(2).padStart(16, '0');
                                value = {
                                    raw: inputsValue,
                                    binary: inputsBinary,
                                    states: {}
                                };
                                // Each bit represents an input state (0-15)
                                for (let i = 0; i < 16; i++) {
                                    value.states[`input${i}`] = inputsBinary[15 - i] === '1';
                                }
                                recordOffset += 2;
                                break;
                            case 'speedDirection':
                                const speedValue = buffer.readUInt16LE(recordOffset);
                                const directionValue = buffer.readUInt16LE(recordOffset + 2);
                                value = {
                                    speed: speedValue / 10, // Speed in km/h
                                    direction: directionValue / 10 // Direction in degrees
                                };
                                recordOffset += 4;
                                break;
                            default:
                                logger.warn(`Unsupported tag type: ${definition.type}`);
                                recordOffset += definition.length || 1;
                                value = null;
                        }

                        record.tags[tagHex] = {
                            value: value,
                            type: definition.type,
                            description: definition.description
                        };

                        if (tagHex === '0x03' && definition.type === 'string') {
                            this.lastIMEI = value;
                        }
                    }

                    if (Object.keys(record.tags).length > 0) {
                        result.records.push(record);
                        if (this.lastIMEI) {
                            await this.saveRecordToDatabase(record, this.lastIMEI);
                        }
                    }
                }
            }

            return result;
        } catch (error) {
            logger.error('Error parsing main packet:', error);
            throw error;
        }
    }

    /**
     * Parse compressed packet
     */
    async parseCompressedPacket(buffer) {
        const length = buffer.readUInt16LE(1);
        const result = {
            type: 'compressed',
            length: length,
            records: [],
            raw: buffer
        };

        let offset = 3; // Skip header and length

        while (offset < length + 3) {
            const record = await this.parseCompressedRecord(buffer, offset);
            result.records.push(record);
            offset = record.nextOffset;
        }

        // Verify checksum
        const checksum = buffer.readUInt16LE(length + 1);
        const calculatedChecksum = this.calculateCRC16(buffer.slice(0, length + 1));
        result.checksumValid = checksum === calculatedChecksum;

        return result;
    }

    /**
     * Parse compressed record
     */
    async parseCompressedRecord(buffer, offset) {
        const record = {
            minimalData: await this.parseMinimalDataSet(buffer.slice(offset, offset + 10)),
            tags: {},
            nextOffset: offset + 10
        };

        // Parse tags list
        const tagsCount = buffer.readUInt8(record.nextOffset);
        record.nextOffset++;

        if (tagsCount < 32) {
            // Parse tag numbers
            for (let i = 0; i < tagsCount; i++) {
                const tag = buffer.readUInt8(record.nextOffset + i);
                const tagHex = `0x${tag.toString(16).toUpperCase()}`;
                const [value, nextOffset] = await this.parseTagValue(buffer, record.nextOffset + tagsCount, tag);
                record.tags[tagHex] = {
                    value: value,
                    type: tagDefinitions[tagHex]?.type,
                    description: tagDefinitions[tagHex]?.description
                };
                record.nextOffset = nextOffset;
            }
        } else {
            // Parse tag bitmask
            const bitmask = buffer.readUInt32LE(record.nextOffset);
            record.nextOffset += 4;
            
            for (let i = 0; i < 32; i++) {
                if (bitmask & (1 << i)) {
                    const tagHex = `0x${i.toString(16).toUpperCase()}`;
                    const [value, nextOffset] = await this.parseTagValue(buffer, record.nextOffset, i);
                    record.tags[tagHex] = {
                        value: value,
                        type: tagDefinitions[tagHex]?.type,
                        description: tagDefinitions[tagHex]?.description
                    };
                    record.nextOffset = nextOffset;
                }
            }
        }

        return record;
    }

    /**
     * Parse minimal data set
     */
    parseMinimalDataSet(buffer) {
        return {
            timestamp: this.parseTimestamp(buffer.readUInt32LE(0)),
            coordinates: {
                valid: !(buffer.readUInt8(4) & 0x01),
                latitude: this.parseLatitude(buffer.readUInt32LE(4) & 0x1FFFFFFF),
                longitude: this.parseLongitude(buffer.readUInt32LE(5) & 0x1FFFFFFF)
            },
            alarm: !!(buffer.readUInt8(8) & 0x01),
            userTag: buffer.readUInt8(9)
        };
    }

    /**
     * Parse a tag from the packet
     */
    parseTag(buffer, offset) {
        const tagType = buffer.readUInt8(offset);
        let value;
        let length;

        // Get tag definition
        const tagDef = tagDefinitions[`0x${tagType.toString(16).padStart(2, '0')}`];
        if (!tagDef) {
            logger.warn(`Unknown tag type: 0x${tagType.toString(16)}`);
            return [null, offset + 1];
        }

        // Parse value based on tag definition
        switch (tagDef.type) {
            case 'uint8':
                value = buffer.readUInt8(offset + 1);
                length = 1;
                break;
            case 'uint16':
                value = buffer.readUInt16LE(offset + 1);
                length = 2;
                break;
            case 'uint32':
                value = buffer.readUInt32LE(offset + 1);
                length = 4;
                break;
            case 'uint32_modbus':
                    value = buffer.readUInt32LE(offset + 1)/100;
                length = 4;
                break;
            case 'int8':
                value = buffer.readInt8(offset + 1);
                length = 1;
                break;
            case 'int16':
                value = buffer.readInt16LE(offset + 1);
                length = 2;
                break;
            case 'int32':
                value = buffer.readInt32LE(offset + 1);
                length = 4;
                break;
            case 'string':
                if (tagDef.length) {
                    // Fixed length string (like IMEI)
                    value = buffer.slice(offset + 1, offset + 1 + tagDef.length).toString('ascii');
                    length = tagDef.length;
                } else {
                    // Variable length string
                    length = buffer.readUInt8(offset + 1);
                    value = buffer.slice(offset + 2, offset + 2 + length).toString('ascii');
                    length += 1; // Add 1 for the length byte
                }
                break;
            case 'coordinates':
                const lat = buffer.readInt32LE(offset + 1) / 10000000;
                const lon = buffer.readInt32LE(offset + 5) / 10000000;
                const satellites = buffer.readUInt8(offset + 8);
                value = { latitude: lat, longitude: lon, satellites };
                length = 9;
                break;
            case 'datetime':
                value = new Date(buffer.readUInt32LE(offset + 1) * 1000);
                length = 4;
                break;
            case 'status':
                value = buffer.readUInt16LE(offset + 1);
                length = 2;
                break;
            default:
                logger.warn(`Unsupported tag type: ${tagDef.type}`);
                return [null, offset + 1];
        }

        return [{
            type: tagType,
            value: value,
            definition: tagDef
        }, offset + 1 + length];
    }

    /**
     * Parse tag value based on tag definition
     */
    async parseTagValue(buffer, offset, tag) {
        // Validate buffer boundaries
        if (offset >= buffer.length) {
            logger.warn('Buffer boundary exceeded:', { offset, bufferLength: buffer.length });
            return [null, offset + 1];
        }

        // Convert tag to hex format for consistent lookup
        const tagHex = `0x${tag.toString(16).toUpperCase()}`;
        
        // Get tag definition
        const definition = tagDefinitions[tagHex];

        if (!definition) {
            // Check if this is an extended tag (0x80-0xFF)
            if (tag >= 0x80) {
                logger.warn(`Extended tag not implemented: ${tagHex}`);
                // For extended tags, we'll skip 4 bytes as a default
                return [null, offset + 4];
            }
            
            logger.error(`Unknown tag: ${tagHex}`);
            // For unknown tags, try to determine length based on common patterns
            // Most tags are either 1, 2, or 4 bytes
            let skipLength = 1;
            if (tag >= 0x30 && tag <= 0x3F) { // Common 2-byte tags
                skipLength = 2;
            } else if (tag >= 0x40 && tag <= 0x4F) { // Common 4-byte tags
                skipLength = 4;
            }
            return [null, offset + skipLength];
        }

        let value, nextOffset;

        try {
            switch (definition.type) {
                case 'coordinates':
                    if (offset + 9 > buffer.length) {
                        logger.warn('Not enough data for coordinates tag');
                        return [null, offset + 1];
                    }
                    [value, nextOffset] = await this.parseCoordinates(buffer, offset);
                    break;
                case 'status':
                    if (offset + 2 > buffer.length) {
                        logger.warn('Not enough data for status tag');
                        return [null, offset + 1];
                    }
                    [value, nextOffset] = await this.parseStatus(buffer, offset);
                    break;
                case 'acceleration':
                    if (offset + 4 > buffer.length) {
                        logger.warn('Not enough data for acceleration tag');
                        return [null, offset + 1];
                    }
                    [value, nextOffset] = await this.parseAcceleration(buffer, offset);
                    break;
                case 'uint8':
                    if (offset + 1 > buffer.length) {
                        logger.warn('Not enough data for uint8 tag');
                        return [null, offset + 1];
                    }
                    value = buffer.readUInt8(offset);
                    nextOffset = offset + 1;
                    break;
                case 'uint16':
                    if (offset + 2 > buffer.length) {
                        logger.warn('Not enough data for uint16 tag');
                        return [null, offset + 1];
                    }
                    value = buffer.readUInt16LE(offset);
                    nextOffset = offset + 2;
                    break;
                case 'uint32_modbus':
                        if (offset + 4 > buffer.length) {
                            logger.warn('Not enough data for uint32 tag');
                            return [null, offset + 1];
                        }
                        value = buffer.readUInt32LE(offset)/100;
                        nextOffset = offset + 4;
                    break;
                case 'uint32':
                    if (offset + 4 > buffer.length) {
                        logger.warn('Not enough data for uint32 tag');
                        return [null, offset + 1];
                    }
                    value = buffer.readUInt32LE(offset);
                    // Check if this is a Modbus tag (0x0001-0x0031)
                    if (tag >= 0x0001 && tag <= 0x0031) {
                        value = value / 100;
                    }
                    nextOffset = offset + 4;
                    break;
                case 'int8':
                    if (offset + 1 > buffer.length) {
                        logger.warn('Not enough data for int8 tag');
                        return [null, offset + 1];
                    }
                    value = buffer.readInt8(offset);
                    nextOffset = offset + 1;
                    break;
                case 'int16':
                    if (offset + 2 > buffer.length) {
                        logger.warn('Not enough data for int16 tag');
                        return [null, offset + 1];
                    }
                    value = buffer.readInt16LE(offset);
                    nextOffset = offset + 2;
                    break;
                case 'int32':
                    if (offset + 4 > buffer.length) {
                        logger.warn('Not enough data for int32 tag');
                        return [null, offset + 1];
                    }
                    value = buffer.readInt32LE(offset);
                    nextOffset = offset + 4;
                    break;
                case 'string':
                    const length = definition.length || buffer.readUInt8(offset);
                    const startOffset = definition.length ? offset : offset + 1;
                    if (startOffset + length > buffer.length) {
                        logger.warn('Not enough data for string tag');
                        return [null, offset + 1];
                    }
                    value = buffer.toString('utf8', startOffset, startOffset + length);
                    nextOffset = startOffset + length;
                    if (tagHex === '0x03') { // IMEI tag
                        logger.info('Device IMEI:', value);
                    }
                    break;
                case 'datetime':
                    if (offset + 4 > buffer.length) {
                        logger.warn('Not enough data for datetime tag');
                        return [null, offset + 1];
                    }
                    value = this.parseTimestamp(buffer.readUInt32LE(offset));
                    nextOffset = offset + 4;
                    break;
                default:
                    logger.error(`Unsupported tag type: ${definition.type}`);
                    // Skip this tag and continue parsing
                    return [null, offset + 1];
            }

            return [value, nextOffset];
        } catch (error) {
            logger.error(`Error parsing tag ${tagHex}:`, error);
            return [null, offset + 1];
        }
    }

    /**
     * Parse extended tags block
     */
    async parseExtendedTags(buffer, offset) {
        const result = {};
        let currentOffset = offset;
        
        // Read the length of extended tags block (2 bytes)
        const length = buffer.readUInt16LE(currentOffset);
        currentOffset += 2;
        
        const endOffset = currentOffset + length;
        
        while (currentOffset < endOffset) {
            // Extended tags are 2 bytes each
            const tag = buffer.readUInt16LE(currentOffset);
            currentOffset += 2;
            
            // Look up extended tag definition
            const tagHex = `0x${tag.toString(16).padStart(4, '0')}`;
            const definition = tagDefinitions[tagHex];

            if (!definition) {
                logger.warn(`Unknown extended tag: ${tagHex}`);
                // Skip 4 bytes for unknown extended tags
                currentOffset += 4;
                continue;
            }

            let value;
            switch (definition.type) {
                case 'uint8':
                    value = buffer.readUInt8(currentOffset);
                    currentOffset += 1;
                    break;
                case 'uint16':
                    value = buffer.readUInt16LE(currentOffset);
                    currentOffset += 2;
                    break;
                case 'uint32':
                    value = buffer.readUInt32LE(currentOffset);
                    currentOffset += 4;
                    break;
                case 'uint32_modbus':
                    value = buffer.readUInt32LE(currentOffset)/100;
                    currentOffset += 4;
                    break;
                case 'int8':
                    value = buffer.readInt8(currentOffset);
                    currentOffset += 1;
                    break;
                case 'int16':
                    value = buffer.readInt16LE(currentOffset);
                    currentOffset += 2;
                    break;
                case 'int32':
                    value = buffer.readInt32LE(currentOffset);
                    currentOffset += 4;
                    break;
                default:
                    logger.warn(`Unsupported extended tag type: ${definition.type}`);
                    currentOffset += 4; // Default to 4 bytes
                    value = null;
            }

            result[tagHex] = {
                value: value,
                type: definition.type,
                description: definition.description
            };
        }

        return [result, currentOffset];
    }

    /**
     * Parse coordinates
     */
    async parseCoordinates(buffer, offset) {
        const firstByte = buffer.readUInt8(offset);
        const satellites = firstByte & 0x0F;
        const coordinatesCorrectness = (firstByte >> 4) & 0x0F;
        const latitude = buffer.readInt32LE(offset + 1) / 1000000;
        const longitude = buffer.readInt32LE(offset + 5) / 1000000;
        
        const result = {
            satellites,
            coordinatesCorrectness,
            latitude,
            longitude
        };
        
        logger.info('Coordinates:', {
            latitude: latitude.toFixed(6),
            longitude: longitude.toFixed(6),
            satellites,
            coordinatesCorrectness
        });
        
        return [result, offset + 9];
    }

    /**
     * Parse latitude
     */
    parseLatitude(value) {
        const sign = value & 0x80000000 ? -1 : 1;
        return sign * (value & 0x7FFFFFFF) / 1000000.0;
    }

    /**
     * Parse longitude
     */
    parseLongitude(value) {
        const sign = value & 0x80000000 ? -1 : 1;
        return sign * (value & 0x7FFFFFFF) / 1000000.0;
    }

    /**
     * Parse timestamp
     */
    parseTimestamp(seconds) {
        return new Date(seconds * 1000);
    }

    /**
     * Parse device status
     */
    async parseStatus(buffer, offset) {
        const status = buffer.readUInt16LE(offset);
        return [{
            powerSupply: !!(status & 0x0001),
            gpsValid: !!(status & 0x0002),
            gsmValid: !!(status & 0x0004),
            alarm: !!(status & 0x0008),
            ignition: !!(status & 0x0010),
            movement: !!(status & 0x0020),
            charging: !!(status & 0x0040),
            lowBattery: !!(status & 0x0080),
            gsmSignal: (status & 0x0300) >> 8,
            gpsSignal: (status & 0x0C00) >> 10,
            gsmAntenna: !!(status & 0x1000),
            gpsAntenna: !!(status & 0x2000),
            output1: !!(status & 0x4000),
            output2: !!(status & 0x8000)
        }, offset + 2];
    }

    /**
     * Parse acceleration
     */
    async parseAcceleration(buffer, offset) {
        const value = buffer.readUInt32LE(offset);
        return [{
            x: (value & 0x000000FF) - 128,
            y: ((value & 0x0000FF00) >> 8) - 128,
            z: ((value & 0x00FF0000) >> 16) - 128
        }, offset + 4];
    }

    /**
     * Parse confirmation packet (3 bytes: 0x02 + CRC16)
     */
    parseConfirmationPacket(buffer) {
        if (buffer.length < 3) {
            throw new Error('Confirmation packet too short');
        }

        const header = buffer.readUInt8(0);
        if (header !== 0x02) {
            throw new Error('Invalid confirmation packet header');
        }

        return {
            type: 'confirmation',
            header: header,
            checksum: buffer.readUInt16LE(1)
        };
    }

    /**
     * Parse Garmin FMI packet
     */
    parseGarminPacket(buffer) {
        const length = buffer.readUInt16LE(1);
        return {
            type: 'garmin',
            length: length,
            data: buffer.slice(3, length + 3),
            checksum: buffer.readUInt16LE(length + 1)
        };
    }

    /**
     * Add validation methods
     */
    validatePacket(buffer) {
        if (buffer.length < 3) {
            throw new Error('Packet too short');
        }

        const header = buffer.readUInt8(0);
        const rawLength = buffer.readUInt16LE(1);
        
        // Extract high-order bit for archive data indicator
        const hasUnsentData = (rawLength & 0x8000) !== 0;
        
        // Extract 15 low-order bits for packet length
        const actualLength = rawLength & 0x7FFF;

        // Check if we have the complete packet (HEAD + LENGTH + DATA + CRC)
        const expectedLength = actualLength + 3;  // Header (1) + Length (2) + Data
        if (buffer.length < expectedLength + 2) {  // +2 for CRC
            throw new Error('Incomplete packet');
        }

        // Verify checksum
        const calculatedChecksum = this.calculateCRC16(buffer.slice(0, expectedLength));
        const receivedChecksum = buffer.readUInt16LE(expectedLength);

        if (calculatedChecksum !== receivedChecksum) {
            throw new Error('Checksum mismatch');
        }

        return {
            hasUnsentData,
            actualLength,
            rawLength
        };
    }

    /**
     * Add packet statistics
     */
    getPacketStatistics(parsed) {
        return {
            packetType: parsed.type,
            timestamp: new Date(),
            tagsCount: Object.keys(parsed.tags).length,
            hasExtendedTags: !!parsed.tags.extended,
            validChecksum: parsed.checksumValid,
            rawLength: parsed.raw.length
        };
    }

    /**
     * Parse incoming packet
     */
    async parsePacket(buffer) {
        try {
            // Add buffer to our stream buffer
            if (!this.streamBuffer) {
                this.streamBuffer = Buffer.alloc(0);
            }
            this.streamBuffer = Buffer.concat([this.streamBuffer, buffer]);

            // Process all complete packets in the buffer
            const packets = [];
            while (this.streamBuffer.length > 0) {
                // Check if we have enough data for a header
                if (this.streamBuffer.length < 3) {
                    break;
                }

                // Get packet type and length
                const packetType = this.streamBuffer[0];
                const length = this.streamBuffer.readUInt16LE(1);

                // Check if we have a complete packet
                if (this.streamBuffer.length < length + 3) {
                    break;
                }

                // Extract the complete packet
                const packet = this.streamBuffer.slice(0, length + 3);
                this.streamBuffer = this.streamBuffer.slice(length + 3);

                // Parse the packet
                const parser = this.packetTypes[packetType];
                if (!parser) {
                    throw new Error(`Unknown packet type: 0x${packetType.toString(16)}`);
                }

                const result = await parser.call(this, packet);
                packets.push(result);

                // Send confirmation packet (0x02) with checksum
                const checksum = this.calculateChecksum(packet);
                const confirmationPacket = Buffer.alloc(3);
                confirmationPacket[0] = 0x02;
                confirmationPacket.writeUInt16LE(checksum, 1);
                
                // Send confirmation packet back to the device
                if (this.socket && this.socket.writable) {
                    this.socket.write(confirmationPacket);
                }
            }

            return packets;
        } catch (error) {
            console.error('Error parsing packet:', error);
            throw error;
        }
    }

    /**
     * Calculate checksum for a packet
     */
    calculateChecksum(packet) {
        let sum = 0;
        for (let i = 0; i < packet.length; i++) {
            sum += packet[i];
        }
        return sum & 0xFFFF;
    }

    /**
     * Parse identification data structure
     */
    async parseIdentificationData(buffer, offset) {
        const result = {
            packetId: buffer.readUInt32LE(offset),
            imei: buffer.toString('ascii', offset + 4, offset + 19),
            sessionStatus: buffer.readUInt8(offset + 19),
            emptyField: buffer.readUInt32LE(offset + 20),
            sendingTime: this.parseTimestamp(buffer.readUInt32LE(offset + 24))
        };
        logger.info('Device IMEI:', result.imei);
        return result;
    }

    async handleIncompletePacket(socket, packetInfo) {
        logger.info('Incomplete packet, waiting for more data...', packetInfo);
        
        // Send confirmation packet (023FFA)
        const confirmationPacket = Buffer.from([0x02, 0x3F, 0xFA]);
        socket.write(confirmationPacket);
        logger.info('Sent confirmation packet: 023FFA');
        
        // Store the incomplete packet for later processing
        this.incompletePackets.set(socket, packetInfo);
    }

    /**
     * Parse type 0x33 packet (series of records)
     */
    async parseType33Packet(buffer) {
        try {
            // Validate packet first
            this.validatePacket(buffer);

            const result = {
                type: 'type33',
                header: buffer.readUInt8(0),
                length: buffer.readUInt16LE(1),
                records: [],
                raw: buffer
            };

            let offset = 3; // Skip header and length
            const recordLength = 32;

            while (offset + recordLength <= buffer.length - 2) { // -2 for CRC
                try {
                    const record = {
                        timestamp: new Date(buffer.readUInt32LE(offset) * 1000),
                        coordinates: {
                            latitude: buffer.readInt32LE(offset + 4) / 10000000,
                            longitude: buffer.readInt32LE(offset + 8) / 10000000
                        },
                        speed: buffer.readUInt16LE(offset + 12) / 10,
                        course: buffer.readUInt16LE(offset + 14) / 10,
                        status: buffer.readUInt16LE(offset + 16),
                        flags: {
                            value: buffer.readUInt32LE(offset + 18),
                            hex: buffer.slice(offset + 18, offset + 22).toString('hex').toUpperCase()
                        },
                        raw: buffer.slice(offset, offset + recordLength)
                    };
                    result.records.push(record);
                    offset += recordLength;
                } catch (error) {
                    logger.error('Error parsing type 33 record:', error);
                    break;
                }
            }

            return result;
        } catch (error) {
            logger.error('Error parsing type 33 packet:', error);
            throw error;
        }
    }

    /**
     * Parse ignorable packet (0x15)
     */
    async parseIgnorablePacket(buffer) {
        return {
            type: 'ignorable',
            header: buffer.readUInt8(0),
            length: buffer.readUInt16LE(1),
            raw: buffer
        };
    }

    async ensureDeviceExists(imei) {
        try {
            const [device] = await Device.findOrCreate({
                where: { imei },
                defaults: {
                    name: `Device ${imei}`,
                    lastSeen: new Date()
                }
            });
            return device;
        } catch (error) {
            logger.error(`Error ensuring device exists: ${error.message}`);
            throw error;
        }
    }

    async saveRecordToDatabase(record, imei) {
        try {
            // Ensure device exists before saving record
            await this.ensureDeviceExists(imei);

            // Debug: Log the record tags
            logger.info('Record tags for debugging:', {
                imei,
                tagCount: Object.keys(record.tags).length,
                tags: Object.keys(record.tags),
                timestamp: new Date().toISOString()
            });

            // Debug: Log specific field values
            logger.info('Field values for debugging:', {
                imei,
                inputStates: {
                    input0: record.tags['0x46']?.value?.states.input0,
                    input1: record.tags['0x46']?.value?.states.input1,
                    input2: record.tags['0x46']?.value?.states.input2,
                    input3: record.tags['0x46']?.value?.states.input3
                },
                inputVoltages: {
                    '0x50': record.tags['0x50']?.value,
                    '0x51': record.tags['0x51']?.value,
                    '0x52': record.tags['0x52']?.value,
                    '0x53': record.tags['0x53']?.value,
                    '0x54': record.tags['0x54']?.value,
                    '0x55': record.tags['0x55']?.value,
                    '0x56': record.tags['0x56']?.value
                },
                userData: {
                    '0xe2': record.tags['0xe2']?.value,
                    '0xe3': record.tags['0xe3']?.value,
                    '0xe4': record.tags['0xe4']?.value,
                    '0xe5': record.tags['0xe5']?.value,
                    '0xe6': record.tags['0xe6']?.value,
                    '0xe7': record.tags['0xe7']?.value,
                    '0xe8': record.tags['0xe8']?.value,
                    '0xe9': record.tags['0xe9']?.value
                },
                modbusData: {
                    '0x0001': record.tags['0x0001']?.value,
                    '0x0002': record.tags['0x0002']?.value,
                    '0x0003': record.tags['0x0003']?.value,
                    '0x0004': record.tags['0x0004']?.value,
                    '0x0005': record.tags['0x0005']?.value,
                    '0x0006': record.tags['0x0006']?.value,
                    '0x0007': record.tags['0x0007']?.value,
                    '0x0008': record.tags['0x0008']?.value,
                    '0x0009': record.tags['0x0009']?.value,
                    '0x000a': record.tags['0x000a']?.value,
                    '0x000b': record.tags['0x000b']?.value,
                    '0x000c': record.tags['0x000c']?.value,
                    '0x000d': record.tags['0x000d']?.value,
                    '0x000e': record.tags['0x000e']?.value,
                    '0x000f': record.tags['0x000f']?.value,
                    '0x0010': record.tags['0x0010']?.value
                },
                timestamp: new Date().toISOString()
            });

            // Extract input states from the inputs tag
            const inputsTag = record.tags['0x46'];
            const inputStates = inputsTag?.value?.states || {};

            // Extract output states from the outputs tag
            const outputsTag = record.tags['0x45'];
            const outputStates = outputsTag?.value?.states || {};

            const recordData = {
                deviceImei: imei,
                timestamp: record.tags['0x20']?.value || new Date(),
                recordNumber: record.tags['0x10']?.value,
                milliseconds: record.tags['0x21']?.value,
                latitude: record.tags['0x30']?.value?.latitude,
                longitude: record.tags['0x30']?.value?.longitude,
                satellites: record.tags['0x30']?.value?.satellites,
                coordinateCorrectness: record.tags['0x30']?.value?.correctness,
                speed: record.tags['0x33']?.value?.speed,
                direction: record.tags['0x33']?.value?.direction,
                height: record.tags['0x34']?.value,
                hdop: record.tags['0x35']?.value,
                status: record.tags['0x40']?.value,
                supplyVoltage: record.tags['0x41']?.value,
                batteryVoltage: record.tags['0x42']?.value,
                temperature: record.tags['0x43']?.value,
                acceleration: record.tags['0x44']?.value,
                outputs: record.tags['0x45']?.value,
                inputs: record.tags['0x46']?.value,
                ecoDriving: record.tags['0x47']?.value,
                expandedStatus: record.tags['0x48']?.value,
                transmissionChannel: record.tags['0x49']?.value,
                // Input states - map from the inputs tag states
                input0: inputStates.input0 || false,
                input1: inputStates.input1 || false,
                input2: inputStates.input2 || false,
                input3: inputStates.input3 || false,
                // Input voltages
                inputVoltage0: record.tags['0x50']?.value,
                inputVoltage1: record.tags['0x51']?.value,
                inputVoltage2: record.tags['0x52']?.value,
                inputVoltage3: record.tags['0x53']?.value,
                inputVoltage4: record.tags['0x54']?.value,
                inputVoltage5: record.tags['0x55']?.value,
                inputVoltage6: record.tags['0x56']?.value,
                // User data
                userData0: record.tags['0xe2']?.value?.toString(),
                userData1: record.tags['0xe3']?.value?.toString(),
                userData2: record.tags['0xe4']?.value?.toString(),
                userData3: record.tags['0xe5']?.value?.toString(),
                userData4: record.tags['0xe6']?.value?.toString(),
                userData5: record.tags['0xe7']?.value?.toString(),
                userData6: record.tags['0xe8']?.value?.toString(),
                userData7: record.tags['0xe9']?.value?.toString(),
                // Modbus data
                modbus0: record.tags['0x0001']?.value?.toString(),
                modbus1: record.tags['0x0002']?.value?.toString(),
                modbus2: record.tags['0x0003']?.value?.toString(),
                modbus3: record.tags['0x0004']?.value?.toString(),
                modbus4: record.tags['0x0005']?.value?.toString(),
                modbus5: record.tags['0x0006']?.value?.toString(),
                modbus6: record.tags['0x0007']?.value?.toString(),
                modbus7: record.tags['0x0008']?.value?.toString(),
                modbus8: record.tags['0x0009']?.value?.toString(),
                modbus9: record.tags['0x000a']?.value?.toString(),
                modbus10: record.tags['0x000b']?.value?.toString(),
                modbus11: record.tags['0x000c']?.value?.toString(),
                modbus12: record.tags['0x000d']?.value?.toString(),
                modbus13: record.tags['0x000e']?.value?.toString(),
                modbus14: record.tags['0x000f']?.value?.toString(),
                modbus15: record.tags['0x0010']?.value?.toString(),
                rawData: JSON.stringify(record.tags)
            };

            await Record.create(recordData);
            logger.info(`Record saved for device ${imei} with ${Object.keys(record.tags).length} tags`);
        } catch (error) {
            logger.error(`Error saving record to database: ${error.message}`);
            throw error;
        }
    }

}

// Export the class
module.exports = GalileoskyParser;
