'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tablesToScope = [
      'utilisateur',
      'contact',
      'tag',
      'segment',
      'campagne_email',
      'evenement',
      'abonnement',
    ];

    for (const tableName of tablesToScope) {
      try {
        const tableInfo = await queryInterface.describeTable(tableName);

        // Add club_id column if it doesn't exist yet
        if (!tableInfo.club_id) {
          await queryInterface.addColumn(tableName, 'club_id', {
            type: Sequelize.INTEGER,
            allowNull: true, // Nullable initially to support transition of existing data
            defaultValue: 1, // Defaults to club #1
          });

          // Add index for fast tenant filter execution
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
    const tablesToScope = [
      'utilisateur',
      'contact',
      'tag',
      'segment',
      'campagne_email',
      'evenement',
      'abonnement',
    ];

    for (const tableName of tablesToScope) {
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
