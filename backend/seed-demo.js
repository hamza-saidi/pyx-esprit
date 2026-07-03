/**
 * seed-demo.js — Données de démonstration Golf Citrus Hammamet
 * Usage : docker exec golf_huub_backend node seed-demo.js
 */

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('./models');
const { runWithTenant } = require('./utils/tenantContext');

const CONTACTS = [
  { prenom: 'Karim',   nom: 'Ben Salah',   email: 'k.bensalah@gmail.com',        telephone: '+216 55 123 456', statut: 'client',   type_client: 'membre',    actif: true,  consentement_rgpd: true,  date_naissance: '1975-03-15', pays: 'Tunisie', source: 'inscription' },
  { prenom: 'Sonia',   nom: 'Ghariani',    email: 'sonia.ghariani@topnet.tn',     telephone: '+216 98 234 567', statut: 'client',   type_client: 'membre',    actif: true,  consentement_rgpd: true,  date_naissance: '1982-07-22', pays: 'Tunisie', source: 'inscription' },
  { prenom: 'Mehdi',   nom: 'Trabelsi',    email: 'mtrabelsi@orange.tn',          telephone: '+216 22 345 678', statut: 'client',   type_client: 'membre',    actif: true,  consentement_rgpd: true,  date_naissance: '1969-11-08', pays: 'Tunisie', source: 'inscription' },
  { prenom: 'Leila',   nom: 'Mansouri',    email: 'leila.mansouri@gmail.com',     telephone: '+216 55 456 789', statut: 'client',   type_client: 'membre',    actif: true,  consentement_rgpd: true,  date_naissance: '1990-05-30', pays: 'Tunisie', source: 'inscription' },
  { prenom: 'Ahmed',   nom: 'Boughzala',   email: 'a.boughzala@hexabyte.tn',      telephone: '+216 71 567 890', statut: 'client',   type_client: 'membre',    actif: true,  consentement_rgpd: true,  date_naissance: '1958-09-14', pays: 'Tunisie', source: 'inscription' },
  { prenom: 'Nadia',   nom: 'Chaabane',    email: 'nadia.chaabane@yahoo.fr',      telephone: '+216 98 678 901', statut: 'client',   type_client: 'membre',    actif: true,  consentement_rgpd: true,  date_naissance: '1985-02-28', pays: 'Tunisie', source: 'formulaire' },
  { prenom: 'Riadh',   nom: 'Oueslati',    email: 'roueslati@gmail.com',          telephone: '+216 55 789 012', statut: 'client',   type_client: 'membre',    actif: true,  consentement_rgpd: true,  date_naissance: '1972-06-17', pays: 'Tunisie', source: 'inscription' },
  { prenom: 'Ines',    nom: 'Zouiten',     email: 'ines.zouiten@topnet.tn',       telephone: '+216 22 890 123', statut: 'client',   type_client: 'membre',    actif: true,  consentement_rgpd: true,  date_naissance: '1988-12-03', pays: 'Tunisie', source: 'formulaire' },
  { prenom: 'Tarek',   nom: 'Belhadj',     email: 'tarek.belhadj@gmail.com',      telephone: '+216 98 901 234', statut: 'client',   type_client: 'membre',    actif: true,  consentement_rgpd: true,  date_naissance: '1965-04-25', pays: 'Tunisie', source: 'inscription' },
  { prenom: 'Amira',   nom: 'Saidi',       email: 'amira.saidi@orange.tn',        telephone: '+216 55 012 345', statut: 'client',   type_client: 'membre',    actif: true,  consentement_rgpd: true,  date_naissance: '1993-08-11', pays: 'Tunisie', source: 'formulaire' },
  { prenom: 'Hichem',  nom: 'Jebali',      email: 'h.jebali@gmail.com',           telephone: '+216 71 123 456', statut: 'prospect', type_client: 'membre',    actif: false, consentement_rgpd: true,  date_naissance: '1978-01-20', pays: 'Tunisie', source: 'inscription' },
  { prenom: 'Fatma',   nom: 'Rekik',       email: 'fatma.rekik@hotmail.fr',       telephone: '+216 22 234 567', statut: 'prospect', type_client: 'membre',    actif: false, consentement_rgpd: true,  date_naissance: '1983-10-05', pays: 'Tunisie', source: 'inscription' },
  { prenom: 'Walid',   nom: 'Ferchichi',   email: 'w.ferchichi@yahoo.fr',         telephone: '+216 98 345 678', statut: 'prospect', type_client: 'membre',    actif: false, consentement_rgpd: true,  date_naissance: '1970-07-31', pays: 'Tunisie', source: 'inscription' },
  { prenom: 'Pierre',  nom: 'Dupont',      email: 'p.dupont@golftours.fr',        telephone: '+33 6 12 34 56 78', statut: 'client', type_client: 'entreprise', actif: true,  consentement_rgpd: true,  pays: 'France',  source: 'partenariat' },
  { prenom: 'Klaus',   nom: 'Weber',       email: 'k.weber@golfreisen.de',        telephone: '+49 170 123 4567',  statut: 'client', type_client: 'entreprise', actif: true,  consentement_rgpd: true,  pays: 'Allemagne', source: 'partenariat' },
  { prenom: 'Maria',   nom: 'Gonzalez',    email: 'm.gonzalez@viagolf.es',        telephone: '+34 600 123 456',   statut: 'client', type_client: 'entreprise', actif: true,  consentement_rgpd: true,  pays: 'Espagne', source: 'partenariat' },
  { prenom: 'James',   nom: 'Morrison',    email: 'j.morrison@ukgolftours.co.uk', telephone: '+44 7911 123456',   statut: 'client', type_client: 'entreprise', actif: true,  consentement_rgpd: true,  pays: 'Royaume-Uni', source: 'partenariat' },
  { prenom: 'Slim',    nom: 'Boukthir',    email: 's.boukthir@golfmagazine.tn',   telephone: '+216 55 567 890', statut: 'client',   type_client: 'entreprise', actif: true,  consentement_rgpd: true,  pays: 'Tunisie', source: 'presse' },
  { prenom: 'Dorsaf',  nom: 'Ben Ali',     email: 'dorsaf.benali@sport365.tn',    telephone: '+216 98 678 901', statut: 'client',   type_client: 'entreprise', actif: true,  consentement_rgpd: true,  pays: 'Tunisie', source: 'presse' },
  { prenom: 'Laurent', nom: 'Martin',      email: 'l.martin@golfeuro.fr',         telephone: '+33 6 98 76 54 32', statut: 'client', type_client: 'entreprise', actif: true,  consentement_rgpd: true,  pays: 'France', source: 'presse' },
  { prenom: 'Mondher', nom: 'Hamrouni',    email: 'm.hamrouni@golfmonastir.tn',   telephone: '+216 73 123 456', statut: 'client',   type_client: 'entreprise', actif: true,  consentement_rgpd: true,  pays: 'Tunisie', source: 'partenariat' },
  { prenom: 'Khaled',  nom: 'Hajjem',      email: 'k.hajjem@banque-zitouna.tn',   telephone: '+216 71 234 567', statut: 'client',   type_client: 'entreprise', actif: true,  consentement_rgpd: true,  pays: 'Tunisie', source: 'partenariat' },
  { prenom: 'Sophie',  nom: 'Bernard',     email: 's.bernard@gmail.com',          telephone: '+33 7 12 34 56 78', statut: 'prospect', type_client: 'membre',   actif: true,  consentement_rgpd: true,  date_naissance: '1979-06-14', pays: 'France', source: 'formulaire' },
  { prenom: 'Thomas',  nom: 'Schneider',   email: 't.schneider@gmail.de',         telephone: '+49 151 987 6543',  statut: 'prospect', type_client: 'membre',   actif: true,  consentement_rgpd: true,  pays: 'Allemagne', source: 'formulaire' },
  { prenom: 'Marco',   nom: 'Rossi',       email: 'm.rossi@libero.it',            telephone: '+39 340 123 4567',  statut: 'prospect', type_client: 'membre',   actif: true,  consentement_rgpd: false, pays: 'Italie', source: 'formulaire' },
];

