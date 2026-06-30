const abonnementRepository = require('../../repositories/abonnementRepository');
const { NotFoundError, ConflictError } = require('../errors');

async function deleteAbonnement(id, { clubId }) {
  const abonnement = await abonnementRepository.findById(id, { clubId });
  if (!abonnement) throw new NotFoundError('Abonnement non trouvé');

  const count = await abonnementRepository.countContactsUsing(id, { clubId });
  if (count > 0) {
    throw new ConflictError(
      `Impossible de supprimer : ${count} contacts utilisent cet abonnement.`
    );
  }

  await abonnementRepository.destroy(abonnement);
}

module.exports = deleteAbonnement;
