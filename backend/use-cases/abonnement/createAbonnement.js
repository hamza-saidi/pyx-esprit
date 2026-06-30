const abonnementRepository = require('../../repositories/abonnementRepository');
const { AbonnementSchema } = require('./abonnementSchema');

async function createAbonnement(rawInput, { clubId }) {
  const data = AbonnementSchema.parse(rawInput);
  return abonnementRepository.create(data, { clubId });
}

module.exports = createAbonnement;
