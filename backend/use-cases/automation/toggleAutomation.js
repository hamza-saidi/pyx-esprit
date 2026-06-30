const automationRepository = require('../../repositories/automationRepository');
const { ToggleAutomationSchema } = require('./automationSchema');
const { NotFoundError } = require('../errors');

async function toggleAutomation(id, rawInput, { clubId }) {
  const automation = await automationRepository.findById(id, { clubId });
  if (!automation) throw new NotFoundError('Automation not found');

  const { actif } = ToggleAutomationSchema.parse(rawInput);
  return automationRepository.update(automation, { actif });
}

module.exports = toggleAutomation;
