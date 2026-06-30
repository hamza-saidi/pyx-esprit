const templateRepository = require('../../repositories/templateRepository');

async function listTemplates({ clubId }) {
  return templateRepository.findAll({ clubId });
}

module.exports = listTemplates;
