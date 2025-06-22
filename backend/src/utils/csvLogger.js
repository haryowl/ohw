const fs = require('fs');
const path = require('path');
const logger = require('./logger');

class CSVLogger {
    constructor() {
        this.csvPath = path.join(__dirname, '../../logs/device_data.csv');
        this.initializeCSV();
    }

    initializeCSV() {
        const headers = 'IMEI,TIMESTAMP,LATITUDE,LONGITUDE,SATELLITE_NUMBER,SUPPLY_VOLTAGE,BATTERY_VOLTAGE\n';
        
        // Create file with headers if it doesn't exist
        if (!fs.existsSync(this.csvPath)) {
            fs.writeFileSync(this.csvPath, headers);
            logger.info('CSV file initialized with headers');
        }
    }

    parseRawData(rawData) {
        try {
            // Convert hex string to buffer
            const buffer = Buffer.from(rawData, 'hex');
            let offset = 0;
            const result = {};

            // Skip header (2 bytes) and packet length (2 bytes)
            offset += 4;

            // Parse tags and values
            while (offset < buffer.length - 2) { // -2 for checksum
                const tag = buffer[offset++];
                let value;

                switch (tag) {
                    case 0x03: // IMEI
                        value = buffer.slice(offset, offset + 15).toString('ascii');
                        offset += 15;
                        result.imei = value;
                        break;

                    case 0x20: // Timestamp
                        value = buffer.readUInt32LE(offset);
                        offset += 4;
                        result.timestamp = new Date(value * 1000).toISOString();
                        break;

                    case 0x30: // Coordinates
                        const lat = buffer.readInt32LE(offset) / 10000000;
                        offset += 4;
                        const lon = buffer.readInt32LE(offset) / 10000000;
                        offset += 4;
                        const satellites = buffer[offset++];
                        result.latitude = lat;
                        result.longitude = lon;
                        result.satellites = satellites;
                        break;

                    case 0x41: // Supply Voltage
                        value = buffer.readUInt16LE(offset);
                        offset += 2;
                        result.supplyVoltage = value;
                        break;

                    case 0x42: // Battery Voltage
                        value = buffer.readUInt16LE(offset);
                        offset += 2;
                        result.batteryVoltage = value;
                        break;

                    default:
                        // Skip unknown tags
                        offset++;
                        break;
                }
            }

            return result;
        } catch (error) {
            logger.error('Error parsing raw data:', error);
            return null;
        }
    }

    appendToCSV(data) {
        try {
            const csvLine = [
                data.imei || '',
                data.timestamp || '',
                data.latitude || '',
                data.longitude || '',
                data.satellites || '',
                data.supplyVoltage ? `${data.supplyVoltage}mV` : '',
                data.batteryVoltage ? `${data.batteryVoltage}mV` : ''
            ].join(',');

            fs.appendFileSync(this.csvPath, csvLine + '\n');
            logger.info('Data appended to CSV file');
        } catch (error) {
            logger.error('Error appending to CSV:', error);
        }
    }

    logDeviceData(rawData) {
        const parsedData = this.parseRawData(rawData);
        if (parsedData) {
            this.appendToCSV(parsedData);
        }
    }
}

module.exports = new CSVLogger(); 