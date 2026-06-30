const automationRepository = require('../../repositories/automationRepository');
const { UpdateAutomationSchema } = require('./automationSchema');
const { NotFoundError } = require('../errors');

async function updateAutomation(id, rawInput, { clubId }) {
  const automation = await automationRepository.findById(id, { clubId });
  if (!automation) throw new NotFoundError('Automation not found');

  const data = UpdateAutomationSchema.parse(rawInput);
  return automationRepository.update(automation, data);
}

module.exports = updateAutomation;
