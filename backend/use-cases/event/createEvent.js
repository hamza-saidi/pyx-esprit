const eventRepository = require('../../repositories/eventRepository');
const { EventSchema } = require('./eventSchema');
const validateEventData = require('./validateEventData');
const { BadRequestError } = require('../errors');

async function createEvent(rawInput, { clubId, userId }) {
  const data = EventSchema.parse(rawInput);

  const validationErrors = validateEventData(data);
  if (validationErrors.length > 0) {
    throw new BadRequestError('Données invalides', { errors: validationErrors });
  }

  const conflit = await eventRepository.findConflict({ lieu: data.lieu.trim(), date: data.date });
  if (conflit) {
    throw new BadRequestError("Conflit d'horaire détecté avec un autre événement au même lieu");
  }

  const { evenement_recurrent, ...eventFields } = data;

  const event = await eventRepository.create(
    {
      titre: eventFields.titre.trim(),
      date: eventFields.date,
      lieu: eventFields.lieu.trim(),
      description: eventFields.description?.trim(),
      index_requis: eventFields.index_requis ?? null,
      capacite_max: eventFields.capacite_max ?? null,
      type_evenement: eventFields.type_evenement || 'tournoi',
      prix: eventFields.prix || 0,
      tags_ids: eventFields.tags_ids || [],
      parametres: {
        ...eventFields.parametres,
        evenement_recurrent: evenement_recurrent || false,
        created_by: userId,
        created_at: new Date().toISOString(),
      },
      statut: 'planifié',
      actif: true,
    },
    { clubId }
  );

  if (evenement_recurrent && evenement_recurrent.frequence) {
    await createRecurringEvents(event, evenement_recurrent, { clubId });
  }

  return eventRepository.findById(event.id, { clubId });
}

async function createRecurringEvents(event, config, { clubId }) {
  const { frequence, nombre_occurrences, date_fin } = config;
  let currentDate = new Date(event.date);
  let count = 0;

  while (count < (nombre_occurrences || 12)) {
    if (date_fin && currentDate > new Date(date_fin)) break;

    switch (frequence) {
      case 'quotidien':
        currentDate.setDate(currentDate.getDate() + 1);
        break;
      case 'hebdomadaire':
        currentDate.setDate(currentDate.getDate() + 7);
        break;
      case 'mensuel':
        currentDate.setMonth(currentDate.getMonth() + 1);
        break;
      case 'annuel':
        currentDate.setFullYear(currentDate.getFullYear() + 1);
        break;
      default:
        return;
    }

    await eventRepository.create(
      {
        titre: `${event.titre} (${frequence})`,
        date: new Date(currentDate),
        lieu: event.lieu,
        description: event.description,
        index_requis: event.index_requis,
        capacite_max: event.capacite_max,
        type_evenement: event.type_evenement,
        prix: event.prix,
        tags_ids: event.tags_ids,
        parametres: {
          ...event.parametres,
          evenement_parent_id: event.id,
          occurrence_number: count + 1,
        },
        statut: 'planifié',
        actif: true,
      },
      { clubId }
    );

    count++;
  }
}

module.exports = createEvent;
