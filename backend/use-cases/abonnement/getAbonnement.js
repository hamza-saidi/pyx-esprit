const abonnementRepository = require('../../repositories/abonnementRepository');
const { NotFoundError } = require('../errors');

async function getAbonnement(id, { clubId }) {
  const abonnement = await abonnementRepository.findById(id, { clubId });
  if (!abonnement) throw new NotFoundError('Abonnement non trouvé');
  return abonnement;
}

module.exports = getAbonnement;
