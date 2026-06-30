const segmentRepository = require('../../repositories/segmentRepository');
const { NotFoundError, ConflictError } = require('../errors');

async function deleteSegment(id, { clubId }) {
  const segment = await segmentRepository.findById(id, { clubId });
  if (!segment) throw new NotFoundError('Segment non trouvé');

  const blocking = await segmentRepository.findBlockingCampaigns(id);
  if (blocking.length > 0) {
    const err = new ConflictError(
      `Impossible de supprimer: segment utilisé par ${blocking.length} campagne(s). Supprimez ou détachez ces campagnes d'abord.`
    );
    err.details = { campaigns: blocking };
    throw err;
  }

  await segmentRepository.destroy(segment);
}

module.exports = deleteSegment;
