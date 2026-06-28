#!/usr/bin/env node

/**
 * Script de test pour vérifier l'API des campagnes
 * Usage: node test-api.js
 */

const axios = require('axios');

async function testAPI() {
  console.log("🌐 Test de l'API des campagnes...\n");

  try {
    // Test de l'endpoint principal
    console.log('📡 Test GET /api/campagnes...');
    const response = await axios.get('http://localhost:5000/api/campagnes');

    console.log('✅ API accessible !');
    console.log(`📊 Statut: ${response.status}`);
    console.log(`📋 Données reçues:`, response.data);

    if (response.data && response.data.length > 0) {
      console.log(`\n🎯 ${response.data.length} campagnes trouvées:`);
      response.data.forEach((campagne, index) => {
        console.log(`   ${index + 1}. ${campagne.titre} (${campagne.statut})`);
      });
    }
  } catch (error) {
    console.error('❌ Erreur API:', error.message);

    if (error.code === 'ECONNREFUSED') {
      console.error("   💡 Le serveur backend n'est pas démarré");
      console.error('   💡 Exécutez: npm run dev');
    } else if (error.response) {
      console.error(`   📡 Statut: ${error.response.status}`);
      console.error(`   📋 Erreur: ${error.response.data}`);
    }
  }
}

// Exécuter le test
testAPI();
