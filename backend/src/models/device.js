// backend/src/models/device.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Device = sequelize.define('Device', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        imei: {
            type: DataTypes.STRING,
            unique: true,
            allowNull: false
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        hardwareVersion: {
            type: DataTypes.STRING
        },
        firmwareVersion: {
            type: DataTypes.STRING
        },
        status: {
            type: DataTypes.ENUM('active', 'inactive', 'offline'),
            defaultValue: 'inactive'
        },
        lastSeen: {
            type: DataTypes.DATE
        }
    });

    return Device;
};
