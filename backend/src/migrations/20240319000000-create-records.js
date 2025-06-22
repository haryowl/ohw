'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Records', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      deviceImei: {
        type: Sequelize.STRING,
        allowNull: false,
        references: {
          model: 'Devices',
          key: 'imei'
        }
      },
      timestamp: {
        type: Sequelize.DATE,
        allowNull: false
      },
      recordNumber: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      milliseconds: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      rawData: {
        type: Sequelize.JSON,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Records');
  }
};
