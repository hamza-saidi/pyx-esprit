const { Segment, Contact, Tag, CampagneEmail } = require('../models');
const logger = require('../utils/logger');
const { Op } = require('sequelize');
const createSegment = require('../use-cases/segment/createSegment');
const updateSegment = require('../use-cases/segment/updateSegment');
const getSegment = require('../use-cases/segment/getSegment');
const deleteSegment = require('../use-cases/segment/deleteSegment');

// Construit la requête Sequelize (where, include) à partir des critères
// Construit la requête Sequelize (where, include) à partir des critères
function buildContactQueryFromCriteria(rawCriteres, helpers = {}) {
  const { sequelize } = require('../models');
  const normalizeGender = (value) => {
    if (value === undefined || value === null) return null;
    const v = String(value).trim().toLowerCase();
    const males = new Set([
      'h',
      'homme',
      'male',
      'm',
      'masculin',
      'man',
      'men',
      'garçon',
      'garcon',
      'monsieur',
    ]);
    const females = new Set([
      'f',
      'femme',
      'female',
      'feminin',
      'féminin',
      'feminine',
      'woman',
      'women',
      'w',
      'lady',
      'girl',
      'madame',
      'mme',
      'femmes',
    ]);
    if (males.has(v)) return { __normalized: 'Homme' };
    if (females.has(v)) return { __normalized: 'Femme' };
    return null;
  };

  let criteres = rawCriteres;
  // Robustly handle stringified or double-stringified JSON
  while (typeof criteres === 'string' && criteres.trim() !== '') {
    try {
      const parsed = JSON.parse(criteres);
      if (parsed === null || typeof parsed !== 'object') break;
      criteres = parsed;
    } catch {
      break;
    }
  }

  const whereConditions = [];
  const include = [];

  if (!criteres || typeof criteres !== 'object') {
    return { where: {}, include };
  }

  // 1. Advanced filterRules (the new systematic way)
  if (criteres.filterRules && Array.isArray(criteres.filterRules)) {
    const ruleConditions = [];
    for (const rule of criteres.filterRules) {
      const { field, operator, value } = rule;
      if (!field || !operator) continue;
      let cond = null;

      if (field === 'tags') {
        const rawIds = Array.isArray(value) ? value : String(value).split(',');
        // SECURITY: every id must be a validated positive integer before being
        // interpolated into the literal subquery below - otherwise an attacker
        // could inject arbitrary SQL via a segment's stored filterRules.value.
        const ids = rawIds.map(Number).filter((n) => Number.isInteger(n) && n > 0);
        if (ids.length > 0) {
          const subquery = `(SELECT ct.contact_id FROM contact_tag ct WHERE ct.tag_id IN (${ids.join(',')}))`;
          cond = {
            id: { [operator === 'excludes' ? Op.notIn : Op.in]: sequelize.literal(subquery) },
          };
        }
      } else if (field === 'actif') {
        const b = value === 'true' || value === true;
        cond = { actif: operator === 'is' ? b : !b };
      } else if (field === 'sexe') {
        const norm = normalizeGender(value);
        const val = norm ? norm.__normalized : value;
        if (val === 'Homme') {
          cond = {
            sexe: {
              [operator === 'is_not' ? Op.notIn : Op.in]: ['Homme', 'H', 'M', 'Male', 'Masculin'],
            },
          };
        } else if (val === 'Femme') {
          cond = {
            sexe: {
              [operator === 'is_not' ? Op.notIn : Op.in]: [
                'Femme',
                'F',
                'Female',
                'Feminin',
                'Féminin',
              ],
            },
          };
        } else {
          cond = { sexe: { [operator === 'is_not' ? Op.not : Op.eq]: val } };
        }
      } else {
        const op = operator === 'contains' ? Op.like : operator === 'is_not' ? Op.not : Op.eq;
        const val = operator === 'contains' ? `%${value}%` : value;
        cond = { [field]: { [op]: val } };
      }
      if (cond) ruleConditions.push(cond);
    }

    if (ruleConditions.length > 0) {
      const matchOp = criteres.filterMatch === 'any' ? Op.or : Op.and;
      whereConditions.push({ [matchOp]: ruleConditions });
    }
  }

  // 2. Legacy/Direct criteria (backwards compatibility)
  const legacyWhere = {};

  // Normalisations
  if (criteres.sexe && !criteres.filterRules) {
    const norm = normalizeGender(criteres.sexe);
    if (norm) criteres.sexe = norm;
  }
  if (typeof criteres.actif === 'string') {
    const v = criteres.actif.toLowerCase();
    if (['oui', 'true', '1'].includes(v)) criteres.actif = true;
    if (['non', 'false', '0'].includes(v)) criteres.actif = false;
  }

  const equalityKeys = [
    'type_client',
    'ville',
    'sexe',
    'nationalite',
    'actif',
    'category_id',
    'distribution_id',
  ];
  equalityKeys.forEach((key) => {
    // Skip if already handled by filterRules to avoid double filtering
    if (criteres.filterRules && criteres.filterRules.some((r) => r.field === key)) return;

    const value = criteres[key];
    if (Array.isArray(value)) {
      if (value.length > 0) legacyWhere[key] = { [Op.in]: value };
      return;
    }
    if (value && typeof value === 'object' && value.__normalized) {
      const normalized = value.__normalized;
      if (normalized === 'Homme')
        legacyWhere[key] = { [Op.in]: ['Homme', 'H', 'M', 'Male', 'Masculin'] };
      else if (normalized === 'Femme')
        legacyWhere[key] = { [Op.in]: ['Femme', 'F', 'Female', 'Feminin', 'Féminin'] };
      else legacyWhere[key] = normalized;
      return;
    }
    if (value !== '' && value !== null && value !== undefined) {
      legacyWhere[key] = typeof value === 'string' ? value.trim() : value;
    }
  });

  if (criteres.search) {
    const s = String(criteres.search).trim();
    if (s) {
      whereConditions.push({
        [Op.or]: [
          { nom: { [Op.like]: `%${s}%` } },
          { prenom: { [Op.like]: `%${s}%` } },
          { email: { [Op.like]: `%${s}%` } },
          { ville: { [Op.like]: `%${s}%` } },
          { home_club: { [Op.like]: `%${s}%` } },
        ],
      });
    }
  }

  if (
    criteres.handicap_min !== '' &&
    criteres.handicap_min !== undefined &&
    criteres.handicap_min !== null
  ) {
    legacyWhere.handicap = {
      ...(legacyWhere.handicap || {}),
      [Op.gte]: Number(criteres.handicap_min),
    };
  }
  if (
    criteres.handicap_max !== '' &&
    criteres.handicap_max !== undefined &&
    criteres.handicap_max !== null
  ) {
    legacyWhere.handicap = {
      ...(legacyWhere.handicap || {}),
      [Op.lte]: Number(criteres.handicap_max),
    };
  }

  if (Object.keys(legacyWhere).length > 0) {
    whereConditions.push(legacyWhere);
  }

  // 3. Tags (legacy/direct) - Only if not in filterRules
  if (!criteres.filterRules || !criteres.filterRules.some((r) => r.field === 'tags')) {
    if (Array.isArray(criteres.tag_ids) && criteres.tag_ids.length > 0) {
      const ids = criteres.tag_ids.map(Number).filter((n) => Number.isInteger(n) && n > 0);
      if (ids.length > 0) {
        whereConditions.push({
          id: {
            [Op.in]: sequelize.literal(
              `(SELECT contact_id FROM contact_tag WHERE tag_id IN (${ids.join(',')}))`
            ),
          },
        });
      }
    }
  }

  const where = whereConditions.length > 0 ? { [Op.and]: whereConditions } : {};
  return { where, include };
}

