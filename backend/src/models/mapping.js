// backend/src/models/mapping.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const FieldMapping = sequelize.define('FieldMapping', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        deviceId: {
            type: DataTypes.UUID,
            allowNull: false
        },
        originalField: {
            type: DataTypes.STRING,
            allowNull: false
        },
        customName: {
            type: DataTypes.STRING,
            allowNull: false
        },
        dataType: {
            type: DataTypes.STRING,
            defaultValue: 'string'
        },
        unit: {
            type: DataTypes.STRING
        },
        enabled: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }
    });

    return FieldMapping;
};
