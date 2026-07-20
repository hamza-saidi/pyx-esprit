const automationRepository = require('../../repositories/automationRepository');
const { NotFoundError } = require('../errors');

async function deleteAutomation(id, { clubId }) {
  const automation = await automationRepository.findById(id, { clubId });
  if (!automation) throw new NotFoundError('Automation not found');
  await automationRepository.destroy(automation);
}

module.exports = deleteAutomation;
