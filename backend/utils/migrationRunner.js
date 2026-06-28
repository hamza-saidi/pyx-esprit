/**
 * utils/migrationRunner.js
 *
 * Auto-executes pending migrations in backend/migrations/ on server boot.
 * Keeps track of ran migrations in the standard 'SequelizeMeta' table.
 */

const fs = require('fs');
const path = require('path');
const { QueryTypes } = require('sequelize');
const logger = require('./logger');

/**
 * Runs all pending migrations.
 *
 * @param {Sequelize} sequelizeInstance
 * @returns {Promise<void>}
 */
async function runMigrations(sequelizeInstance) {
  logger.info('⚙️ MIGRATION: Checking for pending database schema migrations...');

  const queryInterface = sequelizeInstance.getQueryInterface();
  const migrationsDir = path.join(__dirname, '..', 'migrations');

  // 1. Ensure standard SequelizeMeta tracking table exists
  await sequelizeInstance.query(`
    CREATE TABLE IF NOT EXISTS SequelizeMeta (
      name VARCHAR(255) NOT NULL PRIMARY KEY
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_bin;
  `);

  // 2. Scan migrations directory
  if (!fs.existsSync(migrationsDir)) {
    logger.info('📌 MIGRATION: No migrations directory found. Skipping.');
    return;
  }

  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.js'))
    .sort(); // Run in chronological order

  if (migrationFiles.length === 0) {
    logger.info('📌 MIGRATION: No migration scripts found.');
    return;
  }

  // 3. Fetch already executed migrations
  const executedRecords = await sequelizeInstance.query('SELECT name FROM SequelizeMeta', {
    type: QueryTypes.SELECT,
  });
  const executedSet = new Set(executedRecords.map((r) => r.name));

  // 4. Run pending migrations
  let executedCount = 0;
  for (const file of migrationFiles) {
    if (executedSet.has(file)) {
      continue;
    }

    logger.info(`🚀 MIGRATION: Running pending migration script: "${file}"...`);
    const transaction = await sequelizeInstance.transaction();

    try {
      const migration = require(path.join(migrationsDir, file));

      // Execute the migration step
      await migration.up(queryInterface, sequelizeInstance.Sequelize);

      // Track as completed
      await sequelizeInstance.query('INSERT INTO SequelizeMeta (name) VALUES (:name)', {
        replacements: { name: file },
        type: QueryTypes.INSERT,
        transaction,
      });

      await transaction.commit();
      logger.info(`✅ MIGRATION: Completed migration: "${file}"`);
      executedCount++;
    } catch (err) {
      await transaction.rollback();
      logger.error(`❌ MIGRATION ERROR: Failed running migration "${file}":`, {
        error: err.message,
        stack: err.stack,
      });
      // Halt server startup if a migration fails for safety
      throw new Error(`Database migration failed on "${file}". Boot halted.`);
    }
  }

  if (executedCount > 0) {
    logger.info(`✨ MIGRATION: Successfully executed ${executedCount} migration(s).`);
  } else {
    logger.info('✅ MIGRATION: Database schema is fully up-to-date. No pending migrations.');
  }
}

module.exports = { runMigrations };
