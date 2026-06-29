/**
 * setup-db.js
 * Creates the database if it doesn't exist, syncs all Sequelize models,
 * and seeds an admin user.
 *
 * Usage: node setup-db.js
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');
const bcrypt = require('bcryptjs');
const { runWithTenant } = require('./utils/tenantContext');

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'maycemj';
const DB_PORT = Number(process.env.DB_PORT || 3306);

async function main() {
  // ── Step 1: Create the database if it doesn't exist ──────────────────────
  console.log(`\n🔧 Connecting to MySQL as '${DB_USER}'@'${DB_HOST}:${DB_PORT}'...`);
  const rootSequelize = new Sequelize('', DB_USER, DB_PASSWORD, {
    host: DB_HOST,
    port: DB_PORT,
    dialect: 'mysql',
    logging: false,
  });

  try {
    await rootSequelize.authenticate();
    console.log('✅ Root connection OK.');
  } catch (err) {
    console.error('❌ Could not connect to MySQL:', err.message);
    process.exit(1);
  }

  await rootSequelize.query(
    `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;`
  );
  console.log(`✅ Database '${DB_NAME}' is ready.`);
  await rootSequelize.close();

  // ── Step 2: Load models and sync all tables ───────────────────────────────
  console.log('\n🔧 Syncing all models...');
  const db = require('./models'); // uses .env values internally

  try {
    await db.sequelize.authenticate();
    console.log('✅ Connected to database.');
  } catch (err) {
    console.error('❌ DB connection failed:', err.message);
    process.exit(1);
  }

  // force: false → only create tables that don't exist yet (safe)
  await db.sequelize.sync({ force: false, alter: false });
  console.log('✅ All tables synced.');

  // ── Step 3: Seed default club + admin user ────────────────────────────────
  console.log('\n🔧 Seeding default club and admin user...');
  const { Utilisateur, Club } = db;

  await runWithTenant({ clubId: 1, isSystem: false }, async () => {
    const [club] = await Club.findOrCreate({
      where: { id: 1 },
      defaults: { nom: 'Club par défaut', slug: 'default', statut: 'actif' },
    });

    const existing = await Utilisateur.findOne({ where: { email: 'maycem2003@gmail.com' } });
    if (existing) {
      console.log('ℹ️  Admin user already exists – skipping seed.');
    } else {
      const hashed = await bcrypt.hash('12345', 10);
      await Utilisateur.create({
        nom: 'Maycem Admin',
        email: 'maycem2003@gmail.com',
        mot_de_passe: hashed,
        role: 'admin',
        club_id: club.id,
      });
      console.log('✅ Admin user created: maycem2003@gmail.com / 12345');
    }
  });

  await db.sequelize.close();
  console.log('\n🎉 Setup complete!\n');
}

main().catch((err) => {
  console.error('❌ Unexpected error:', err);
  process.exit(1);
});
