const templateRepository = require('../../repositories/templateRepository');
const { TemplateSchema } = require('./templateSchema');

async function createTemplate(rawInput, { clubId }) {
  const data = TemplateSchema.parse(rawInput);
  return templateRepository.create(data, { clubId });
}

module.exports = createTemplate;
