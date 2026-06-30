'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('club')) {
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
      console.log('Migration UP: Created "club" table.');
    } else {
      console.log(
        'Migration UP: Table "club" already exists (e.g. created empty by a prior sequelize.sync() run before migrations got a chance to insert the default row).'
      );
    }

    // Seed the default club independently of whether the table already
    // existed - a table created by sequelize.sync() before this migration
    // ran would otherwise be left permanently empty, breaking every
    // club_id FK that defaults to 1.
    const [existing] = await queryInterface.sequelize.query('SELECT id FROM club WHERE id = 1');
    if (existing.length === 0) {
      await queryInterface.bulkInsert('club', [
        {
          id: 1,
          nom: 'Club par défaut',
          slug: 'default',
          statut: 'actif',
          date_creation: new Date(),
        },
      ]);
      console.log('Migration UP: Seeded default club (id=1).');
    }
  },

  down: async (queryInterface) => {
    const tables = await queryInterface.showAllTables();
    if (tables.includes('club')) {
      await queryInterface.dropTable('club');
      console.log('Migration DOWN: Dropped "club" table.');
    }
  },
};
