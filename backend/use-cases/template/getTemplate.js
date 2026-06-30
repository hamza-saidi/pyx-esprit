const templateRepository = require('../../repositories/templateRepository');
const { NotFoundError } = require('../errors');

async function getTemplate(id, { clubId }) {
  const template = await templateRepository.findById(id, { clubId });
  if (!template) throw new NotFoundError('Modèle non trouvé');
  return template;
}

module.exports = getTemplate;
