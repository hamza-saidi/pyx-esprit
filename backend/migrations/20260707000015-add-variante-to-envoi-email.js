'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('envoi_email', 'variante', {
      type: Sequelize.STRING(1),
      allowNull: true,
      after: 'actif',
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('envoi_email', 'variante');
  },
};
