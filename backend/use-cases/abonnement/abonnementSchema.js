const { z } = require('zod');

// .strict() rejects any field not listed here (id, club_id, date_creation
// included) - this is the structural fix for mass assignment, the pick()
// whitelist used elsewhere in Milestone 1 was a stopgap for controllers not
// yet migrated to this pattern.
const AbonnementSchema = z
  .object({
    nom: z.string().trim().min(1).max(100),
    prix: z.coerce.number().min(0).default(0),
    duree_mois: z.coerce.number().int().min(1).default(12),
    description: z.string().max(2000).optional().nullable(),
    actif: z.coerce.boolean().default(true),
  })
  .strict();

const AbonnementUpdateSchema = AbonnementSchema.partial();

module.exports = { AbonnementSchema, AbonnementUpdateSchema };
