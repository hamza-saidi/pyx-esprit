const tagRepository = require('../../repositories/tagRepository');
const { TagUpdateSchema } = require('./tagSchema');
const { NotFoundError } = require('../errors');

async function updateTag(id, rawInput, { clubId }) {
  const tag = await tagRepository.findById(id, { clubId });
  if (!tag) throw new NotFoundError('Tag non trouvé');

  const data = TagUpdateSchema.parse(rawInput);
  return tagRepository.update(tag, data);
}

module.exports = updateTag;
