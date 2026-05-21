#!/usr/bin/env node
const { Sequelize } = require('sequelize');

async function fixTextLimits() {
  console.log('🔧 Upgrading HTML fields to LONGTEXT to prevent ECONNRESET...\n');

  try {
    const sequelize = new Sequelize('golf_marketing', 'root', '', {
      host: 'localhost',
      dialect: 'mysql',
      logging: false
    });

    await sequelize.authenticate();
    console.log('✅ Connected to database');

    console.log('🔄 Modifying campagne_email.contenu_html...');
    await sequelize.query('ALTER TABLE campagne_email MODIFY COLUMN contenu_html LONGTEXT NOT NULL');
    
    console.log('🔄 Modifying modele_email.contenu_html...');
    await sequelize.query('ALTER TABLE modele_email MODIFY COLUMN contenu_html LONGTEXT NOT NULL');

    console.log('✅ Upgrade complete!');
    await sequelize.close();
  } catch (error) {
    console.error('❌ Error during upgrade:', error.message);
    process.exit(1);
  }
}

fixTextLimits();
