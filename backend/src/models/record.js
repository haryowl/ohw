'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Record extends Model {
    static associate(models) {
      // define associations here
    }
  }
  Record.init({
    deviceImei: {
      type: DataTypes.STRING,
      allowNull: false
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false
    },
    datetime: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Device datetime from tag 0x20'
    },
    rawData: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    recordNumber: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    latitude: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    longitude: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    speed: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    direction: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    status: {
      type: DataTypes.STRING,
      allowNull: true
    },
    supplyVoltage: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    batteryVoltage: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    // Input states
    input0: {
      type: DataTypes.BOOLEAN,
      allowNull: true
    },
    input1: {
      type: DataTypes.BOOLEAN,
      allowNull: true
    },
    input2: {
      type: DataTypes.BOOLEAN,
      allowNull: true
    },
    input3: {
      type: DataTypes.BOOLEAN,
      allowNull: true
    },
    // Input voltages
    inputVoltage0: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    inputVoltage1: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    inputVoltage2: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    inputVoltage3: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    inputVoltage4: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    inputVoltage5: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    inputVoltage6: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    // User data
    userData0: {
      type: DataTypes.STRING,
      allowNull: true
    },
    userData1: {
      type: DataTypes.STRING,
      allowNull: true
    },
    userData2: {
      type: DataTypes.STRING,
      allowNull: true
    },
    userData3: {
      type: DataTypes.STRING,
      allowNull: true
    },
    userData4: {
      type: DataTypes.STRING,
      allowNull: true
    },
    userData5: {
      type: DataTypes.STRING,
      allowNull: true
    },
    userData6: {
      type: DataTypes.STRING,
      allowNull: true
    },
    userData7: {
      type: DataTypes.STRING,
      allowNull: true
    },
    // Modbus data
    modbus0: {
      type: DataTypes.STRING,
      allowNull: true
    },
    modbus1: {
      type: DataTypes.STRING,
      allowNull: true
    },
    modbus2: {
      type: DataTypes.STRING,
      allowNull: true
    },
    modbus3: {
      type: DataTypes.STRING,
      allowNull: true
    },
    modbus4: {
      type: DataTypes.STRING,
      allowNull: true
    },
    modbus5: {
      type: DataTypes.STRING,
      allowNull: true
    },
    modbus6: {
      type: DataTypes.STRING,
      allowNull: true
    },
    modbus7: {
      type: DataTypes.STRING,
      allowNull: true
    },
    modbus8: {
      type: DataTypes.STRING,
      allowNull: true
    },
    modbus9: {
      type: DataTypes.STRING,
      allowNull: true
    },
    modbus10: {
      type: DataTypes.STRING,
      allowNull: true
    },
    modbus11: {
      type: DataTypes.STRING,
      allowNull: true
    },
    modbus12: {
      type: DataTypes.STRING,
      allowNull: true
    },
    modbus13: {
      type: DataTypes.STRING,
      allowNull: true
    },
    modbus14: {
      type: DataTypes.STRING,
      allowNull: true
    },
    modbus15: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Record',
  });
  return Record;
}; 