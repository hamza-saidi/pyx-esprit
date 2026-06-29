'use strict';

// These tables have no direct tenant owner; club_id is denormalized from the
// parent row so that Sequelize hooks can scope them without always requiring
// an `include` on the parent (many aggregate queries query them directly).
const TABLES = ['statistique_campagne', 'envoi_email', 'rsvp', 'note', 'contact_tag'];

async function addClubIdColumn(queryInterface, Sequelize, tableName) {
  const tableInfo = await queryInterface.describeTable(tableName);
  if (tableInfo.club_id) return false;
  await queryInterface.addColumn(tableName, 'club_id', {
    type: Sequelize.INTEGER,
    allowNull: true,
    defaultValue: 1,
  });
  await queryInterface.addIndex(tableName, ['club_id'], { name: `idx_${tableName}_club_id` });
  return true;
}

module.exports = {
  up: async (queryInterface, Sequelize) => {
    for (const tableName of TABLES) {
      try {
        const added = await addClubIdColumn(queryInterface, Sequelize, tableName);
        if (added) {
          console.log(`Migration UP: Added club_id column+index to "${tableName}".`);
        }
      } catch (err) {
        console.warn(`Migration UP Warning adding club_id to "${tableName}":`, err.message);
      }
    }

    // Backfill from the parent row that actually owns the tenant.
    const backfills = [
      {
        table: 'statistique_campagne',
        sql: `UPDATE statistique_campagne sc
              JOIN campagne_email c ON c.id = sc.campagne_id
              SET sc.club_id = c.club_id
              WHERE sc.campagne_id IS NOT NULL`,
      },
      {
        table: 'envoi_email',
        sql: `UPDATE envoi_email e
              JOIN contact c ON c.id = e.contact_id
              SET e.club_id = c.club_id
              WHERE e.contact_id IS NOT NULL`,
      },
      {
        table: 'rsvp',
        sql: `UPDATE rsvp r
              JOIN contact c ON c.id = r.contact_id
              SET r.club_id = c.club_id
              WHERE r.contact_id IS NOT NULL`,
      },
      {
        table: 'rsvp',
        sql: `UPDATE rsvp r
              JOIN evenement e ON e.id = r.evenement_id
              SET r.club_id = e.club_id
              WHERE r.contact_id IS NULL AND r.evenement_id IS NOT NULL`,
      },
      {
        table: 'note',
        sql: `UPDATE note n
              JOIN contact c ON c.id = n.contact_id
              SET n.club_id = c.club_id
              WHERE n.contact_id IS NOT NULL`,
      },
      {
        table: 'contact_tag',
        sql: `UPDATE contact_tag ct
              JOIN contact c ON c.id = ct.contact_id
              SET ct.club_id = c.club_id
              WHERE ct.contact_id IS NOT NULL`,
      },
    ];

    for (const { table, sql } of backfills) {
      try {
        await queryInterface.sequelize.query(sql);
        console.log(`Migration UP: Backfilled club_id on "${table}" from its parent row.`);
      } catch (err) {
        console.warn(`Migration UP Warning backfilling "${table}":`, err.message);
      }
    }

    // Anything left without a parent (orphaned rows) defaults to club 1, same
    // as the column's defaultValue, so no further action is required.
  },

  down: async (queryInterface) => {
    for (const tableName of TABLES) {
      try {
        const tableInfo = await queryInterface.describeTable(tableName);
        if (tableInfo.club_id) {
          await queryInterface.removeIndex(tableName, `idx_${tableName}_club_id`);
          await queryInterface.removeColumn(tableName, 'club_id');
          console.log(`Migration DOWN: Removed club_id from "${tableName}".`);
        }
      } catch (err) {
        console.error(`Migration DOWN Error on "${tableName}":`, err.message);
      }
    }
  },
};
