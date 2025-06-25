'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Records', 'datetime', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Device datetime from tag 0x20'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Records', 'datetime');
  }
}; 