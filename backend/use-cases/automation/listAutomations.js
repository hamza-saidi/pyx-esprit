const automationRepository = require('../../repositories/automationRepository');

async function listAutomations({ clubId }) {
  return automationRepository.findAll({ clubId });
}

module.exports = listAutomations;
