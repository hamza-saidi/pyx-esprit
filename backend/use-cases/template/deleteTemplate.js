const templateRepository = require('../../repositories/templateRepository');
const { NotFoundError } = require('../errors');

async function deleteTemplate(id, { clubId }) {
  const template = await templateRepository.findById(id, { clubId });
  if (!template) throw new NotFoundError('Modèle non trouvé');
  await templateRepository.destroy(template);
}

module.exports = deleteTemplate;
