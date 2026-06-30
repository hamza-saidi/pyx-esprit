const templateRepository = require('../../repositories/templateRepository');
const { TemplateUpdateSchema } = require('./templateSchema');
const { NotFoundError } = require('../errors');

async function updateTemplate(id, rawInput, { clubId }) {
  const template = await templateRepository.findById(id, { clubId });
  if (!template) throw new NotFoundError('Modèle non trouvé');

  const data = TemplateUpdateSchema.parse(rawInput);
  return templateRepository.update(template, data);
}

module.exports = updateTemplate;
