const tagRepository = require('../../repositories/tagRepository');

async function listTags({ clubId }) {
  return tagRepository.findAll({ clubId });
}

module.exports = listTags;
