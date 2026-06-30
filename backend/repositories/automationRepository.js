const { Automation } = require('../models');

function requireClubId(clubId) {
  if (!clubId) throw new Error('automationRepository: clubId is required');
}

async function findAll({ clubId }) {
  requireClubId(clubId);
  return Automation.findAll();
}

async function findById(id, { clubId }) {
  requireClubId(clubId);
  return Automation.findOne({ where: { id, club_id: clubId } });
}

async function create(data, { clubId }) {
  requireClubId(clubId);
  return Automation.create({ ...data, club_id: clubId });
}

async function update(automation, data) {
  return automation.update(data);
}

async function destroy(automation) {
  return automation.destroy();
}

module.exports = { findAll, findById, create, update, destroy };
