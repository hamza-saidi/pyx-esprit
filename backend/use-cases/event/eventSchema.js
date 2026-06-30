const { z } = require('zod');

const EventSchema = z
  .object({
    titre: z.string(),
    date: z.coerce.date(),
    lieu: z.string(),
    description: z.string().optional().nullable(),
    index_requis: z.coerce.number().optional().nullable(),
    capacite_max: z.coerce.number().int().optional().nullable(),
    type_evenement: z.string().max(50).optional(),
    prix: z.coerce.number().min(0).optional(),
    tags_ids: z.array(z.coerce.number()).optional(),
    parametres: z.record(z.any()).optional(),
    evenement_recurrent: z
      .object({
        frequence: z.enum(['quotidien', 'hebdomadaire', 'mensuel', 'annuel']),
        nombre_occurrences: z.coerce.number().int().positive().optional(),
        date_fin: z.coerce.date().optional(),
      })
      .optional(),
  })
  .strict();

// Update allows a partial payload, same shape otherwise (no club_id/id/statut
// override - statut transitions go through cancelEvent, not a raw PATCH).
const EventUpdateSchema = EventSchema.partial();

module.exports = { EventSchema, EventUpdateSchema };
