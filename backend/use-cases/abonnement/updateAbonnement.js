const abonnementRepository = require('../../repositories/abonnementRepository');
const { AbonnementUpdateSchema } = require('./abonnementSchema');
const { NotFoundError } = require('../errors');

async function updateAbonnement(id, rawInput, { clubId }) {
  const abonnement = await abonnementRepository.findById(id, { clubId });
  if (!abonnement) throw new NotFoundError('Abonnement non trouvé');

  const data = AbonnementUpdateSchema.parse(rawInput);
  return abonnementRepository.update(abonnement, data);
}

module.exports = updateAbonnement;
