const { Tag } = require('../models');

function requireClubId(clubId) {
  if (!clubId) throw new Error('tagRepository: clubId is required');
}

async function findAll({ clubId }) {
  requireClubId(clubId);
  return Tag.findAll();
}

async function findById(id, { clubId }) {
  requireClubId(clubId);
  return Tag.findOne({ where: { id, club_id: clubId } });
}

async function create(data, { clubId }) {
  requireClubId(clubId);
  return Tag.create({ ...data, club_id: clubId });
}

async function update(tag, data) {
  return tag.update(data);
}

async function destroy(tag) {
  return tag.destroy();
}

module.exports = { findAll, findById, create, update, destroy };
