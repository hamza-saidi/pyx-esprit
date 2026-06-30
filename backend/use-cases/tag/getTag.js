const tagRepository = require('../../repositories/tagRepository');
const { NotFoundError } = require('../errors');

async function getTag(id, { clubId }) {
  const tag = await tagRepository.findById(id, { clubId });
  if (!tag) throw new NotFoundError('Tag non trouvé');
  return tag;
}

module.exports = getTag;
