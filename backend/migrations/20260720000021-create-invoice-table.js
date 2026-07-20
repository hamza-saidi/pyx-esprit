'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('invoice')) {
      await queryInterface.createTable('invoice', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        club_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'club', key: 'id' },
          onDelete: 'CASCADE',
        },
        subscription_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'subscription', key: 'id' },
          onDelete: 'SET NULL',
        },
        // Snapshotted from the plan's price at invoice time - never
        // recomputed from Plan later, so historical invoices stay accurate
        // if a plan's price changes.
        montant: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
        devise: { type: Sequelize.STRING(10), allowNull: false, defaultValue: 'TND' },
        date_emission: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
        date_echeance: { type: Sequelize.DATE, allowNull: true },
        statut: {
          type: Sequelize.ENUM('payee', 'en_attente', 'en_retard', 'annulee'),
          allowNull: false,
          defaultValue: 'en_attente',
        },
        date_paiement: { type: Sequelize.DATE, allowNull: true },
        reference: { type: Sequelize.STRING(30), allowNull: false, unique: true },
      });
      console.log('Migration UP: Created "invoice" table.');
    }
  },

  down: async (queryInterface) => {
    const tables = await queryInterface.showAllTables();
    if (tables.includes('invoice')) {
      await queryInterface.dropTable('invoice');
      console.log('Migration DOWN: Dropped "invoice" table.');
    }
  },
};
