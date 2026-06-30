/**
 * models/hooks/tenantScopeHooks.js
 *
 * Fail-secure safety net for multi-tenancy: every model listed in
 * TENANT_SCOPED_MODELS gets club_id automatically injected into its
 * find/count/update/destroy/create operations from the current
 * AsyncLocalStorage tenant context (see utils/tenantContext.js).
 *
 * This exists in addition to, not instead of, explicit `club_id` filtering in
 * repositories/controllers: the explicit filter documents intent, this hook
 * guarantees that any call site that forgets it (or any old code path not
 * yet migrated) still cannot leak data across clubs.
 */

const { Op } = require('sequelize');
const { getTenantContext } = require('../../utils/tenantContext');

// Tables with no legitimate "all clubs" reading in normal app code.
const TENANT_SCOPED_MODELS = [
  'Utilisateur',
  'Contact',
  'Tag',
  'Segment',
  'CampagneEmail',
  'Evenement',
  'Abonnement',
  'ModeleEmail',
  'Automation',
  'Category',
  'Distribution',
  'StatistiqueCampagne',
  'EnvoiEmail',
  'Rsvp',
  'Note',
  'ContactTag',
];

function resolveClubId(modelName) {
  const ctx = getTenantContext();
  if (!ctx) {
    throw new Error(
      `TENANT_CONTEXT_MISSING: query on "${modelName}" executed with no tenant context. ` +
        'Wrap this code path in tenantContext.runWithTenant({ clubId, isSystem }, fn).'
    );
  }
  if (ctx.isSystem) return null; // explicit, deliberate bypass - see utils/tenantContext.js
  if (ctx.clubId === undefined || ctx.clubId === null) {
    throw new Error(`TENANT_CONTEXT_MISSING: no clubId in tenant context for "${modelName}".`);
  }
  return ctx.clubId;
}

// Mutates options.where in place where possible so internal Sequelize logic
// that captured a reference to it beforehand (e.g. findOrCreate) still sees
// the injected filter.
//
// `where.constructor === Object` is the key check: a plain `{actif: true}`
// filter is safe to mutate directly, but `sequelize.literal(...)` is also
// `typeof === 'object'` while NOT being a plain object - setting a
// `.club_id` property on a Literal instance is a silent no-op (it has no
// effect on the raw SQL string it wraps), which would make the tenant
// filter look applied while actually doing nothing. Those must go through
// the Op.and wrapping branch instead, same as arrays.
function applyClubFilter(options, clubId) {
  const where = options.where;
  if (!where) {
    options.where = { club_id: clubId };
  } else if (where.constructor === Object && !where[Op.and] && !where[Op.or]) {
    where.club_id = clubId;
  } else {
    options.where = { [Op.and]: [where, { club_id: clubId }] };
  }
}

function stampClubId(instance, clubId, modelName) {
  if (instance.club_id === undefined || instance.club_id === null) {
    if (clubId === null) {
      throw new Error(
        `club_id explicite requis pour créer un(e) ${modelName} en contexte système (isSystem).`
      );
    }
    instance.club_id = clubId;
  }
}

function applyTenantHooks(db) {
  TENANT_SCOPED_MODELS.forEach((modelName) => {
    const Model = db[modelName];
    if (!Model) return;

    Model.addHook('beforeFind', (options) => {
      const clubId = resolveClubId(modelName);
      if (clubId === null) return;
      applyClubFilter(options, clubId);
    });

    Model.addHook('beforeCount', (options) => {
      const clubId = resolveClubId(modelName);
      if (clubId === null) return;
      applyClubFilter(options, clubId);
    });

    Model.addHook('beforeBulkUpdate', (options) => {
      const clubId = resolveClubId(modelName);
      if (clubId === null) return;
      applyClubFilter(options, clubId);
    });

    Model.addHook('beforeBulkDestroy', (options) => {
      const clubId = resolveClubId(modelName);
      if (clubId === null) return;
      applyClubFilter(options, clubId);
    });

    Model.addHook('beforeCreate', (instance) => {
      const clubId = resolveClubId(modelName);
      stampClubId(instance, clubId, modelName);
    });

    Model.addHook('beforeBulkCreate', (instances) => {
      const clubId = resolveClubId(modelName);
      instances.forEach((instance) => stampClubId(instance, clubId, modelName));
    });
  });
}

module.exports = { applyTenantHooks, TENANT_SCOPED_MODELS };
