const router = require('express').Router();
const { authenticateToken } = require('../middleware/auth');
const db = require('../models');
const { runWithTenant } = require('../utils/tenantContext');
const bcrypt = require('bcryptjs');

// Middleware : global_admin uniquement
function requireGlobalAdmin(req, res, next) {
  if (req.user?.role !== 'global_admin')
    return res.status(403).json({ message: 'Accès réservé au super-administrateur Pylon.' });
  next();
}

router.use(authenticateToken, requireGlobalAdmin);

// GET /api/superadmin/clubs — liste tous les clubs avec stats rapides
router.get('/clubs', async (req, res, next) => {
  try {
    const clubs = await db.Club.findAll({ order: [['id', 'ASC']] });
    const result = await Promise.all(
      clubs.map(async (club) => {
        const [contacts, users, campagnes] = await Promise.all([
          runWithTenant({ clubId: club.id, isSystem: true }, () =>
            db.Contact.count({ where: { club_id: club.id } })
          ),
          runWithTenant({ clubId: club.id, isSystem: true }, () =>
            db.Utilisateur.count({ where: { club_id: club.id } })
          ),
          runWithTenant({ clubId: club.id, isSystem: true }, () =>
            db.CampagneEmail.count({ where: { club_id: club.id } })
          ),
        ]);
        return { ...club.toJSON(), _stats: { contacts, users, campagnes } };
      })
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/superadmin/clubs — créer un nouveau club/tenant
router.post('/clubs', async (req, res, next) => {
  try {
    const { nom, slug, email_contact, admin_email, admin_nom, admin_password } = req.body;
    if (!nom || !slug || !admin_email || !admin_password)
      return res
        .status(400)
        .json({ message: 'nom, slug, admin_email et admin_password sont requis.' });

    const existing = await db.Club.findOne({ where: { slug } });
    if (existing) return res.status(409).json({ message: `Le slug "${slug}" est déjà utilisé.` });

    const club = await db.Club.create({
      nom,
      slug,
      email_contact: email_contact || admin_email,
      statut: 'actif',
    });

    const hash = await bcrypt.hash(admin_password, 12);
    await runWithTenant({ clubId: club.id, isSystem: false }, () =>
      db.Utilisateur.create({
        nom: admin_nom || nom,
        email: admin_email,
        mot_de_passe: hash,
        role: 'admin',
        club_id: club.id,
      })
    );

    res
      .status(201)
      .json({ message: `Club "${nom}" créé avec succès.`, club_id: club.id, slug: club.slug });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/superadmin/clubs/:id — modifier statut du club
router.patch('/clubs/:id', async (req, res, next) => {
  try {
    const club = await db.Club.findByPk(req.params.id);
    if (!club) return res.status(404).json({ message: 'Club introuvable.' });
    const { statut, nom, email_contact } = req.body;
    const allowed = {};
    if (statut) allowed.statut = statut;
    if (nom) allowed.nom = nom;
    if (email_contact) allowed.email_contact = email_contact;
    await club.update(allowed);
    res.json(club);
  } catch (err) {
    next(err);
  }
});

// GET /api/superadmin/stats — stats globales toutes plateformes
router.get('/stats', async (req, res, next) => {
  try {
    const clubs = await db.Club.findAll();
    let totalContacts = 0,
      totalCampagnes = 0,
      totalEnvois = 0;
    for (const club of clubs) {
      totalContacts += await runWithTenant({ clubId: club.id, isSystem: true }, () =>
        db.Contact.count({ where: { club_id: club.id } })
      );
      totalCampagnes += await runWithTenant({ clubId: club.id, isSystem: true }, () =>
        db.CampagneEmail.count({ where: { club_id: club.id } })
      );
      totalEnvois += await runWithTenant({ clubId: club.id, isSystem: true }, () =>
        db.EnvoiEmail.count({ where: { club_id: club.id } })
      );
    }
    res.json({
      clubs: clubs.length,
      clubs_actifs: clubs.filter((c) => c.statut === 'actif').length,
      total_contacts: totalContacts,
      total_campagnes: totalCampagnes,
      total_envois: totalEnvois,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/superadmin/clubs/:id/users — utilisateurs d'un club
router.get('/clubs/:id/users', async (req, res, next) => {
  try {
    const users = await runWithTenant({ clubId: Number(req.params.id), isSystem: true }, () =>
      db.Utilisateur.findAll({
        where: { club_id: req.params.id },
        attributes: ['id', 'nom', 'email', 'role', 'date_creation'],
      })
    );
    res.json(users);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
