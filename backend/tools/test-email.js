#!/usr/bin/env node

/**
 * Script de test pour le service email
 * Usage: node test-email.js
 */

const emailService = require('./services/emailService');
const { CampagneEmail } = require('./models');

async function testEmailService() {
  console.log('🧪 Test du service email...\n');

  try {
    // 1. Vérifier la santé du service
    console.log('1. Vérification de la santé du service...');
    const health = await emailService.checkHealth();
    console.log(`   ✅ ${health.message}`);
    console.log(`   Statut: ${health.status}\n`);

    // 2. Créer une campagne de test
    console.log("2. Création d'une campagne de test...");
    const campagneTest = await CampagneEmail.create({
      titre: 'Test Email Service',
      sujet: 'Test du service email',
      contenu_html: `
        <h1>Test du service email</h1>
        <p>Ceci est un email de test pour vérifier le bon fonctionnement du service.</p>
        <p>Variables de test:</p>
        <ul>
          <li>Email: {{email}}</li>
          <li>Token: {{tracking_token}}</li>
          <li>Désabonnement: {{unsubscribe_link}}</li>
        </ul>
        <p>Pixel de tracking: {{tracking_pixel}}</p>
      `,
      contenu_texte: 'Test du service email - Variables: {{email}}, {{tracking_token}}',
      type_campagne: 'test',
      statut: 'brouillon',
      createur_id: 1,
      date_creation: new Date(),
    });
    console.log(`   ✅ Campagne créée avec l'ID: ${campagneTest.id}\n`);

    // 3. Tester l'envoi d'un email de test
    console.log("3. Test d'envoi d'email...");
    const emailTest = 'test@example.com';
    const resultatTest = await emailService.envoyerTest(emailTest, campagneTest);
    console.log(`   ✅ Email de test envoyé: ${resultatTest.messageId}\n`);

    // 4. Tester la personnalisation du contenu
    console.log('4. Test de personnalisation du contenu...');
    const envoiTest = {
      email_destinataire: 'test@example.com',
      token_tracking: 'test-token-123',
    };
    const contenuPersonnalise = emailService.personnaliserContenu(
      campagneTest.contenu_html,
      envoiTest
    );
    console.log('   ✅ Contenu personnalisé généré');
    console.log(
      '   Variables remplacées:',
      contenuPersonnalise.includes('{{email}}') ? '❌' : '✅'
    );
    console.log(
      '   Token remplacé:',
      contenuPersonnalise.includes('{{tracking_token}}') ? '❌' : '✅'
    );
    console.log(
      '   Lien désabonnement:',
      contenuPersonnalise.includes('{{unsubscribe_link}}') ? '❌' : '✅'
    );
    console.log(
      '   Pixel tracking:',
      contenuPersonnalise.includes('{{tracking_pixel}}') ? '❌' : '✅\n'
    );

    // 5. Test de conversion HTML vers texte
    console.log('5. Test de conversion HTML vers texte...');
    const htmlTest =
      '<h1>Titre</h1><p>Paragraphe avec <strong>gras</strong> et <em>italique</em>.</p>';
    const texteConverti = emailService.htmlToText(htmlTest);
    console.log(`   ✅ Conversion réussie: "${texteConverti}"\n`);

    // 6. Test de génération de token
    console.log('6. Test de génération de token...');
    const token1 = emailService.genererTokenTracking();
    const token2 = emailService.genererTokenTracking();
    console.log(`   ✅ Token 1: ${token1}`);
    console.log(`   ✅ Token 2: ${token2}`);
    console.log(`   ✅ Tokens uniques: ${token1 !== token2 ? 'Oui' : 'Non'}\n`);

    // 7. Nettoyage
    console.log('7. Nettoyage...');
    await campagneTest.destroy();
    console.log('   ✅ Campagne de test supprimée\n');

    console.log('🎉 Tous les tests sont passés avec succès !');
    console.log('Le service email est opérationnel.');
  } catch (error) {
    console.error('❌ Erreur lors des tests:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Fonction pour tester la configuration
function testConfiguration() {
  console.log('🔧 Test de la configuration...\n');

  const config = require('./config/email');

  console.log('Configuration SMTP:');
  console.log(`   Host: ${config.smtp.host}`);
  console.log(`   Port: ${config.smtp.port}`);
  console.log(`   Secure: ${config.smtp.secure}`);
  console.log(`   User: ${config.smtp.auth.user}`);
  console.log(`   Pass: ${config.smtp.auth.pass ? '***' : 'Non défini'}\n`);

  console.log('Configuration des limites:');
  console.log(`   Emails par seconde: ${config.limits.emailsPerSecond}`);
  console.log(`   Tentatives max: ${config.limits.maxRetries}`);
  console.log(`   Délai entre tentatives: ${config.limits.retryDelay}ms\n`);

  console.log('Configuration des templates:');
  console.log(`   URL désabonnement: ${config.templates.unsubscribeUrl}`);
  console.log(`   URL pixel tracking: ${config.templates.trackingPixelUrl}\n`);
}

// Fonction principale
async function main() {
  console.log('🚀 Test du module des campagnes email\n');
  console.log('=====================================\n');

  // Test de la configuration
  testConfiguration();

  // Test du service
  await testEmailService();

  console.log('\n=====================================');
  console.log('✅ Tests terminés avec succès !');
}

// Exécuter si appelé directement
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  });
}

module.exports = { testEmailService, testConfiguration };
