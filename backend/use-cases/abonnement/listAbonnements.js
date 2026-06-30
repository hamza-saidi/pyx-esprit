const abonnementRepository = require('../../repositories/abonnementRepository');

async function listAbonnements({ clubId }) {
  return abonnementRepository.findAll({ clubId });
}

module.exports = listAbonnements;
