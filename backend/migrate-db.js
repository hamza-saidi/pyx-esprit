require('dotenv').config();
const { sequelize } = require('./models');

async function migrate() {
  console.log('--- DB MIGRATION: Agrandissement contenu_html ---');
  try {
    const [results] = await sequelize.query("ALTER TABLE campagne_email MODIFY contenu_html LONGTEXT;");
    console.log('✅ La colonne contenu_html a été agrandie en LONGTEXT.');
    
    // Also check other text columns
    await sequelize.query("ALTER TABLE campagne_email MODIFY contenu_texte LONGTEXT;");
    console.log('✅ La colonne contenu_texte a été agrandie en LONGTEXT.');

  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
  } finally {
    await sequelize.close();
  }
}

migrate();
