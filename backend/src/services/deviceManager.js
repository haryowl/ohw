// backend/src/services/deviceManager.js

const { Device, FieldMapping } = require('../models');
const config = require('../config');
const logger = require('../utils/logger');

class DeviceManager {
    constructor() {
        this.devices = new Map();
        this.mappings = new Map();
        this.startCleanupInterval();
    }

    startCleanupInterval() {
        setInterval(() => {
            this.cleanupOfflineDevices();
        }, config.tcp.timeout);
    }

    async registerDevice(deviceInfo) {
        try {
            const [device, created] = await Device.findOrCreate({
                where: { imei: deviceInfo.imei },
                defaults: {
                    name: `Device ${deviceInfo.imei}`,
                    hardwareVersion: deviceInfo.hardwareVersion,
                    firmwareVersion: deviceInfo.firmwareVersion,
                    status: 'active',
                    lastSeen: new Date()
                }
            });

            if (!created) {
                await device.update({
                    hardwareVersion: deviceInfo.hardwareVersion,
                    firmwareVersion: deviceInfo.firmwareVersion,
                    lastSeen: new Date(),
                    status: 'active'
                });
            }

            // Load device mappings
            await this.loadDeviceMappings(device.id);

            this.devices.set(device.id, {
                lastSeen: new Date(),
                connectionCount: 0,
                info: deviceInfo
            });

            logger.info(`Device registered: ${device.id} (${device.imei})`);
            return device;

        } catch (error) {
            logger.error('Device registration error:', error);
            throw error;
        }
    }

    async loadDeviceMappings(deviceId) {
        try {
            const mappings = await FieldMapping.findAll({
                where: { deviceId, enabled: true }
            });

            const mappingDict = {};
            mappings.forEach(mapping => {
                mappingDict[mapping.originalField] = {
                    customName: mapping.customName,
                    dataType: mapping.dataType,
                    unit: mapping.unit
                };
            });

            this.mappings.set(deviceId, mappingDict);
            logger.debug(`Loaded ${mappings.length} mappings for device ${deviceId}`);

        } catch (error) {
            logger.error(`Error loading mappings for device ${deviceId}:`, error);
            throw error;
        }
    }

    async updateDeviceMapping(deviceId, mappings) {
        try {
            // Validate mappings
            if (!Array.isArray(mappings)) {
                throw new Error('Mappings must be an array');
            }

            // Begin transaction
            const transaction = await Device.sequelize.transaction();

            try {
                // Delete existing mappings
                await FieldMapping.destroy({
                    where: { deviceId },
                    transaction
                });

                // Create new mappings
                await FieldMapping.bulkCreate(
                    mappings.map(mapping => ({
                        deviceId,
                        originalField: mapping.originalField,
                        customName: mapping.customName,
                        dataType: mapping.dataType || 'string',
                        unit: mapping.unit || '',
                        enabled: mapping.enabled !== false
                    })),
                    { transaction }
                );

                await transaction.commit();

                // Reload mappings in memory
                await this.loadDeviceMappings(deviceId);

                logger.info(`Updated mappings for device ${deviceId}`);
                return true;

            } catch (error) {
                await transaction.rollback();
                throw error;
            }

        } catch (error) {
            logger.error(`Error updating mappings for device ${deviceId}:`, error);
            throw error;
        }
    }

    async getDeviceMappings(deviceId) {
        try {
            const mappings = await FieldMapping.findAll({
                where: { deviceId },
                order: [['originalField', 'ASC']]
            });

            return mappings;

        } catch (error) {
            logger.error(`Error getting mappings for device ${deviceId}:`, error);
            throw error;
        }
    }

    mapDeviceData(deviceId, data) {
        const mappings = this.mappings.get(deviceId);
        if (!mappings) {
            logger.warn(`No mappings found for device ${deviceId}`);
            return data;
        }

        const mappedData = {};
        for (const [key, value] of Object.entries(data)) {
            const mapping = mappings[key];
            if (mapping) {
                const mappedValue = this.convertValue(value, mapping.dataType);
                mappedData[mapping.customName] = mappedValue;
            } else {
                mappedData[key] = value;
            }
        }

        return mappedData;
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
            default:
                return String(value);
        }
    }

    parseCoordinates(value) {
        if (typeof value === 'object' && 'latitude' in value && 'longitude' in value) {
            return {
                lat: Number(value.latitude),
                lng: Number(value.longitude)
            };
        }
        return value;
    }

    async updateDeviceStatus(deviceId, status) {
        try {
            await Device.update(
                { 
                    status,
                    lastSeen: status === 'active' ? new Date() : undefined
                },
                { where: { id: deviceId } }
            );

            if (status === 'offline') {
                this.devices.delete(deviceId);
            }

            logger.info(`Device ${deviceId} status updated to ${status}`);

        } catch (error) {
            logger.error(`Error updating device ${deviceId} status:`, error);
            throw error;
        }
    }

    async cleanupOfflineDevices() {
        const now = new Date();
        for (const [deviceId, info] of this.devices) {
            if (now - info.lastSeen > config.tcp.timeout) {
                await this.updateDeviceStatus(deviceId, 'offline');
            }
        }
    }

    getDeviceInfo(deviceId) {
        return this.devices.get(deviceId);
    }

    async getAllDevices() {
        try {
            return await Device.findAll({
                include: [{
                    model: FieldMapping,
                    as: 'mappings'
                }],
                order: [['lastSeen', 'DESC']]
            });
        } catch (error) {
            logger.error('Error getting all devices:', error);
            throw error;
        }
    }

    async getDeviceById(deviceId) {
        try {
            return await Device.findByPk(deviceId, {
                include: [FieldMapping]
            });
        } catch (error) {
            logger.error(`Error getting device ${deviceId}:`, error);
            throw error;
        }
    }
}

module.exports = new DeviceManager();
