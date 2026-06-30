const { Segment, CampagneEmail } = require('../models');

function requireClubId(clubId) {
  if (!clubId) throw new Error('segmentRepository: clubId is required');
}

async function findAll({ clubId }) {
  requireClubId(clubId);
  return Segment.findAll();
}

async function findById(id, { clubId }) {
  requireClubId(clubId);
  return Segment.findOne({ where: { id, club_id: clubId } });
}

async function create(data, { clubId }) {
  requireClubId(clubId);
  return Segment.create({ ...data, club_id: clubId });
}

async function update(segment, data) {
  return segment.update(data);
}

async function destroy(segment) {
  return segment.destroy();
}

async function findBlockingCampaigns(segmentId) {
  return CampagneEmail.findAll({
    where: { segment_id: segmentId },
    attributes: ['id', 'titre', 'statut'],
  });
}

module.exports = { findAll, findById, create, update, destroy, findBlockingCampaigns };
