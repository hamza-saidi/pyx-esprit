const router = require('express').Router();
const { authenticateToken } = require('../middleware/auth');
const db = require('../models');
const { runWithTenant } = require('../utils/tenantContext');
const bcrypt = require('bcryptjs');
const { randomBytes } = require('crypto'); // SECURITY: cryptographically secure RNG for licence keys
const emailService = require('../services/emailService');
const { getClubStatusEmail } = require('../utils/clubStatusEmailTemplates');
const logger = require('../utils/logger');
const { checkDb, checkRedis, getRecentErrors } = require('../utils/healthChecks');
const queueService = require('../services/queueService');

function generateLicenceKey() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous 0/O/1/I
  const bytes = randomBytes(12);
  let key = 'PLX-';
  for (let i = 0; i < 12; i++) key += chars[bytes[i] % chars.length];
  return key;
}

// Middleware : global_admin uniquement
function requireGlobalAdmin(req, res, next) {
  if (req.user?.role !== 'global_admin')
    return res.status(403).json({ message: 'Accès réservé au super-administrateur Pylon.' });
  next();
}

router.use(authenticateToken, requireGlobalAdmin);

// GET /api/superadmin/clubs — liste tous les clubs avec stats rapides + licence active
router.get('/clubs', async (req, res, next) => {
  try {
    const clubs = await db.Club.findAll({ order: [['id', 'ASC']] });
    const result = await Promise.all(
      clubs.map(async (club) => {
        const [contacts, users, campagnes, licence] = await Promise.all([
          runWithTenant({ clubId: club.id, isSystem: true }, () =>
            db.Contact.count({ where: { club_id: club.id } })
          ),
          runWithTenant({ clubId: club.id, isSystem: true }, () =>
            db.Utilisateur.count({ where: { club_id: club.id } })
          ),
          runWithTenant({ clubId: club.id, isSystem: true }, () =>
            db.CampagneEmail.count({ where: { club_id: club.id } })
          ),
          db.Subscription.findOne({
            where: { club_id: club.id, statut: 'active' },
            include: [{ model: db.Plan, as: 'plan' }],
            order: [['date_creation', 'DESC']],
          }),
        ]);
        return { ...club.toJSON(), _stats: { contacts, users, campagnes }, licence };
      })
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/superadmin/plans — liste des plans + nombre réel de tenants actifs par plan
router.get('/plans', async (req, res, next) => {
  try {
    const plans = await db.Plan.findAll({ order: [['ordre_affichage', 'ASC']] });
    const counts = await db.Subscription.findAll({
      where: { statut: 'active' },
      attributes: ['plan_id', [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']],
      group: ['plan_id'],
      raw: true,
    });
    const countByPlan = counts.reduce((acc, row) => {
      acc[row.plan_id] = parseInt(row.count, 10);
      return acc;
    }, {});
    res.json(plans.map((p) => ({ ...p.toJSON(), tenants: countByPlan[p.id] || 0 })));
  } catch (err) {
    next(err);
  }
});

// POST /api/superadmin/clubs/:id/subscription — assigner/changer le plan d'un club
router.post('/clubs/:id/subscription', async (req, res, next) => {
  try {
    const club = await db.Club.findByPk(req.params.id);
    if (!club) return res.status(404).json({ message: 'Club introuvable.' });

    const { plan_id, duree_mois } = req.body;
    if (!plan_id) return res.status(400).json({ message: 'plan_id requis.' });

    const plan = await db.Plan.findByPk(plan_id);
    if (!plan) return res.status(404).json({ message: 'Plan introuvable.' });

    // Cancel any existing active subscription for this club before creating
    // the new one - a club has at most one active licence at a time.
    await db.Subscription.update(
      { statut: 'annulee' },
      { where: { club_id: club.id, statut: 'active' } }
    );

    const dateDebut = new Date();
    const dateFin = new Date(dateDebut);
    dateFin.setMonth(dateFin.getMonth() + (Number(duree_mois) || 12));

    const subscription = await db.Subscription.create({
      club_id: club.id,
      plan_id: plan.id,
      licence_key: generateLicenceKey(),
      date_debut: dateDebut,
      date_fin: dateFin,
      statut: 'active',
    });

    res.status(201).json({
      message: `Plan "${plan.nom}" assigné à "${club.nom}".`,
      subscription: { ...subscription.toJSON(), plan },
    });
  } catch (err) {
    next(err);
  }
});

// ── Facturation (suivi interne, aucune passerelle de paiement) ───────────────

async function generateInvoiceReference() {
  const year = new Date().getFullYear();
  const count = await db.Invoice.count({
    where: db.sequelize.where(db.sequelize.fn('YEAR', db.sequelize.col('date_emission')), year),
  });
  return `INV-${year}-${String(count + 1).padStart(3, '0')}`;
}

// GET /api/superadmin/invoices — liste avec club + plan joints
router.get('/invoices', async (req, res, next) => {
  try {
    const invoices = await db.Invoice.findAll({
      include: [
        { model: db.Club, as: 'club', attributes: ['id', 'nom'] },
        {
          model: db.Subscription,
          as: 'subscription',
          attributes: ['id'],
          include: [{ model: db.Plan, as: 'plan', attributes: ['id', 'nom', 'slug'] }],
        },
      ],
      order: [['date_emission', 'DESC']],
    });
    res.json(invoices);
  } catch (err) {
    next(err);
  }
});

// POST /api/superadmin/invoices — générer une facture pour un club
router.post('/invoices', async (req, res, next) => {
  try {
    const { club_id, montant, date_echeance } = req.body;
    if (!club_id) return res.status(400).json({ message: 'club_id requis.' });

    const club = await db.Club.findByPk(club_id);
    if (!club) return res.status(404).json({ message: 'Club introuvable.' });

    const subscription = await db.Subscription.findOne({
      where: { club_id, statut: 'active' },
      include: [{ model: db.Plan, as: 'plan' }],
      order: [['date_creation', 'DESC']],
    });

    const finalMontant =
      montant != null ? Number(montant) : Number(subscription?.plan?.prix_mensuel || 0);

    const invoice = await db.Invoice.create({
      club_id,
      subscription_id: subscription?.id || null,
      montant: finalMontant,
      devise: subscription?.plan?.devise || 'TND',
      date_emission: new Date(),
      date_echeance: date_echeance || null,
      statut: 'en_attente',
      reference: await generateInvoiceReference(),
    });

    res.status(201).json({ message: `Facture ${invoice.reference} générée.`, invoice });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/superadmin/invoices/:id — marquer payée / impayée
router.patch('/invoices/:id', async (req, res, next) => {
  try {
    const invoice = await db.Invoice.findByPk(req.params.id);
    if (!invoice) return res.status(404).json({ message: 'Facture introuvable.' });

    const { statut } = req.body;
    const allowedStatuts = ['payee', 'en_attente', 'en_retard', 'annulee'];
    if (!statut || !allowedStatuts.includes(statut)) {
      return res.status(400).json({ message: 'Statut invalide.' });
    }

    await invoice.update({
      statut,
      date_paiement: statut === 'payee' ? new Date() : null,
    });

    res.json(invoice);
  } catch (err) {
    next(err);
  }
});

// GET /api/superadmin/billing/summary — MRR/ARR/paiements en attente/répartition par plan
router.get('/billing/summary', async (req, res, next) => {
  try {
    const activeSubs = await db.Subscription.findAll({
      where: { statut: 'active' },
      include: [{ model: db.Plan, as: 'plan' }],
    });

    let mrr = 0;
    const byPlan = {};
    for (const sub of activeSubs) {
      const prix = Number(sub.plan?.prix_mensuel || 0);
      mrr += prix;
      const key = sub.plan?.nom || 'Sans plan';
      if (!byPlan[key]) byPlan[key] = { plan: key, montant_mensuel: prix, tenants: 0 };
      byPlan[key].tenants += 1;
    }

    const paiementsEnAttente = await db.Invoice.count({ where: { statut: 'en_attente' } });
    const totalInvoicesThisYear = await db.Invoice.count({
      where: db.sequelize.where(
        db.sequelize.fn('YEAR', db.sequelize.col('date_emission')),
        new Date().getFullYear()
      ),
    });

    res.json({
      mrr,
      arr: mrr * 12,
      paiements_en_attente: paiementsEnAttente,
      factures_cette_annee: totalInvoicesThisYear,
      revenu_par_plan: Object.values(byPlan).map((p) => ({
        ...p,
        revenu_total: p.montant_mensuel * p.tenants,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// ── Support (tickets logged by the SaaS admin on a tenant's behalf) ─────────

// GET /api/superadmin/tickets — liste avec club joint
router.get('/tickets', async (req, res, next) => {
  try {
    const tickets = await db.Ticket.findAll({
      include: [{ model: db.Club, as: 'club', attributes: ['id', 'nom'] }],
      order: [['date_creation', 'DESC']],
    });
    res.json(tickets);
  } catch (err) {
    next(err);
  }
});

// POST /api/superadmin/tickets — créer un ticket
router.post('/tickets', async (req, res, next) => {
  try {
    const { club_id, sujet, description, categorie, priorite } = req.body;
    if (!sujet) return res.status(400).json({ message: 'sujet requis.' });

    if (club_id) {
      const club = await db.Club.findByPk(club_id);
      if (!club) return res.status(404).json({ message: 'Club introuvable.' });
    }

    const ticket = await db.Ticket.create({
      club_id: club_id || null,
      sujet,
      description: description || null,
      categorie: categorie || null,
      priorite: priorite || 'normale',
      statut: 'ouvert',
    });

    const withClub = await db.Ticket.findByPk(ticket.id, {
      include: [{ model: db.Club, as: 'club', attributes: ['id', 'nom'] }],
    });
    res.status(201).json({ message: 'Ticket créé.', ticket: withClub });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/superadmin/tickets/:id — changer le statut / la priorité
router.patch('/tickets/:id', async (req, res, next) => {
  try {
    const ticket = await db.Ticket.findByPk(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Ticket introuvable.' });

    const { statut, priorite } = req.body;
    const allowedStatuts = ['ouvert', 'en_cours', 'resolu'];
    const allowedPriorites = ['haute', 'normale', 'basse'];

    const updates = { date_maj: new Date() };
    if (statut) {
      if (!allowedStatuts.includes(statut)) {
        return res.status(400).json({ message: 'Statut invalide.' });
      }
      updates.statut = statut;
      updates.date_resolution = statut === 'resolu' ? new Date() : null;
    }
    if (priorite) {
      if (!allowedPriorites.includes(priorite)) {
        return res.status(400).json({ message: 'Priorité invalide.' });
      }
      updates.priorite = priorite;
    }

    await ticket.update(updates);
    res.json(ticket);
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
    const ancienStatut = club.statut;
    const { statut, nom, email_contact } = req.body;
    const allowed = {};
    if (statut) allowed.statut = statut;
    if (nom) allowed.nom = nom;
    if (email_contact) allowed.email_contact = email_contact;
    await club.update(allowed);

    // Notify the tenant on an actual status transition. Best-effort: a
    // failed send is logged, not fatal to the status change itself (same
    // pattern as the MFA email failure handling in authController.js).
    if (statut && statut !== ancienStatut && club.email_contact) {
      const email = getClubStatusEmail(statut, club);
      if (email) {
        try {
          await emailService.sendGenericEmail(club.email_contact, email.subject, email.html);
        } catch (e) {
          logger.error(`[SUPERADMIN] Failed to send status-change email for club ${club.id}:`, {
            error: e.message,
          });
        }
      }
    }

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

// ── Monitoring (métriques applicatives internes réelles) ────────────────────

// GET /api/superadmin/monitoring — santé DB/Redis/email, profondeur de file
// BullMQ réelle, erreurs récentes des logs, uptime process. Pas de faux
// uptime %/latence par service ni de "sessions actives" : rien dans ce
// backend ne mesure honnêtement ces deux-là (JWT stateless, pas de
// middleware de timing) — voir le plan de la Zone 5.
router.get('/monitoring', async (req, res, next) => {
  try {
    const [db, redis, email, queue] = await Promise.all([
      checkDb(),
      checkRedis(),
      emailService.checkHealth(),
      queueService.getQueueMetrics(),
    ]);

    const services = [
      { name: 'Base de données', status: db.status === 'ok' ? 'ok' : 'error' },
      {
        name: 'Redis / BullMQ',
        status: redis.status === 'error' ? 'error' : redis.status === 'not_configured' ? 'warn' : 'ok',
      },
      { name: 'Service email', status: email.status === 'healthy' ? 'ok' : 'error' },
    ];

    const recentErrors = getRecentErrors();

    res.json({
      status: services.every((s) => s.status === 'ok') ? 'ok' : 'degraded',
      uptime_seconds: process.uptime(),
      services,
      queue,
      erreurs_24h: recentErrors.length,
      journal: recentErrors,
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
