'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('utilisateur', 'mfa_totp_secret', {
      type: Sequelize.STRING(64),
      allowNull: true,
      defaultValue: null,
    });
    await queryInterface.addColumn('utilisateur', 'mfa_totp_enabled', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('utilisateur', 'mfa_totp_secret');
    await queryInterface.removeColumn('utilisateur', 'mfa_totp_enabled');
  },
};
