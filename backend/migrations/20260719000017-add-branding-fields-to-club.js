'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('club', 'logo_url', {
      type: Sequelize.STRING(500),
      allowNull: true,
      defaultValue: null,
    });
    await queryInterface.addColumn('club', 'couleur_principale', {
      type: Sequelize.STRING(7),
      allowNull: true,
      defaultValue: null,
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('club', 'logo_url');
    await queryInterface.removeColumn('club', 'couleur_principale');
  },
};
