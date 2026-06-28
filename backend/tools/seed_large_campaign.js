const { sequelize, CampagneEmail, Contact, EnvoiEmail, StatistiqueCampagne } = require('./models');

async function seedLargeCampaign() {
  try {
    console.log('--- START SEEDING LARGE CAMPAIGN (2000 CONTACTS) ---');

    // 0. Trouver un utilisateur pour createur_id
    const { Utilisateur } = require('./models');
    const user = await Utilisateur.findOne();
    if (!user) {
      console.error('Aucun utilisateur trouvé pour être le créateur de la campagne.');
      return;
    }

    // 1. Créer une campagne
    const campagne = await CampagneEmail.create({
      titre: 'Campagne de Test Pagination (2000 contacts)',
      sujet: 'Test de performance',
      contenu_html: '<p>Ceci est un test</p>',
      statut: 'envoyée',
      type_campagne: 'email',
      createur_id: user.id, // Ajout du créateur
      date_creation: new Date(),
      date_envoi: new Date(),
    });

    console.log(`Campagne crée: ID ${campagne.id}`);

    // 2. Créer 2000 contacts et envois
    const contactsData = [];
    for (let i = 1; i <= 2000; i++) {
      contactsData.push({
        nom: `Testeur ${i}`,
        prenom: 'Pagination',
        email: `test${i}@example.com`,
        actif: true,
        type_client: 'membre',
        date_creation: new Date(),
      });
    }

    const contacts = await Contact.bulkCreate(contactsData);
    console.log('2000 contacts crées.');

    const envoisData = contacts.map((c, index) => {
      // Simuler quelques ouvertures et clics
      const ouvert = index % 5 === 0; // 20% d'ouverture
      const clique = index % 10 === 0; // 10% de clics

      return {
        campagne_id: campagne.id,
        contact_id: c.id,
        email_destinataire: c.email,
        statut: clique ? 'cliqué' : ouvert ? 'ouvert' : 'envoyé',
        date_envoi: new Date(),
        date_ouverture: ouvert ? new Date() : null,
        date_clic: clique ? new Date() : null,
        nombre_ouvertures: ouvert ? 1 : 0,
        nombre_clics: clique ? 1 : 0,
        token_tracking: `token_test_${campagne.id}_${c.id}`,
      };
    });

    await EnvoiEmail.bulkCreate(envoisData);
    console.log('2000 envois crées.');

    // 3. Créer les stats globales
    await StatistiqueCampagne.create({
      campagne_id: campagne.id,
      nb_envoyes: 2000,
      nb_ouverts: 400,
      nb_clics: 200,
      nb_erreurs: 0,
      nb_desabonnements: 0,
    });

    console.log('--- SEEDING COMPLETED SUCCESSFULY ---');
    console.log(
      `Vous pouvez maintenant consulter la campagne ID ${campagne.id} dans vos statistiques.`
    );
  } catch (error) {
    console.error('Erreur seeding:', error);
  } finally {
    process.exit(0);
  }
}

seedLargeCampaign();
