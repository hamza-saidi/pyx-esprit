const { sequelize } = require('./models');
const path = require('path');

async function checkHealth() {
  console.log('--- DIAGNOSTIC SERVEUR GOLF HUUB ---');
  console.log('Date:', new Date().toLocaleString());
  console.log('Node Version:', process.version);
  console.log('CWD:', process.cwd());
  console.log('------------------------------------');

  // 1. Test Base de données
  try {
    await sequelize.authenticate();
    console.log('✅ BASE DE DONNÉES : Connexion réussie.');
  } catch (err) {
    console.error('❌ BASE DE DONNÉES : Échec de connexion !');
    console.error('Erreur:', err.message);
  }

  // 2. Test Syntaxique des contrôleurs critiques
  const controllers = [
    './controllers/statisticsController',
    './controllers/campagneController',
    './controllers/contactController',
  ];

  console.log('\n--- VÉRIFICATION DES FICHIERS ---');
  for (const ctrl of controllers) {
    try {
      require(ctrl);
      console.log(`✅ ${ctrl} : Chargé avec succès.`);
    } catch (err) {
      console.error(`❌ ${ctrl} : ERREUR DE CHARGEMENT !`);
      console.error('Détail:', err.stack);
    }
  }

  console.log('\n------------------------------------');
  console.log('Diagnostic terminé.');
  process.exit(0);
}

checkHealth();
