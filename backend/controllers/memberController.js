'use strict';

const { Contact, Abonnement, sequelize } = require('../models');
const { Op } = require('sequelize');
const { syncMembershipStatuses } = require('../services/membershipService');

const VALID_STATUTS = [
  'actif',
  'expiré',
  'en_attente_paiement',
  'aucun',
  'a_renouveler',
  'archive',
];

// GET /api/membres/stats
exports.getStats = async (req, res) => {
  try {
    const clubId = Number(req.clubId);
    await syncMembershipStatuses(clubId);

    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const [byStatus, newThisMonth, byType] = await Promise.all([
      Contact.findAll({
        where: { club_id: clubId, statut_abonnement: { [Op.ne]: 'aucun' } },
        attributes: ['statut_abonnement', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
        group: ['statut_abonnement'],
        raw: true,
      }),
      Contact.count({
        where: {
          club_id: clubId,
          statut_abonnement: { [Op.ne]: 'aucun' },
          date_debut_abonnement: { [Op.gte]: startOfMonth },
        },
      }),
      Contact.findAll({
        where: {
          club_id: clubId,
          statut_abonnement: { [Op.ne]: 'aucun' },
          type_adhesion: { [Op.ne]: null },
        },
        attributes: ['type_adhesion', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
        group: ['type_adhesion'],
        raw: true,
      }),
    ]);

    const counts = {
      actif: 0,
      a_renouveler: 0,
      expiré: 0,
      archive: 0,
      en_attente_paiement: 0,
      total: 0,
    };
    byStatus.forEach((row) => {
      counts[row.statut_abonnement] = Number(row.count);
      counts.total += Number(row.count);
    });

    res.json({
      ...counts,
      new_this_month: newThisMonth,
      by_type: byType.map((r) => ({ type: r.type_adhesion, count: Number(r.count) })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/membres
exports.getMembers = async (req, res) => {
  try {
    const clubId = Number(req.clubId);
    const { statut, type_adhesion, search, page = 1, limit = 25, sort = 'expiration' } = req.query;

    await syncMembershipStatuses(clubId);

    const where = { club_id: clubId, statut_abonnement: { [Op.ne]: 'aucun' } };

    if (statut && statut !== 'tous') where.statut_abonnement = statut;
    if (type_adhesion && type_adhesion !== 'tous') where.type_adhesion = type_adhesion;
    if (search) {
      where[Op.or] = [
        { prenom: { [Op.like]: `%${search}%` } },
        { nom: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { numero_licence: { [Op.like]: `%${search}%` } },
      ];
    }

    const orderMap = {
      expiration: [['date_expiration_abonnement', 'ASC']],
      nom: [
        ['nom', 'ASC'],
        ['prenom', 'ASC'],
      ],
      adhesion: [['date_debut_abonnement', 'DESC']],
    };
    const order = orderMap[sort] || orderMap.expiration;

    const offset = (Number(page) - 1) * Number(limit);
    const { count, rows } = await Contact.findAndCountAll({
      where,
      include: [{ model: Abonnement, as: 'abonnement', attributes: ['nom', 'prix'] }],
      order,
      limit: Number(limit),
      offset,
    });

    res.json({ total: count, items: rows, page: Number(page), limit: Number(limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/membres/:id
exports.updateMember = async (req, res) => {
  try {
    const clubId = Number(req.clubId);
    const allowed = [
      'type_adhesion',
      'numero_licence',
      'date_debut_abonnement',
      'date_expiration_abonnement',
      'statut_abonnement',
      'abonnement_id',
      'dernier_paiement_info',
    ];
    const data = {};
    allowed.forEach((k) => {
      if (req.body[k] !== undefined) data[k] = req.body[k];
    });

    if (data.statut_abonnement && !VALID_STATUTS.includes(data.statut_abonnement)) {
      return res.status(400).json({ message: 'Statut invalide' });
    }

    const contact = await Contact.findOne({ where: { id: req.params.id, club_id: clubId } });
    if (!contact) return res.status(404).json({ message: 'Contact introuvable' });

    await contact.update(data);
    res.json(contact);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/membres/bulk-action
exports.bulkAction = async (req, res) => {
  try {
    const clubId = Number(req.clubId);
    const { ids, action, statut } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'Aucun contact sélectionné' });
    }

    const safeIds = ids.map(Number).filter(Number.isInteger);

    if (action === 'changer_statut') {
      if (!VALID_STATUTS.includes(statut))
        return res.status(400).json({ message: 'Statut invalide' });
      await Contact.update(
        { statut_abonnement: statut },
        { where: { id: { [Op.in]: safeIds }, club_id: clubId } }
      );
      return res.json({ processed: safeIds.length });
    }

    res.status(400).json({ message: 'Action inconnue' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
