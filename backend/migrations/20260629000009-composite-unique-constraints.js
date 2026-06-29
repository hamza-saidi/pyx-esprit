'use strict';

// abonnement.nom / category.nom / distribution.nom were globally unique,
// which would block two clubs from both having e.g. a "VIP" category once
// they share the same database. Replace with a composite (club_id, nom)
// unique constraint instead.
const TABLES = ['abonnement', 'category', 'distribution'];

async function findUniqueIndexOnColumn(queryInterface, tableName, columnName) {
  const indexes = await queryInterface.showIndex(tableName);
  return indexes.find(
    (idx) =>
      idx.unique &&
      idx.name !== 'PRIMARY' &&
      idx.fields.length === 1 &&
      idx.fields[0].attribute === columnName
  );
}

module.exports = {
  up: async (queryInterface) => {
    for (const tableName of TABLES) {
      try {
        const existing = await findUniqueIndexOnColumn(queryInterface, tableName, 'nom');
        if (existing) {
          await queryInterface.removeIndex(tableName, existing.name);
          console.log(
            `Migration UP: Dropped single-column unique index "${existing.name}" on "${tableName}.nom".`
          );
        }

        const composite = await queryInterface.showIndex(tableName);
        const alreadyComposite = composite.find((idx) => idx.name === `uniq_${tableName}_club_nom`);
        if (!alreadyComposite) {
          await queryInterface.addIndex(tableName, ['club_id', 'nom'], {
            unique: true,
            name: `uniq_${tableName}_club_nom`,
          });
          console.log(
            `Migration UP: Added composite unique index on "${tableName}"(club_id, nom).`
          );
        }
      } catch (err) {
        console.warn(`Migration UP Warning on "${tableName}":`, err.message);
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    for (const tableName of TABLES) {
      try {
        await queryInterface.removeIndex(tableName, `uniq_${tableName}_club_nom`);
        await queryInterface.addIndex(tableName, ['nom'], {
          unique: true,
          name: `${tableName}_nom_unique`,
        });
        console.log(`Migration DOWN: Restored single-column unique index on "${tableName}.nom".`);
      } catch (err) {
        console.error(`Migration DOWN Error on "${tableName}":`, err.message);
      }
    }
  },
};
