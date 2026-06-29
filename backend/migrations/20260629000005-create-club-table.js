'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tables = await queryInterface.showAllTables();
    if (tables.includes('club')) {
      console.log('Migration UP: Table "club" already exists, skipping creation.');
      return;
    }

    await queryInterface.createTable('club', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      nom: { type: Sequelize.STRING(150), allowNull: false },
      slug: { type: Sequelize.STRING(150), allowNull: false, unique: true },
      email_contact: { type: Sequelize.STRING(150), allowNull: true },
      statut: {
        type: Sequelize.ENUM('actif', 'suspendu', 'archive'),
        allowNull: false,
        defaultValue: 'actif',
      },
      date_creation: { type: Sequelize.DATE, allowNull: true, defaultValue: Sequelize.NOW },
    });

    await queryInterface.bulkInsert('club', [
      {
        id: 1,
        nom: 'Club par défaut',
        slug: 'default',
        statut: 'actif',
        date_creation: new Date(),
      },
    ]);

    console.log('Migration UP: Created "club" table and seeded default club (id=1).');
  },

  down: async (queryInterface) => {
    const tables = await queryInterface.showAllTables();
    if (tables.includes('club')) {
      await queryInterface.dropTable('club');
      console.log('Migration DOWN: Dropped "club" table.');
    }
  },
};