const TAGS = ['VIP', 'Newsletter', 'Compétiteur', 'International', 'Partenaire', 'Tournoi Automne', 'Junior Academy', 'Presse'];

const HTML_TOURNOI = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
  <div style="background:#0f172a;padding:32px;text-align:center;">
    <h1 style="color:#f8fafc;margin:0;">Golf Citrus Hammamet</h1>
    <p style="color:#94a3b8;margin:8px 0 0;">Tournoi d'Automne 2026</p>
  </div>
  <div style="padding:32px;">
    <h2 style="color:#0f172a;">Cher(e) {{prenom}},</h2>
    <p>Nous avons le plaisir de vous inviter à notre <strong>Tournoi d'Automne 2026</strong>, les <strong>18 et 19 octobre 2026</strong>.</p>
    <div style="background:#eff6ff;border-left:4px solid #2563eb;padding:16px;margin:24px 0;">
      <p style="margin:0;font-weight:bold;color:#1e40af;">📅 18-19 octobre 2026 &nbsp;|&nbsp; 📍 Golf Citrus Hammamet &nbsp;|&nbsp; 👥 80 places</p>
    </div>
    <p>Inscriptions avant le <strong>1er octobre</strong> — tarif préférentiel membre.</p>
    <a href="#" style="display:inline-block;background:#2563eb;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;">Je m'inscris</a>
  </div>
  <div style="background:#f1f5f9;padding:16px;text-align:center;font-size:12px;color:#64748b;">
    Golf Citrus Hammamet — Route Touristique, Hammamet 8050 &nbsp;|&nbsp; <a href="#" style="color:#2563eb;">Se désabonner</a>
  </div>
