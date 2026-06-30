const { ModeleEmail } = require('../models');

function requireClubId(clubId) {
  if (!clubId) throw new Error('templateRepository: clubId is required');
}

async function findAll({ clubId }) {
  requireClubId(clubId);
  return ModeleEmail.findAll({ order: [['date_creation', 'DESC']] });
}

async function findById(id, { clubId }) {
  requireClubId(clubId);
  return ModeleEmail.findOne({ where: { id, club_id: clubId } });
}

async function create(data, { clubId }) {
  requireClubId(clubId);
  return ModeleEmail.create({ ...data, club_id: clubId });
}

async function update(template, data) {
  return template.update(data);
}

async function destroy(template) {
  return template.destroy();
}

module.exports = { findAll, findById, create, update, destroy };
