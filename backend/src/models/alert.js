const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    class Alert extends Model {}

    Alert.init({
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        deviceId: {
            type: DataTypes.STRING,
            allowNull: false
        },
        ruleId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'AlertRules',
                key: 'id'
            }
        },
        message: {
            type: DataTypes.STRING,
            allowNull: false
        },
        severity: {
            type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
            defaultValue: 'medium'
        },
        status: {
            type: DataTypes.ENUM('active', 'acknowledged', 'resolved'),
            defaultValue: 'active'
        },
        timestamp: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        }
    }, {
        sequelize,
        modelName: 'Alert',
        tableName: 'alerts',
        timestamps: true
    });

    Alert.associate = (models) => {
        Alert.belongsTo(models.AlertRule, {
            foreignKey: 'ruleId',
            as: 'rule'
        });
    };

    return Alert;
}; 