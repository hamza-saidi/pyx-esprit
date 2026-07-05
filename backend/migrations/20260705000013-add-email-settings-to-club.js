'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('club', 'email_provider', {
      type: Sequelize.STRING(50),
      allowNull: false,
      defaultValue: 'smtp',
      after: 'graph_consent_at',
    });
    await queryInterface.addColumn('club', 'smtp_host', {
      type: Sequelize.STRING(255),
      allowNull: true,
      defaultValue: null,
    });
    await queryInterface.addColumn('club', 'smtp_port', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: 587,
    });
    await queryInterface.addColumn('club', 'smtp_secure', {
      type: Sequelize.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    });
    await queryInterface.addColumn('club', 'smtp_user', {
      type: Sequelize.STRING(255),
      allowNull: true,
      defaultValue: null,
    });
    await queryInterface.addColumn('club', 'smtp_pass', {
      type: Sequelize.TEXT,
      allowNull: true,
      defaultValue: null,
    });
    await queryInterface.addColumn('club', 'email_from_address', {
      type: Sequelize.STRING(255),
      allowNull: true,
      defaultValue: null,
    });
    await queryInterface.addColumn('club', 'email_from_name', {
      type: Sequelize.STRING(255),
      allowNull: true,
      defaultValue: null,
    });
  },

  down: async (queryInterface) => {
    for (const col of [
      'email_provider',
      'smtp_host',
      'smtp_port',
      'smtp_secure',
      'smtp_user',
      'smtp_pass',
      'email_from_address',
      'email_from_name',
    ]) {
      await queryInterface.removeColumn('club', col);
    }
  },
};
