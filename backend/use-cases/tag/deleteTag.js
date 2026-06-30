const tagRepository = require('../../repositories/tagRepository');
const { NotFoundError } = require('../errors');

async function deleteTag(id, { clubId }) {
  const tag = await tagRepository.findById(id, { clubId });
  if (!tag) throw new NotFoundError('Tag non trouvé');
  await tagRepository.destroy(tag);
}

module.exports = deleteTag;
