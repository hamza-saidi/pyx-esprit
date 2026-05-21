#!/usr/bin/env node

/**
 * Script de test pour l'authentification
 * Usage: node test-auth.js
 */

const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

async function testAuth() {
  console.log('🔐 Test de l\'authentification...\n');

  try {
    // Test de connexion
    const port = process.env.PORT || process.env.BACKEND_PORT || 51000;
    const baseUrl = `http://localhost:${port}`;
    console.log(`📡 Test POST ${baseUrl}/api/auth/login...`);
    const loginResponse = await axios.post(`${baseUrl}/api/auth/login`, {
      email: 'hamza@pylon-dw.com', // Utilisez un email existant dans votre base
      mot_de_passe: 'hamza123'
    });
    
    console.log('✅ Connexion réussie !');
    console.log(`📋 Token: ${loginResponse.data.token.substring(0, 20)}...`);
    console.log(`👤 Utilisateur: ${loginResponse.data.user.nom} (${loginResponse.data.user.role})`);

    // Test de l'API des campagnes avec le token
    console.log('\n📡 Test GET /api/campagnes avec token...');
    const campagnesResponse = await axios.get(`${baseUrl}/api/campagnes`, {
      headers: {
        'Authorization': `Bearer ${loginResponse.data.token}`
      }
    });
    
    console.log('✅ API campagnes accessible !');
    console.log(`📊 ${campagnesResponse.data.data?.length || campagnesResponse.data.length} campagnes trouvées`);
    
    if (campagnesResponse.data.data) {
      campagnesResponse.data.data.forEach((campagne, index) => {
        console.log(`   ${index + 1}. ${campagne.titre} (${campagne.statut})`);
      });
    }

  } catch (error) {
    // Print as much diagnostic info as possible
    try { console.error('❌ Erreur:', error.message); } catch {}
    try { console.error('   🧩 Name:', error.name); } catch {}
    try { if (error.code) console.error('   💥 Code:', error.code); } catch {}
    try { if (error.stack) console.error('   🧵 Stack:', error.stack.split('\n').slice(0, 3).join('\n')); } catch {}
    if (error.response) {
      try { console.error(`   📡 Statut: ${error.response.status}`); } catch {}
      try { console.error(`   📋 Data: ${JSON.stringify(error.response.data, null, 2)}`); } catch {}
      try { console.error(`   🧾 Headers: ${JSON.stringify(error.response.headers, null, 2)}`); } catch {}
    } else if (error.request) {
      try { console.error('   🚫 No response received from server.'); } catch {}
    }
  }
}

// Exécuter le test
testAuth();
