// backend/src/services/deviceMapper.js

const logger = require('../utils/logger');
const deviceManager = require('./deviceManager');

class DeviceMapper {
    constructor() {
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    }

    async mapFields(deviceId, data) {
        try {
            // Get mappings from device manager
            const mappings = await this.getDeviceMappings(deviceId);
            
            if (!mappings || Object.keys(mappings).length === 0) {
                logger.debug(`No mappings found for device ${deviceId}, returning original data`);
                return data;
            }

            const mappedData = {};

            // Map each field according to device mappings
            for (const [originalField, value] of Object.entries(data)) {
                const mapping = mappings[originalField];
                if (mapping && mapping.enabled) {
                    const convertedValue = this.convertValue(value, mapping.dataType);
                    mappedData[mapping.customName] = {
                        value: convertedValue,
                        unit: mapping.unit,
                        originalField
                    };
                } else {
                    // Keep original field if no mapping exists
                    mappedData[originalField] = {
                        value,
                        unit: '',
                        originalField
                    };
                }
            }

            return mappedData;

        } catch (error) {
            logger.error(`Error mapping fields for device ${deviceId}:`, error);
            throw error;
        }
    }

    async getDeviceMappings(deviceId) {
        // Check cache first
        const cached = this.cache.get(deviceId);
        if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
            return cached.mappings;
        }

        // Get fresh mappings from device manager
        const mappings = await deviceManager.getDeviceMappings(deviceId);
        
        // Update cache
        this.cache.set(deviceId, {
            mappings,
            timestamp: Date.now()
        });

        return mappings;
    }

    convertValue(value, dataType) {
        switch (dataType) {
            case 'number':
                return Number(value);
            case 'boolean':
                return Boolean(value);
            case 'date':
                return new Date(value);
            case 'coordinates':
                return this.parseCoordinates(value);
            case 'status':
                return this.parseStatus(value);
            case 'temperature':
                return this.parseTemperature(value);
            default:
                return String(value);
        }
    }

    parseCoordinates(value) {
        if (typeof value === 'object' && 'latitude' in value && 'longitude' in value) {
            return {
                lat: Number(value.latitude),
                lng: Number(value.longitude),
                valid: value.valid !== false
            };
        }
        return value;
    }

    parseStatus(value) {
        if (typeof value !== 'number') return value;
        
        // Parse status bits according to protocol specification
        return {
            vibration: !!(value & 0x0001),
            inclineExceeded: !!(value & 0x0002),
            // ... other status bits
        };
    }

    parseTemperature(value) {
        // Handle temperature values according to protocol specification
        if (typeof value === 'object' && 'sensorId' in value) {
            return {
                sensorId: value.sensorId,
                temperature: Number(value.temperature),
                connected: value.connected !== false
            };
        }
        return Number(value);
    }

    clearCache(deviceId) {
        if (deviceId) {
            this.cache.delete(deviceId);
        } else {
            this.cache.clear();
        }
    }
}

module.exports = new DeviceMapper();
