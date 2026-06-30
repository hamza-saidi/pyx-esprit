const { z } = require('zod');

const TagSchema = z
  .object({
    nom: z.string().trim().min(1).max(50),
  })
  .strict();

const TagUpdateSchema = TagSchema.partial();

module.exports = { TagSchema, TagUpdateSchema };
