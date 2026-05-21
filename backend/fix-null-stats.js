const { EnvoiEmail, StatistiqueCampagne, sequelize } = require('./models');

async function fixNullStats() {
  console.log('--- Starting cleanup of NULL statistics ---');
  try {
    // 1. Fix EnvoiEmail
    const [results1] = await sequelize.query(`
      UPDATE envoi_email 
      SET nombre_ouvertures = 0 
      WHERE nombre_ouvertures IS NULL
    `);
    console.log(`Updated NULL nombre_ouvertures in envoi_email`);

    const [results2] = await sequelize.query(`
      UPDATE envoi_email 
      SET nombre_clics = 0 
      WHERE nombre_clics IS NULL
    `);
    console.log(`Updated NULL nombre_clics in envoi_email`);

    const [results3] = await sequelize.query(`
      UPDATE envoi_email 
      SET liens_cliques = '[]' 
      WHERE liens_cliques IS NULL
    `);
    console.log(`Updated NULL liens_cliques in envoi_email`);

    // 2. Fix StatistiqueCampagne
    const [results4] = await sequelize.query(`
      UPDATE statistique_campagne 
      SET nb_envoyes = 0 WHERE nb_envoyes IS NULL;
    `);
    const [results5] = await sequelize.query(`
      UPDATE statistique_campagne 
      SET nb_ouverts = 0 WHERE nb_ouverts IS NULL;
    `);
    const [results6] = await sequelize.query(`
      UPDATE statistique_campagne 
      SET nb_clics = 0 WHERE nb_clics IS NULL;
    `);
    
    console.log('--- Cleanup complete! ---');
    process.exit(0);
  } catch (error) {
    console.error('Error during cleanup:', error);
    process.exit(1);
  }
}

fixNullStats();
