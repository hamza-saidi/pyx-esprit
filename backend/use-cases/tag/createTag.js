const tagRepository = require('../../repositories/tagRepository');
const { TagSchema } = require('./tagSchema');

async function createTag(rawInput, { clubId }) {
  const data = TagSchema.parse(rawInput);
  return tagRepository.create(data, { clubId });
}

module.exports = createTag;
