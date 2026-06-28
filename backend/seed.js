const faker = require('faker');
const bcrypt = require('bcryptjs');
const db = require('./models');

async function seed() {
  await db.sequelize.sync({ force: true });

  // Utilisateurs
  const users = [];
  for (let i = 0; i < 5; i++) {
    users.push(
      await db.Utilisateur.create({
        nom: faker.name.findName(),
        email: faker.internet.email(),
        mot_de_passe: await bcrypt.hash('password', 10),
        role: i === 0 ? 'admin' : 'employee',
      })
    );
  }

  // Tags
  const tags = [];
  for (let i = 0; i < 5; i++) {
    tags.push(
      await db.Tag.create({
        nom: faker.hacker.noun(),
      })
    );
  }

  // Segments
  const segments = [];
  for (let i = 0; i < 3; i++) {
    segments.push(
      await db.Segment.create({
        nom: faker.commerce.department(),
        criteres: { random: faker.random.word() },
      })
    );
  }

  // Contacts
  const contacts = [];
  for (let i = 0; i < 20; i++) {
    const contact = await db.Contact.create({
      prenom: faker.name.firstName(),
      nom: faker.name.lastName(),
      email: faker.internet.email(),
      telephone: faker.phone.phoneNumber(),
      sexe: faker.random.arrayElement(['Homme', 'Femme', 'Autre']),
      handicap: faker.datatype.float({ min: 0, max: 54, precision: 0.1 }),
      home_club: faker.company.companyName(),
      date_naissance: faker.date.past(40, new Date(2005, 0, 1)),
      nationalite: faker.address.country(),
      type_client: faker.random.arrayElement(['membre', 'entreprise']),
      ville: faker.address.city(),
      entreprise: faker.company.companyName(),
      remarques: faker.lorem.sentence(),
      actif: faker.datatype.boolean(),
      adresse: faker.address.streetAddress(),
      code_postal: faker.address.zipCode(),
      pays: faker.address.country(),
      statut: faker.random.arrayElement(['prospect', 'client', 'archivé']),
      source: faker.company.companyName(),
      metadata: { linkedin: faker.internet.url(), custom: faker.lorem.word() },
      historique: [{ action: 'création', date: faker.date.past() }],
      date_inscription: faker.date.past(2),
      consentement_rgpd: faker.datatype.boolean(),
    });
    // Ajout tags aléatoires
    await contact.setTags(
      faker.helpers
        .shuffle(tags)
        .slice(0, faker.datatype.number({ min: 1, max: 3 }))
        .map((t) => t.id)
    );
    // Ajout de notes
    for (let n = 0; n < faker.datatype.number({ min: 1, max: 3 }); n++) {
      await db.Note.create({
        contact_id: contact.id,
        contenu: faker.lorem.sentences(2),
        auteur: faker.name.findName(),
      });
    }
    contacts.push(contact);
  }

  // Événements
  const events = [];
  for (let i = 0; i < 5; i++) {
    events.push(
      await db.Evenement.create({
        titre: faker.company.catchPhrase(),
        date: faker.date.future(),
        lieu: faker.address.city(),
        description: faker.lorem.paragraph(),
        index_requis: faker.datatype.float({ min: 0, max: 54, precision: 0.1 }),
      })
    );
  }

  // RSVP (liens contacts/événements)
  for (let i = 0; i < 20; i++) {
    await db.Rsvp.create({
      contact_id: faker.random.arrayElement(contacts).id,
      evenement_id: faker.random.arrayElement(events).id,
      statut: faker.random.arrayElement(['invité', 'confirmé', 'absent']),
    });
  }

  // Modèles d'email
  for (let i = 0; i < 3; i++) {
    await db.ModeleEmail.create({
      nom: faker.commerce.productName(),
      contenu_html: `<h1>${faker.company.catchPhrase()}</h1><p>${faker.lorem.paragraph()}</p>`,
    });
  }

  // Campagnes email
  const campagnes = [];
  for (let i = 0; i < 5; i++) {
    campagnes.push(
      await db.CampagneEmail.create({
        titre: faker.company.bsBuzz(),
        sujet: faker.company.bs(),
        contenu_html: `<h2>${faker.company.catchPhrase()}</h2><p>${faker.lorem.text()}</p>`,
        contenu_texte: faker.lorem.sentences(2),
        type_campagne: faker.random.arrayElement([
          'newsletter',
          'promotion',
          'invitation',
          'notification',
          'autre',
        ]),
        date_programmation: faker.date.future(),
        statut: faker.random.arrayElement(['brouillon', 'programmée', 'envoyée']),
        createur_id: faker.random.arrayElement(users).id,
        segment_id: faker.random.arrayElement(segments).id,
        priorite: faker.random.arrayElement(['basse', 'normale', 'haute']),
        limite_envois: faker.datatype.number({ min: 50, max: 500 }),
        tags_ids: [],
        contacts_ids: [],
      })
    );
  }

  // Statistiques campagnes
  for (const campagne of campagnes) {
    await db.StatistiqueCampagne.create({
      campagne_id: campagne.id,
      nb_envoyes: faker.datatype.number({ min: 10, max: 100 }),
      nb_ouverts: faker.datatype.number({ min: 0, max: 100 }),
      nb_clics: faker.datatype.number({ min: 0, max: 50 }),
      nb_desabonnements: faker.datatype.number({ min: 0, max: 10 }),
    });
  }

  console.log('Base de données peuplée avec des données factices !');
  process.exit();
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
