const automationRepository = require('../../repositories/automationRepository');
const { CreateCustomAutomationSchema } = require('./automationSchema');

async function createCustomAutomation(rawInput, { clubId }) {
  const { nom, config } = CreateCustomAutomationSchema.parse(rawInput);
  return automationRepository.create({ nom, type: 'custom', actif: true, config }, { clubId });
}

module.exports = createCustomAutomation;
