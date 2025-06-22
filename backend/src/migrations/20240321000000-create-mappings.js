'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('FieldMappings', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      deviceId: {
        type: Sequelize.UUID,
        allowNull: false
      },
      originalField: {
        type: Sequelize.STRING,
        allowNull: false
      },
      customName: {
        type: Sequelize.STRING,
        allowNull: false
      },
      dataType: {
        type: Sequelize.STRING,
        defaultValue: 'string'
      },
      unit: {
        type: Sequelize.STRING
      },
      enabled: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
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

    // Add indexes
    await queryInterface.addIndex('FieldMappings', ['deviceId']);
    await queryInterface.addIndex('FieldMappings', ['originalField']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('FieldMappings');
  }
}; 