'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Helper function to check if column exists
    const columnExists = async (tableName, columnName) => {
      const tableInfo = await queryInterface.describeTable(tableName);
      return tableInfo[columnName] !== undefined;
    };

    // Add input voltage columns (4-6)
    for (let i = 4; i <= 6; i++) {
      const columnName = `inputVoltage${i}`;
      if (!(await columnExists('Records', columnName))) {
        await queryInterface.addColumn('Records', columnName, {
          type: Sequelize.FLOAT,
          allowNull: true
        });
      }
    }

    // Add user data columns (0-7)
    for (let i = 0; i <= 7; i++) {
      const columnName = `userData${i}`;
      if (!(await columnExists('Records', columnName))) {
        await queryInterface.addColumn('Records', columnName, {
          type: Sequelize.STRING,
          allowNull: true
        });
      }
    }

    // Add modbus columns (0-15)
    for (let i = 0; i <= 15; i++) {
      const columnName = `modbus${i}`;
      if (!(await columnExists('Records', columnName))) {
        await queryInterface.addColumn('Records', columnName, {
          type: Sequelize.STRING,
          allowNull: true
        });
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Helper function to check if column exists
    const columnExists = async (tableName, columnName) => {
      const tableInfo = await queryInterface.describeTable(tableName);
      return tableInfo[columnName] !== undefined;
    };

    // Remove input voltage columns (4-6)
    for (let i = 4; i <= 6; i++) {
      const columnName = `inputVoltage${i}`;
      if (await columnExists('Records', columnName)) {
        await queryInterface.removeColumn('Records', columnName);
      }
    }

    // Remove user data columns (0-7)
    for (let i = 0; i <= 7; i++) {
      const columnName = `userData${i}`;
      if (await columnExists('Records', columnName)) {
        await queryInterface.removeColumn('Records', columnName);
      }
    }

    // Remove modbus columns (0-15)
    for (let i = 0; i <= 15; i++) {
      const columnName = `modbus${i}`;
      if (await columnExists('Records', columnName)) {
        await queryInterface.removeColumn('Records', columnName);
      }
    }
  }
}; 