// CRUD
exports.create = async (req, res, next) => {
  try {
    const segment = await createSegment(req.body, { clubId: req.clubId });
    res.status(201).json(segment);
  } catch (err) {
    next(err);
  }
};

exports.getAll = async (req, res) => {
  try {
    const segments = await Segment.findAll();

    // Calculer le nombre de clients pour chaque segment (incluant tags, catégories, distributions, handicap)
    const segmentsWithCount = await Promise.all(
      segments.map(async (segment) => {
        const { where, include } = buildContactQueryFromCriteria(segment.criteres);
        let count = 0;
        try {
          count = await Contact.count({ where, include, distinct: true });
        } catch (countError) {
          logger.error('Erreur lors du comptage pour', segment.nom, ':', countError.message);
          count = 0;
        }

        return { ...segment.toJSON(), nb_clients: count };
      })
    );

    res.json(segmentsWithCount);
  } catch (err) {
    logger.error('Erreur dans getAll segments:', err);
    res.status(500).json({ message: err.message });
  }
};

exports.getOne = async (req, res, next) => {
  try {
    const segment = await getSegment(req.params.id, { clubId: req.clubId });
    res.json(segment);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const segment = await updateSegment(req.params.id, req.body, { clubId: req.clubId });
    res.json(segment);
  } catch (err) {
    next(err);
  }
};

exports.delete = async (req, res, next) => {
  try {
    await deleteSegment(req.params.id, { clubId: req.clubId });
    res.json({ message: 'Segment supprimé' });
  } catch (err) {
    next(err);
  }
};

// Détacher des campagnes d'un segment (mettre segment_id à null)
exports.detachCampaigns = async (req, res) => {
  try {
    const { id } = req.params;
    const { campaignIds } = req.body || {};
    if (!Array.isArray(campaignIds) || campaignIds.length === 0) {
      return res.status(400).json({ message: 'campaignIds requis' });
    }
    const updated = await CampagneEmail.update(
      { segment_id: null },
      { where: { id: campaignIds, segment_id: id } }
    );
    res.json({ updated: updated?.[0] || 0 });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
// Lister les contacts correspondant aux critères du segment
exports.getContacts = async (req, res) => {
  try {
    const segment = await Segment.findByPk(req.params.id);
    if (!segment) return res.status(404).json({ message: 'Segment non trouvé' });

    const { where, include } = buildContactQueryFromCriteria(segment.criteres);
    const contacts = await Contact.findAll({ where, include, distinct: true });
    res.json(contacts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Calculer un nombre de contacts à la volée depuis des critères (prévisualisation)
exports.previewCount = async (req, res) => {
  try {
    const { criteres } = req.body || {};
    const { where, include } = buildContactQueryFromCriteria(criteres);
    const count = await Contact.count({ where, include, distinct: true });
    res.json({ count });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.buildContactQueryFromCriteria = buildContactQueryFromCriteria;
