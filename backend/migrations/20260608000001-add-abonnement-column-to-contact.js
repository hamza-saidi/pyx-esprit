'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      const tableInfo = await queryInterface.describeTable('contact');
      if (!tableInfo.abonnement_id) {
        await queryInterface.addColumn('contact', 'abonnement_id', {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'abonnement',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        });
        console.log('Migration UP: Added abonnement_id column to contact table.');
      }
    } catch (err) {
      console.warn('Migration UP Warning (abonnement_id):', err.message);
    }
  },

  down: async (queryInterface) => {
    try {
      const tableInfo = await queryInterface.describeTable('contact');
      if (tableInfo.abonnement_id) {
        await queryInterface.removeColumn('contact', 'abonnement_id');
        console.log('Migration DOWN: Removed abonnement_id column from contact table.');
      }
    } catch (err) {
      console.error('Migration DOWN Error (abonnement_id):', err.message);
    }
  },
};
