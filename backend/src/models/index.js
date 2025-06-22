// backend/src/models/index.js
const { Sequelize } = require('sequelize');
const config = require('../config');
const logger = require('../utils/logger');
const path = require('path');

// Import model definitions
const defineDevice = require('./device');
const defineFieldMapping = require('./mapping');
const defineAlertRule = require('./alertRule');
const defineRecord = require('./record');
const defineAlert = require('./alert');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config.database[env];

// Ensure we have a valid database configuration
if (!dbConfig) {
    throw new Error(`Database configuration for environment "${env}" not found`);
}

// Create Sequelize instance
const sequelize = new Sequelize({
    ...dbConfig,
    logging: msg => logger.debug(msg)
});

// Initialize models
const Device = defineDevice(sequelize);
const FieldMapping = defineFieldMapping(sequelize);
const AlertRule = defineAlertRule(sequelize);
const Record = defineRecord(sequelize);
const Alert = defineAlert(sequelize);

// Setup associations
Device.hasMany(FieldMapping, {
    foreignKey: 'deviceId',
    as: 'mappings'
});

Device.hasMany(Record, {
    foreignKey: 'deviceImei',
    as: 'records'
});

Record.belongsTo(Device, {
    foreignKey: 'deviceImei',
    as: 'device'
});

AlertRule.hasMany(Alert, {
    foreignKey: 'ruleId',
    as: 'alerts'
});

Alert.belongsTo(AlertRule, {
    foreignKey: 'ruleId',
    as: 'rule'
});

// Export models and Sequelize instance
module.exports = {
    sequelize,
    Device,
    FieldMapping,
    AlertRule,
    Record,
    Alert
};
