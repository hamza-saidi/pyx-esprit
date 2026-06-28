'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      const tableInfo = await queryInterface.describeTable('modele_email');

      if (!tableInfo.blocks_json) {
        await queryInterface.addColumn('modele_email', 'blocks_json', {
          type: Sequelize.JSON,
          allowNull: true,
        });
        console.log('Migration UP: Added blocks_json column to modele_email table.');
      }

      if (!tableInfo.design_json) {
        await queryInterface.addColumn('modele_email', 'design_json', {
          type: Sequelize.JSON,
          allowNull: true,
        });
        console.log('Migration UP: Added design_json column to modele_email table.');
      }
    } catch (err) {
      console.warn('Migration UP Warning (modele_email columns):', err.message);
    }
  },

  down: async (queryInterface) => {
    try {
      const tableInfo = await queryInterface.describeTable('modele_email');

      if (tableInfo.blocks_json) {
        await queryInterface.removeColumn('modele_email', 'blocks_json');
        console.log('Migration DOWN: Removed blocks_json column from modele_email table.');
      }

      if (tableInfo.design_json) {
        await queryInterface.removeColumn('modele_email', 'design_json');
        console.log('Migration DOWN: Removed design_json column from modele_email table.');
      }
    } catch (err) {
      console.error('Migration DOWN Error (modele_email columns):', err.message);
    }
  },
};