</div>`;

const HTML_NEWSLETTER = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
  <div style="background:#0f172a;padding:24px;text-align:center;">
    <h1 style="color:#f8fafc;font-size:22px;margin:0;">Newsletter Juillet 2026</h1>
  </div>
  <div style="padding:28px;">
    <h2 style="color:#0f172a;">Bonjour {{prenom}},</h2>
    <h3>🏆 Tournoi de Printemps — Résultats</h3>
    <p>64 participants ont profité d'un parcours en excellent état. Félicitations aux lauréats !</p>
    <h3>🌿 Améliorations du parcours</h3>
    <p>Rénovation du putting green n°12 terminée. Nouveau système d'irrigation automatique opérationnel.</p>
    <h3>📅 Agenda</h3>
    <ul>
      <li>15 juillet — Compétition mensuelle membres</li>
      <li>3 août — Junior Academy (inscriptions ouvertes)</li>
      <li>18-19 octobre — <strong>Tournoi d'Automne</strong></li>
    </ul>
  </div>
  <div style="background:#f1f5f9;padding:16px;text-align:center;font-size:12px;color:#64748b;">
    <a href="#" style="color:#2563eb;">Se désabonner</a>
  </div>
</div>`;

async function seed() {
  console.log('\n🌱 Seed Golf Citrus Hammamet...\n');

  await db.sequelize.authenticate();
  console.log('✅ MySQL OK');

  // ── Club ──────────────────────────────────────────────────────────────────
  let club = await db.Club.findByPk(1);
  if (!club) {
    club = await db.Club.create({ id: 1, nom: 'Golf Citrus Hammamet', slug: 'citrus-hammamet', email_contact: 'contact@citrusgolfclub.com', statut: 'actif' });
  } else {
    await club.update({ nom: 'Golf Citrus Hammamet', slug: 'citrus-hammamet' });
  }
  console.log('✅ Club : Golf Citrus Hammamet');

  // ── Admin ─────────────────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash('Admin2026!', 12);
  const [admin] = await runWithTenant({ clubId: 1, isSystem: false }, () =>
    db.Utilisateur.findOrCreate({
      where: { email: 'admin@golfhuub.com' },
      defaults: { nom: 'Walid Ben Mansour', email: 'admin@golfhuub.com', mot_de_passe: adminHash, role: 'admin', club_id: 1 },
    })
  );
  console.log('✅ Admin : admin@golfhuub.com / Admin2026!');

  await runWithTenant({ clubId: 1, isSystem: false }, async () => {

    // ── Tags ──────────────────────────────────────────────────────────────────
    const tagMap = {};
    for (const nom of TAGS) {
      const [tag] = await db.Tag.findOrCreate({ where: { nom, club_id: 1 }, defaults: { nom, club_id: 1 } });
      tagMap[nom] = tag;
    }
    console.log(`✅ ${TAGS.length} tags`);

    // ── Contacts ──────────────────────────────────────────────────────────────
    const contacts = [];
    for (const c of CONTACTS) {
      const [contact] = await db.Contact.findOrCreate({
        where: { email: c.email, club_id: 1 },
        defaults: { ...c, club_id: 1 },
      });
      contacts.push(contact);
    }
    console.log(`✅ ${contacts.length} contacts`);

    // ── Tags → contacts ───────────────────────────────────────────────────────
    for (const c of contacts.slice(0, 5))   await c.addTag(tagMap['VIP']).catch(() => {});
    for (const c of contacts.filter(x => x.consentement_rgpd)) await c.addTag(tagMap['Newsletter']).catch(() => {});
    for (const c of contacts.filter(x => x.type_client === 'membre' && x.actif).slice(0, 8)) await c.addTag(tagMap['Compétiteur']).catch(() => {});
    for (const c of contacts.filter(x => x.pays !== 'Tunisie')) {
      await c.addTag(tagMap['International']).catch(() => {});
      await c.addTag(tagMap['Partenaire']).catch(() => {});
    }
    for (const c of contacts.slice(0, 10)) await c.addTag(tagMap['Tournoi Automne']).catch(() => {});
    for (const c of contacts.filter(x => x.source === 'presse')) await c.addTag(tagMap['Presse']).catch(() => {});
    console.log('✅ Tags assignés');

    // ── Abonnements ───────────────────────────────────────────────────────────
    const abons = [
      { nom: 'Cotisation annuelle — Membre titulaire', prix: 1200, duree_mois: 12, description: 'Accès illimité 18 trous, club house, priorité réservation.', actif: true, club_id: 1 },
      { nom: 'Cotisation annuelle — Membre associé',   prix: 800,  duree_mois: 12, description: 'Accès parcours semaine + club house.', actif: true, club_id: 1 },
      { nom: 'Formule semestrielle',                   prix: 650,  duree_mois: 6,  description: 'Idéal résidents saisonniers.', actif: true, club_id: 1 },
      { nom: 'Pass visiteur mensuel',                  prix: 180,  duree_mois: 1,  description: 'Pour touristes et visiteurs.', actif: true, club_id: 1 },
    ];
    for (const a of abons)
      await db.Abonnement.findOrCreate({ where: { nom: a.nom, club_id: 1 }, defaults: a });
    console.log(`✅ ${abons.length} plans d'abonnement`);

    // ── Segments ──────────────────────────────────────────────────────────────
    const segs = [
      { nom: 'Membres actifs', description: 'Membres avec statut client et actif=true', criteres: JSON.stringify([{ field: 'type_client', op: 'eq', value: 'membre' }, { field: 'actif', op: 'eq', value: true }]), club_id: 1 },
      { nom: 'Partenaires internationaux', description: 'Contacts hors Tunisie', criteres: JSON.stringify([{ field: 'pays', op: 'neq', value: 'Tunisie' }]), club_id: 1 },
      { nom: 'À réengager', description: 'Contacts inactifs', criteres: JSON.stringify([{ field: 'actif', op: 'eq', value: false }]), club_id: 1 },
    ];
    for (const s of segs)
      await db.Segment.findOrCreate({ where: { nom: s.nom, club_id: 1 }, defaults: s });
    console.log('✅ 3 segments');

    // ── Campagnes ─────────────────────────────────────────────────────────────
    const campagnes = [
      { titre: 'Invitation Tournoi d\'Automne 2026', sujet: '🏌️ Tournoi d\'Automne — Inscriptions ouvertes !', contenu_html: HTML_TOURNOI, statut: 'envoyée', club_id: 1, createur_id: admin.id },
      { titre: 'Newsletter Juillet 2026', sujet: '🌞 Newsletter Golf Citrus — Juillet 2026', contenu_html: HTML_NEWSLETTER, statut: 'envoyée', club_id: 1, createur_id: admin.id },
      { titre: 'Réengagement membres inactifs', sujet: '😴 Vous nous manquez — Revenez sur le green !', contenu_html: '<p>Cher(e) {{prenom}}, cela fait un moment... Venez profiter d\'une partie offerte !</p>', statut: 'brouillon', club_id: 1, createur_id: admin.id },
      { titre: 'Renouvellement abonnements — Automne', sujet: '💰 Renouvelez votre abonnement — 10% de réduction jusqu\'au 30 sept.', contenu_html: '<p>Bonjour {{prenom}}, votre abonnement expire bientôt...</p>', statut: 'programmée', date_programmation: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), club_id: 1, createur_id: admin.id },
    ];
    const createdCamps = [];
    for (const camp of campagnes) {
      const [c] = await db.CampagneEmail.findOrCreate({ where: { titre: camp.titre, club_id: 1 }, defaults: camp });
      createdCamps.push(c);
    }
    console.log(`✅ ${createdCamps.length} campagnes`);

    // ── Stats pour campagnes envoyées ─────────────────────────────────────────
    const eligible = contacts.filter(x => x.consentement_rgpd && x.actif);
    const total = eligible.length;
    const nbOuverts = Math.floor(total * 0.312);
    const nbClics  = Math.floor(total * 0.041);

    for (const camp of createdCamps.filter(c => c.statut === 'envoyée')) {
      await db.StatistiqueCampagne.findOrCreate({
        where: { campagne_id: camp.id, club_id: 1 },
        defaults: { campagne_id: camp.id, club_id: 1, nb_envoyes: total, nb_ouverts: nbOuverts, nb_clics: nbClics, nb_desabonnements: 0 },
      });

      for (let i = 0; i < eligible.length; i++) {
        const contact = eligible[i];
        await db.EnvoiEmail.findOrCreate({
          where: { campagne_id: camp.id, contact_id: contact.id, club_id: 1 },
          defaults: {
            campagne_id: camp.id, contact_id: contact.id, club_id: 1,
            email_destinataire: contact.email,
            statut: i < nbClics ? 'cliqué' : i < nbOuverts ? 'ouvert' : 'livré',
            token_tracking: crypto.randomUUID(),
            actif: true,
            date_envoi: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            date_livraison: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 60000),
            date_ouverture: i < nbOuverts ? new Date(Date.now() - 6 * 24 * 60 * 60 * 1000) : null,
            date_clic: i < nbClics ? new Date(Date.now() - 6 * 24 * 60 * 60 * 1000 + 300000) : null,
          },
        });
      }
    }
    console.log('✅ Statistiques campagnes générées');

    // ── Événements ────────────────────────────────────────────────────────────
    await db.Evenement.findOrCreate({
      where: { titre: 'Tournoi d\'Automne 2026', club_id: 1 },
      defaults: { titre: 'Tournoi d\'Automne 2026', date: new Date('2026-10-18'), lieu: 'Parcours 18 trous', description: 'Compétition Stableford ouverte membres et invités. Places limitées à 80 joueurs.', capacite_max: 80, statut: 'planifié', actif: true, club_id: 1 },
    }).catch(() => {});

    await db.Evenement.findOrCreate({
      where: { titre: 'Junior Academy — Août 2026', club_id: 1 },
      defaults: { titre: 'Junior Academy — Août 2026', date: new Date('2026-08-03'), lieu: 'Practice + putting green', description: 'Initiation au golf pour les 8-16 ans. Moniteurs certifiés FFGolf.', capacite_max: 30, statut: 'planifié', actif: true, club_id: 1 },
    }).catch(() => {});

    console.log('✅ 2 événements');
  });

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 SEED OK\n');
  console.log('  🌐 http://localhost:3000');
  console.log('  📧 admin@golfhuub.com  /  Admin2026!');
  console.log(`  👥 ${CONTACTS.length} contacts · 4 campagnes · 7 tags · 3 segments`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await db.sequelize.close();
}

seed().catch(err => {
  console.error('❌', err.message);
  process.exit(1);
});
