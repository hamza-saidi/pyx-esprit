const segmentRepository = require('../../repositories/segmentRepository');
const { NotFoundError } = require('../errors');

async function getSegment(id, { clubId }) {
  const segment = await segmentRepository.findById(id, { clubId });
  if (!segment) throw new NotFoundError('Segment non trouvé');
  return segment;
}

module.exports = getSegment;
