/**
 * utils/queryBuilder.js
 *
 * Centralized contact query builder from segment criteria.
 * Previously embedded in campagneController.js, imported circularly by emailService.js.
 * Now a standalone utility with no controller dependency.
 *
 * Architecture:
 *   emailService → queryBuilder ✅ (correct direction)
 *   campagneController → queryBuilder ✅ (correct direction)
 *   segmentController → queryBuilder ✅ (correct direction)
 */

const { Op } = require('sequelize');

/**
 * Builds a Sequelize where clause + include array from segment criteria JSON.
 *
 * @param {object|string} rawCriteres - Segment criteria (object or JSON string)
 * @returns {{ where: object, include: Array }}
 */
function buildContactQueryFromCriteria(rawCriteres) {
  let criteres = rawCriteres;

  if (typeof criteres === 'string') {
    try {
      criteres = JSON.parse(criteres);
    } catch {
      criteres = {};
    }
  }

  const where = { actif: true };
  const include = [];

  if (!criteres || typeof criteres !== 'object') return { where, include };

  // ── Gender normalization ─────────────────────────────────────────────────
  if (criteres.sexe) {
    const v = String(criteres.sexe).trim().toLowerCase();
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
    if (males.has(v)) where.sexe = { [Op.in]: ['Homme', 'H', 'M', 'Male', 'Masculin'] };
    else if (females.has(v))
      where.sexe = { [Op.in]: ['Femme', 'F', 'Female', 'Feminin', 'Féminin'] };
    else if (v === 'autre' || v === 'other') where.sexe = 'Autre';
    else where.sexe = criteres.sexe;
  }

  // ── Equality filters ─────────────────────────────────────────────────────
  const equalityKeys = [
    'type_client',
    'ville',
    'nationalite',
    'category_id',
    'distribution_id',
    'statut',
    'source',
  ];
  equalityKeys.forEach((key) => {
    const value = criteres[key];
    if (Array.isArray(value) && value.length > 0) {
      where[key] = { [Op.in]: value };
    } else if (value !== '' && value !== null && value !== undefined) {
      where[key] = typeof value === 'string' ? value.trim() : value;
    }
  });

  // ── Handicap range ──────────────────────────────────────────────────────
  if (criteres.handicap_min !== '' && criteres.handicap_min != null) {
    where.handicap = { ...(where.handicap || {}), [Op.gte]: Number(criteres.handicap_min) };
  }
  if (criteres.handicap_max !== '' && criteres.handicap_max != null) {
    where.handicap = { ...(where.handicap || {}), [Op.lte]: Number(criteres.handicap_max) };
  }

  // ── Tag filter ──────────────────────────────────────────────────────────
  if (Array.isArray(criteres.tag_ids) && criteres.tag_ids.length > 0) {
    // Lazy require to avoid loading models at module parse time (better for testing)
    const { Tag } = require('../models');
    include.push({
      model: Tag,
      as: 'tags',
      where: { id: criteres.tag_ids },
      through: { attributes: [] },
      required: true,
    });
  }

  return { where, include };
}

module.exports = { buildContactQueryFromCriteria };
