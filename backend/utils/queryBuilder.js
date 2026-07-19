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

const { Op, literal } = require('sequelize');
const { getTenantContext } = require('./tenantContext');

// Fail-secure like models/hooks/tenantScopeHooks.js: raw SQL against
// envoi_email bypasses Sequelize's automatic tenant-scoping hooks (those only
// apply to model-level queries), so any subquery reaching into that table
// must resolve and inject club_id itself.
function resolveClubIdForRawQuery() {
  const ctx = getTenantContext();
  if (!ctx) {
    throw new Error(
      'TENANT_CONTEXT_MISSING: buildContactQueryFromCriteria used behavioral criteria ' +
        'with no tenant context. Wrap this code path in tenantContext.runWithTenant({ clubId, isSystem }, fn).'
    );
  }
  if (ctx.isSystem) return null; // explicit, deliberate bypass
  if (ctx.clubId === undefined || ctx.clubId === null) {
    throw new Error('TENANT_CONTEXT_MISSING: no clubId in tenant context for behavioral criteria.');
  }
  return ctx.clubId;
}

const ENGAGEMENT_FILTERS = {
  opened: { column: 'date_ouverture', negate: false },
  not_opened: { column: 'date_ouverture', negate: true },
  clicked: { column: 'date_clic', negate: false },
  not_clicked: { column: 'date_clic', negate: true },
};

/**
 * Behavioral criteria (email engagement) — existence check against
 * envoi_email.date_ouverture/date_clic. "not_*" also matches contacts who
 * were never sent an email at all. Returns null if `engagement` isn't a
 * recognized value.
 * @param {string} engagement - one of ENGAGEMENT_FILTERS' keys
 * @returns {{ [Op.in]: object } | { [Op.notIn]: object } | null}
 */
function buildEngagementCondition(engagement) {
  if (!engagement || !ENGAGEMENT_FILTERS[engagement]) return null;
  const { column, negate } = ENGAGEMENT_FILTERS[engagement];
  const clubId = resolveClubIdForRawQuery();
  const clubClause = clubId != null ? ` AND club_id = ${Number(clubId)}` : '';
  const subquery = `(SELECT DISTINCT contact_id FROM envoi_email WHERE ${column} IS NOT NULL${clubClause})`;
  return { [negate ? Op.notIn : Op.in]: literal(subquery) };
}

/**
 * Subscription status at J-N — same delay logic as automationService's
 * membership_expiring reminder: positive = N days before expiry, negative =
 * N days after expiry, matched against that exact day.
 * @param {number|string} joursAvantExpiration
 * @returns {{ statut_abonnement: string, date_expiration_abonnement: object }}
 */
function buildAbonnementJoursCondition(joursAvantExpiration) {
  const daysBefore = parseInt(joursAvantExpiration, 10) || 0;
  const isPostExpiry = daysBefore < 0;
  const daysOffset = Math.abs(daysBefore);

  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + (isPostExpiry ? -daysOffset : daysOffset));
  const targetDayStr = targetDate.toISOString().slice(0, 10);

  return {
    statut_abonnement: isPostExpiry ? 'expiré' : 'actif',
    date_expiration_abonnement: {
      [Op.gte]: new Date(targetDayStr + ' 00:00:00'),
      [Op.lte]: new Date(targetDayStr + ' 23:59:59'),
    },
  };
}

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

  // ── Behavioral criteria (email engagement) ───────────────────────────────
  const engagementCondition = buildEngagementCondition(criteres.engagement);
  if (engagementCondition) {
    where.id = { ...(where.id || {}), ...engagementCondition };
  }

  // ── Subscription status at J-N ────────────────────────────────────────────
  if (
    criteres.abonnement_jours_avant_expiration !== '' &&
    criteres.abonnement_jours_avant_expiration != null
  ) {
    Object.assign(where, buildAbonnementJoursCondition(criteres.abonnement_jours_avant_expiration));
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

module.exports = {
  buildContactQueryFromCriteria,
  buildEngagementCondition,
  buildAbonnementJoursCondition,
};
