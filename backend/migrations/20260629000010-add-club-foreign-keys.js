'use strict';

// Belt-and-suspenders data integrity: club_id columns are already enforced at
// the application layer (Sequelize hooks), this adds a DB-level FK so a club
// can never be hard-deleted while it still owns data (use statut='archive'
// instead - see Club model).
const TABLES = [
  'utilisateur',
  'contact',
  'tag',
  'segment',
  'campagne_email',
  'evenement',
  'abonnement',
  'modele_email',
  'automations',
  'category',
  'distribution',
  'statistique_campagne',
  'envoi_email',
  'rsvp',
  'note',
  'contact_tag',
];

async function constraintExists(queryInterface, tableName, constraintName) {
  const [rows] = await queryInterface.sequelize.query(
    `SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :tableName AND CONSTRAINT_NAME = :constraintName`,
    { replacements: { tableName, constraintName } }
  );
  return rows.length > 0;
}

module.exports = {
  up: async (queryInterface) => {
    for (const tableName of TABLES) {
      const constraintName = `fk_${tableName}_club`;
      try {
        if (await constraintExists(queryInterface, tableName, constraintName)) {
          continue;
        }
        // Orphaned club_id values (pointing at a non-existent club) would
        // make the FK fail to create - normalize them to the default club
        // first rather than letting the migration halt boot.
        await queryInterface.sequelize.query(
          `UPDATE ${tableName} SET club_id = 1 WHERE club_id IS NOT NULL AND club_id NOT IN (SELECT id FROM club)`
        );
        await queryInterface.addConstraint(tableName, {
          fields: ['club_id'],
          type: 'foreign key',
          name: constraintName,
          references: { table: 'club', field: 'id' },
          onDelete: 'RESTRICT',
          onUpdate: 'CASCADE',
        });
        console.log(
          `Migration UP: Added FK "${constraintName}" on "${tableName}.club_id" -> club.id.`
        );
      } catch (err) {
        console.warn(`Migration UP Warning adding FK on "${tableName}":`, err.message);
      }
    }
  },

  down: async (queryInterface) => {
    for (const tableName of TABLES) {
      const constraintName = `fk_${tableName}_club`;
      try {
        if (await constraintExists(queryInterface, tableName, constraintName)) {
          await queryInterface.removeConstraint(tableName, constraintName);
          console.log(`Migration DOWN: Removed FK "${constraintName}" from "${tableName}".`);
        }
      } catch (err) {
        console.error(`Migration DOWN Error removing FK on "${tableName}":`, err.message);
      }
    }
  },
};
