// backend/src/models/alertRule.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const AlertRule = sequelize.define('AlertRule', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        condition: { // The alert condition (e.g., "temperature > 80")
            type: DataTypes.STRING,
            allowNull: false,
        },
        severity: { // e.g., "warning", "critical"
            type: DataTypes.STRING,
            allowNull: false,
        },
        enabled: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        }
    }, {
        tableName: 'AlertRules' // Explicitly set the table name to 'AlertRules'
    });

    return AlertRule;
};
