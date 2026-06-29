'use strict';

const TABLES = ['modele_email', 'automations', 'category', 'distribution'];

module.exports = {
  up: async (queryInterface, Sequelize) => {
    for (const tableName of TABLES) {
      try {
        const tableInfo = await queryInterface.describeTable(tableName);
        if (!tableInfo.club_id) {
          await queryInterface.addColumn(tableName, 'club_id', {
            type: Sequelize.INTEGER,
            allowNull: true,
            defaultValue: 1,
          });
          await queryInterface.addIndex(tableName, ['club_id'], {
            name: `idx_${tableName}_club_id`,
          });
          console.log(`Migration UP: Scoped table "${tableName}" with club_id column and index.`);
        }
      } catch (err) {
        console.warn(`Migration UP Warning scoping table "${tableName}":`, err.message);
      }
    }
  },

  down: async (queryInterface) => {
    for (const tableName of TABLES) {
      try {
        const tableInfo = await queryInterface.describeTable(tableName);
        if (tableInfo.club_id) {
          await queryInterface.removeIndex(tableName, `idx_${tableName}_club_id`);
          await queryInterface.removeColumn(tableName, 'club_id');
          console.log(`Migration DOWN: Removed club_id scope from table "${tableName}".`);
        }
      } catch (err) {
        console.error(`Migration DOWN Error descoping table "${tableName}":`, err.message);
      }
    }
  },
};
