/**
 * repositories/abonnementRepository.js
 *
 * clubId is required on every method - this is the readable, auditable half
 * of tenant isolation (the Sequelize hooks in models/hooks/tenantScopeHooks.js
 * are the fail-secure safety net underneath it, see that file for why both
 * layers exist).
 */
const { Abonnement, Contact } = require('../models');

function requireClubId(clubId) {
  if (!clubId) throw new Error('abonnementRepository: clubId is required');
}

async function findAll({ clubId }) {
  requireClubId(clubId);
  return Abonnement.findAll({ order: [['nom', 'ASC']] });
}

async function findById(id, { clubId }) {
  requireClubId(clubId);
  return Abonnement.findOne({ where: { id, club_id: clubId } });
}

async function create(data, { clubId }) {
  requireClubId(clubId);
  return Abonnement.create({ ...data, club_id: clubId });
}

async function update(abonnement, data) {
  return abonnement.update(data);
}

async function destroy(abonnement) {
  return abonnement.destroy();
}

async function countContactsUsing(abonnementId, { clubId }) {
  requireClubId(clubId);
  return Contact.count({ where: { abonnement_id: abonnementId } });
}

module.exports = { findAll, findById, create, update, destroy, countContactsUsing };
