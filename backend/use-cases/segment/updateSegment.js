const segmentRepository = require('../../repositories/segmentRepository');
const { SegmentUpdateSchema } = require('./segmentSchema');
const { NotFoundError } = require('../errors');

async function updateSegment(id, rawInput, { clubId }) {
  const segment = await segmentRepository.findById(id, { clubId });
  if (!segment) throw new NotFoundError('Segment non trouvé');

  const data = SegmentUpdateSchema.parse(rawInput);
  return segmentRepository.update(segment, data);
}

module.exports = updateSegment;
