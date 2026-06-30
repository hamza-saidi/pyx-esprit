const segmentRepository = require('../../repositories/segmentRepository');
const { SegmentSchema } = require('./segmentSchema');

async function createSegment(rawInput, { clubId }) {
  const data = SegmentSchema.parse(rawInput);
  return segmentRepository.create(data, { clubId });
}

module.exports = createSegment;
