#!/usr/bin/env node

/**
 * Script pour mettre à jour la structure de la base de données
 * Usage: node update-db-structure.js
 */

const { Sequelize } = require('sequelize');

async function updateDatabaseStructure() {
  console.log('🔧 Mise à jour de la structure de la base de données...\n');

  try {
    // Connexion à la base de données
    const sequelize = new Sequelize('golf_marketing', 'root', '', {
      host: 'localhost',
      dialect: 'mysql',
      logging: false,
    });

    await sequelize.authenticate();
    console.log('✅ Connexion à la base de données réussie');

    // 1. Ajouter les champs manquants à la table campagne_email
    console.log('\n📝 Mise à jour de la table campagne_email...');

    const updates = [
      'ALTER TABLE campagne_email ADD COLUMN IF NOT EXISTS createur_id INT AFTER id',
      'ALTER TABLE campagne_email ADD COLUMN IF NOT EXISTS segment_id INT AFTER createur_id',
      "ALTER TABLE campagne_email ADD COLUMN IF NOT EXISTS priorite ENUM('basse', 'normale', 'haute', 'urgente') DEFAULT 'normale' AFTER type_campagne",
      'ALTER TABLE campagne_email ADD COLUMN IF NOT EXISTS limite_envois INT AFTER priorite',
      'ALTER TABLE campagne_email ADD COLUMN IF NOT EXISTS nb_envoyes INT DEFAULT 0 AFTER limite_envois',
      'ALTER TABLE campagne_email ADD COLUMN IF NOT EXISTS nb_erreurs INT DEFAULT 0 AFTER nb_envoyes',
      "ALTER TABLE campagne_email ADD COLUMN IF NOT EXISTS tags_ids JSON DEFAULT '[]' AFTER nb_erreurs",
      "ALTER TABLE campagne_email ADD COLUMN IF NOT EXISTS contacts_ids JSON DEFAULT '[]' AFTER tags_ids",
      "ALTER TABLE campagne_email ADD COLUMN IF NOT EXISTS parametres JSON DEFAULT '{}' AFTER contacts_ids",
      'ALTER TABLE campagne_email ADD COLUMN IF NOT EXISTS actif BOOLEAN DEFAULT TRUE AFTER parametres',
    ];

    for (const update of updates) {
      try {
        await sequelize.query(update);
        console.log('   ✅ Structure mise à jour');
      } catch (error) {
        if (error.message.includes('Duplicate column name')) {
          console.log('   ℹ️ Colonne déjà présente');
        } else {
          console.log(`   ⚠️ ${error.message}`);
        }
      }
    }

    // 1b. Ajouter les champs manquants à modele_email
    console.log('\n📝 Mise à jour de la table modele_email...');
    const templateUpdates = [
      'ALTER TABLE modele_email ADD COLUMN IF NOT EXISTS blocks_json JSON AFTER contenu_html',
      'ALTER TABLE modele_email ADD COLUMN IF NOT EXISTS design_json JSON AFTER blocks_json',
    ];
    for (const update of templateUpdates) {
      try {
        await sequelize.query(update);
        console.log('   ✅ Structure modèle mise à jour');
      } catch (error) {
        if (error.message.includes('Duplicate column name'))
          console.log('   ℹ️ Colonne déjà présente');
        else console.log(`   ⚠️ ${error.message}`);
      }
    }

    // 2. Mettre à jour le type ENUM du statut
    console.log('\n🔄 Mise à jour du type ENUM statut...');
    try {
      await sequelize.query(`
        ALTER TABLE campagne_email 
        MODIFY COLUMN statut ENUM('brouillon', 'programmée', 'en_cours', 'envoyée', 'annulée', 'erreur') DEFAULT 'brouillon'
      `);
      console.log('   ✅ Type ENUM statut mis à jour');
    } catch (error) {
      console.log(`   ⚠️ ${error.message}`);
    }

    // 3. Mettre à jour les données existantes
    console.log('\n📊 Mise à jour des données existantes...');
    try {
      await sequelize.query(`
        UPDATE campagne_email SET 
          createur_id = 1,
          statut = 'envoyée',
          priorite = 'normale',
          actif = TRUE
        WHERE createur_id IS NULL
      `);
      console.log('   ✅ Données mises à jour');
    } catch (error) {
      console.log(`   ⚠️ ${error.message}`);
    }

    // 4. Ajouter des index pour améliorer les performances
    console.log("\n🚀 Ajout d'index...");
    const indexes = [
      'ALTER TABLE campagne_email ADD INDEX IF NOT EXISTS idx_statut (statut)',
      'ALTER TABLE campagne_email ADD INDEX IF NOT EXISTS idx_date_programmation (date_programmation)',
      'ALTER TABLE campagne_email ADD INDEX IF NOT EXISTS idx_createur_id (createur_id)',
      'ALTER TABLE campagne_email ADD INDEX IF NOT EXISTS idx_segment_id (segment_id)',
    ];

    for (const index of indexes) {
      try {
        await sequelize.query(index);
        console.log('   ✅ Index ajouté');
      } catch (error) {
        if (error.message.includes('Duplicate key name')) {
          console.log('   ℹ️ Index déjà présent');
        } else {
          console.log(`   ⚠️ ${error.message}`);
        }
      }
    }

    // 5. Vérifier la structure finale
    console.log('\n🔍 Vérification de la structure finale...');
    const [columns] = await sequelize.query('DESCRIBE campagne_email');
    console.log('   Structure finale de la table campagne_email:');
    columns.forEach((col) => {
      console.log(
        `     - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? '(nullable)' : '(required)'}`
      );
    });

    // 6. Backfill design_json for existing modele_email if missing
    console.log('\n🧩 Backfill design_json pour modele_email...');
    try {
      await sequelize.query(`
        UPDATE modele_email
        SET design_json = '{"body":{"rows":[],"values":{"backgroundColor":"#ffffff"}},"schemaVersion":7}'
        WHERE design_json IS NULL
      `);
      console.log('   ✅ Backfill effectué');
    } catch (error) {
      console.log(`   ⚠️ ${error.message}`);
    }

    // 7. Vérifier les données
    const [count] = await sequelize.query('SELECT COUNT(*) as count FROM campagne_email');
    console.log(`\n📊 Total des campagnes: ${count[0].count}`);

    await sequelize.close();
    console.log('\n🎉 Mise à jour de la base de données terminée avec succès !');
  } catch (error) {
    console.error('\n❌ Erreur lors de la mise à jour:', error.message);
    process.exit(1);
  }
}

// Exécuter la mise à jour
updateDatabaseStructure();
