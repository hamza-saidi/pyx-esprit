#!/usr/bin/env node

/**
 * Test de la configuration CORS
 */

const http = require('http');

function testCORS() {
  console.log('🌐 Test de la configuration CORS...\n');

  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/campagnes',
    method: 'GET',
    headers: {
      'Origin': 'http://localhost:3000',
      'Access-Control-Request-Method': 'GET',
      'Access-Control-Request-Headers': 'Content-Type'
    }
  };

  const req = http.request(options, (res) => {
    console.log(`📡 Statut: ${res.statusCode}`);
    console.log(`🔒 CORS Headers:`);
    console.log(`   Access-Control-Allow-Origin: ${res.headers['access-control-allow-origin']}`);
    console.log(`   Access-Control-Allow-Methods: ${res.headers['access-control-allow-methods']}`);
    console.log(`   Access-Control-Allow-Headers: ${res.headers['access-control-allow-headers']}`);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log(`\n📋 Réponse complète:`);
      console.log(data);
    });
  });

  req.on('error', (error) => {
    console.error('❌ Erreur:', error.message);
  });

  req.end();
}

// Exécuter le test
testCORS();

