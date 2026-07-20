'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('ticket')) {
      await queryInterface.createTable('ticket', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        // Nullable: a ticket can concern the platform as a whole rather
        // than one specific tenant.
        club_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'club', key: 'id' },
          onDelete: 'SET NULL',
        },
        sujet: { type: Sequelize.STRING(200), allowNull: false },
        description: { type: Sequelize.TEXT, allowNull: true },
        categorie: { type: Sequelize.STRING(50), allowNull: true },
        priorite: {
          type: Sequelize.ENUM('haute', 'normale', 'basse'),
          allowNull: false,
          defaultValue: 'normale',
        },
        statut: {
          type: Sequelize.ENUM('ouvert', 'en_cours', 'resolu'),
          allowNull: false,
          defaultValue: 'ouvert',
        },
        date_creation: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
        date_maj: { type: Sequelize.DATE, allowNull: true },
        date_resolution: { type: Sequelize.DATE, allowNull: true },
      });
      console.log('Migration UP: Created "ticket" table.');
    }
  },

  down: async (queryInterface) => {
    const tables = await queryInterface.showAllTables();
    if (tables.includes('ticket')) {
      await queryInterface.dropTable('ticket');
      console.log('Migration DOWN: Dropped "ticket" table.');
    }
  },
};
