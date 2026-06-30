const automationRepository = require('../../repositories/automationRepository');
const { NotFoundError, ForbiddenError } = require('../errors');

async function deleteAutomation(id, { clubId }) {
  const automation = await automationRepository.findById(id, { clubId });
  if (!automation) throw new NotFoundError('Automation not found');
  if (automation.type !== 'custom') {
    throw new ForbiddenError('Cannot delete system automations');
  }
  await automationRepository.destroy(automation);
}

module.exports = deleteAutomation;
