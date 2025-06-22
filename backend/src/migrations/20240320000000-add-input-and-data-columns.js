'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add input states (0-15)
    for (let i = 0; i < 16; i++) {
      await queryInterface.addColumn('Records', `input${i}`, {
        type: Sequelize.BOOLEAN,
        allowNull: true
      });
    }

    // Add input voltages (0-3)
    for (let i = 0; i < 4; i++) {
      await queryInterface.addColumn('Records', `inputVoltage${i}`, {
        type: Sequelize.INTEGER,
        allowNull: true
      });
    }

    // Add input values (4-15)
    for (let i = 4; i < 16; i++) {
      await queryInterface.addColumn('Records', `inputValue${i}`, {
        type: Sequelize.INTEGER,
        allowNull: true
      });
    }

    // Add user data (0-7)
    for (let i = 0; i < 8; i++) {
      await queryInterface.addColumn('Records', `userData${i}`, {
        type: Sequelize.INTEGER,
        allowNull: true
      });
    }

    // Add modbus values (0-15)
    for (let i = 0; i < 16; i++) {
      await queryInterface.addColumn('Records', `modbus${i}`, {
        type: Sequelize.INTEGER,
        allowNull: true
      });
    }
  },

  async down(queryInterface, Sequelize) {
    // Remove input states
    for (let i = 0; i < 16; i++) {
      await queryInterface.removeColumn('Records', `input${i}`);
    }

    // Remove input voltages
    for (let i = 0; i < 4; i++) {
      await queryInterface.removeColumn('Records', `inputVoltage${i}`);
    }

    // Remove input values
    for (let i = 4; i < 16; i++) {
      await queryInterface.removeColumn('Records', `inputValue${i}`);
    }

    // Remove user data
    for (let i = 0; i < 8; i++) {
      await queryInterface.removeColumn('Records', `userData${i}`);
    }

    // Remove modbus values
    for (let i = 0; i < 16; i++) {
      await queryInterface.removeColumn('Records', `modbus${i}`);
    }
  }
}; 