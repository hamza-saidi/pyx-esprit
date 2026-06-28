#!/usr/bin/env node

/**
 * Script de test pour vérifier la base de données
 * Usage: node test-db.js
 */

const { Sequelize } = require('sequelize');

async function testDatabase() {
  console.log('🔍 Test de connexion à la base de données...\n');

  try {
    // Connexion à la base de données
    const sequelize = new Sequelize('golf_marketing', 'root', '', {
      host: 'localhost',
      dialect: 'mysql',
      logging: false,
    });

    await sequelize.authenticate();
    console.log('✅ Connexion à la base de données réussie');

    // Tester la table campagne_email
    console.log('\n📊 Test de la table campagne_email...');
    const [results] = await sequelize.query('SELECT COUNT(*) as count FROM campagne_email');
    console.log(`✅ Table accessible, ${results[0].count} campagnes trouvées`);

    // Vérifier la structure de la table
    console.log('\n🏗️ Structure de la table campagne_email:');
    const [columns] = await sequelize.query('DESCRIBE campagne_email');
    columns.forEach((col) => {
      console.log(
        `   - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? '(nullable)' : '(required)'}`
      );
    });

    // Vérifier les données existantes
    console.log('\n📋 Données existantes:');
    const [campagnes] = await sequelize.query(
      'SELECT id, titre, statut, type_campagne, date_creation FROM campagne_email LIMIT 5'
    );
    campagnes.forEach((camp) => {
      console.log(
        `   - ID: ${camp.id}, Titre: ${camp.titre}, Statut: ${camp.statut}, Type: ${camp.type_campagne}`
      );
    });

    // Vérifier les autres tables nécessaires
    console.log('\n🔍 Vérification des tables associées...');
    const tables = ['utilisateur', 'segment', 'statistique_campagne', 'envoi_email'];

    for (const table of tables) {
      try {
        const [count] = await sequelize.query(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`   ✅ ${table}: ${count[0].count} enregistrements`);
      } catch (error) {
        console.log(`   ❌ ${table}: Table non trouvée ou erreur`);
      }
    }

    await sequelize.close();
    console.log('\n🎉 Test de la base de données terminé avec succès !');
  } catch (error) {
    console.error('\n❌ Erreur lors du test:', error.message);

    if (error.code === 'ECONNREFUSED') {
      console.error('   💡 Vérifiez que MySQL est démarré');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error("   💡 Vérifiez le nom d'utilisateur et mot de passe MySQL");
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('   💡 Vérifiez que la base "golf_marketing" existe');
    }

    process.exit(1);
  }
}

// Exécuter le test
testDatabase();
