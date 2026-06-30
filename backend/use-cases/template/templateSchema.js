const { z } = require('zod');

const TemplateSchema = z
  .object({
    nom: z.string().trim().min(1).max(100),
    contenu_html: z.string().min(1),
    blocks_json: z.any().optional().nullable(),
    design_json: z.any().optional().nullable(),
  })
  .strict();

const TemplateUpdateSchema = TemplateSchema.partial();

module.exports = { TemplateSchema, TemplateUpdateSchema };
