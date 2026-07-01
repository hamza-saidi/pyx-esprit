'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const table = await queryInterface.describeTable('club');

    if (!table.azure_tenant_id) {
      await queryInterface.addColumn('club', 'azure_tenant_id', {
        type: Sequelize.STRING(36),
        allowNull: true,
        defaultValue: null,
        comment: 'Azure AD tenant ID after admin consent (multi-tenant Graph app)',
      });
      console.log('Migration UP: Added club.azure_tenant_id');
    }

    if (!table.graph_from_email) {
      await queryInterface.addColumn('club', 'graph_from_email', {
        type: Sequelize.STRING(255),
        allowNull: true,
        defaultValue: null,
        comment: "Mailbox used as sender in this club's Exchange Online tenant",
      });
      console.log('Migration UP: Added club.graph_from_email');
    }

    if (!table.graph_consent_at) {
      await queryInterface.addColumn('club', 'graph_consent_at', {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: null,
        comment: 'Timestamp of the admin consent grant',
      });
      console.log('Migration UP: Added club.graph_consent_at');
    }
  },

  down: async (queryInterface) => {
    const table = await queryInterface.describeTable('club');
    if (table.graph_consent_at) await queryInterface.removeColumn('club', 'graph_consent_at');
    if (table.graph_from_email) await queryInterface.removeColumn('club', 'graph_from_email');
    if (table.azure_tenant_id) await queryInterface.removeColumn('club', 'azure_tenant_id');
    console.log('Migration DOWN: Removed Graph fields from club table.');
  },
};
