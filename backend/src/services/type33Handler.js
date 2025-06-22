// backend/src/services/type33Handler.js

const logger = require('../utils/logger');

class Type33Handler {
    /**
     * Parse type 0x33 packet (series of records)
     * Each record is 32 bytes with the following structure:
     * - Bytes 0-3: Timestamp (Unix timestamp)
     * - Bytes 4-7: Latitude (signed 32-bit integer, divide by 10000000)
     * - Bytes 8-11: Longitude (signed 32-bit integer, divide by 10000000)
     * - Bytes 12-13: Speed (unsigned 16-bit integer, divide by 10 for km/h)
     * - Bytes 14-15: Course (unsigned 16-bit integer, divide by 10 for degrees)
     * - Bytes 16-17: Status (unsigned 16-bit integer)
     * - Bytes 18-21: Flags (unsigned 32-bit integer)
     * - Bytes 22-31: Reserved
     */
    static async parse(buffer) {
        const result = {
            type: 'type33',
            records: [],
            length: buffer.length,
            raw: buffer
        };

        let offset = 0;
        const recordLength = 32; // Each record is 32 bytes

        while (offset + recordLength <= buffer.length) {
            try {
                const record = {
                    timestamp: null,
                    coordinates: null,
                    speed: null,
                    course: null,
                    status: null,
                    flags: null,
                    raw: buffer.slice(offset, offset + recordLength)
                };

                // Parse timestamp (bytes 0-3)
                if (offset + 4 <= buffer.length) {
                    const timestamp = buffer.readUInt32LE(offset);
                    record.timestamp = new Date(timestamp * 1000);
                }

                // Parse coordinates (bytes 4-11)
                if (offset + 12 <= buffer.length) {
                    const lat = buffer.readInt32LE(offset + 4) / 10000000;
                    const lon = buffer.readInt32LE(offset + 8) / 10000000;
                    record.coordinates = { latitude: lat, longitude: lon };
                }

                // Parse speed (bytes 12-13)
                if (offset + 14 <= buffer.length) {
                    record.speed = buffer.readUInt16LE(offset + 12) / 10; // Convert to km/h
                }

                // Parse course (bytes 14-15)
                if (offset + 16 <= buffer.length) {
                    record.course = buffer.readUInt16LE(offset + 14) / 10; // Convert to degrees
                }

                // Parse status (bytes 16-17)
                if (offset + 18 <= buffer.length) {
                    record.status = buffer.readUInt16LE(offset + 16);
                }

                // Parse flags (bytes 18-21)
                if (offset + 22 <= buffer.length) {
                    record.flags = {
                        value: buffer.readUInt32LE(offset + 18),
                        hex: buffer.slice(offset + 18, offset + 22).toString('hex').toUpperCase()
                    };
                }

                result.records.push(record);
                offset += recordLength;
            } catch (error) {
                logger.error('Error parsing type 33 record:', error);
                break;
            }
        }

        return result;
    }

    /**
     * Calculate CRC16 for type 33 packet
     * Uses the standard CRC16-CCITT algorithm
     */
    static calculateCRC16(buffer) {
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
}

module.exports = Type33Handler; 