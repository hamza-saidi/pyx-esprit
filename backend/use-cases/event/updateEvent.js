const eventRepository = require('../../repositories/eventRepository');
const { EventUpdateSchema } = require('./eventSchema');
const validateEventData = require('./validateEventData');
const { NotFoundError, BadRequestError } = require('../errors');

async function updateEvent(id, rawInput, { clubId }) {
  const event = await eventRepository.findById(id, { clubId });
  if (!event) throw new NotFoundError('Événement non trouvé');

  if (['termine', 'annule'].includes(event.statut)) {
    throw new BadRequestError('Impossible de modifier un événement terminé ou annulé');
  }

  const updateData = EventUpdateSchema.parse(rawInput);

  if (updateData.titre || updateData.date || updateData.lieu) {
    const validationErrors = validateEventData({
      titre: updateData.titre || event.titre,
      date: updateData.date || event.date,
      lieu: updateData.lieu || event.lieu,
      index_requis: updateData.index_requis ?? event.index_requis,
      capacite_max: updateData.capacite_max ?? event.capacite_max,
    });
    if (validationErrors.length > 0) {
      throw new BadRequestError('Données invalides', { errors: validationErrors });
    }
  }

  if (updateData.date || updateData.lieu) {
    const nouvelleDate = updateData.date ? new Date(updateData.date) : event.date;
    const nouveauLieu = updateData.lieu || event.lieu;
    const conflit = await eventRepository.findConflict({
      lieu: nouveauLieu,
      date: nouvelleDate,
      excludeId: id,
    });
    if (conflit) {
      throw new BadRequestError("Conflit d'horaire détecté avec un autre événement au même lieu");
    }
  }

  await eventRepository.update(event, updateData);
  return eventRepository.findById(id, { clubId });
}

module.exports = updateEvent;
