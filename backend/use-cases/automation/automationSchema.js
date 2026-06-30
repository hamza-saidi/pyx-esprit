const { z } = require('zod');

const CreateCustomAutomationSchema = z
  .object({
    nom: z.string().trim().min(1).max(255),
    config: z.record(z.any()),
  })
  .strict();

const UpdateAutomationSchema = z
  .object({
    nom: z.string().trim().min(1).max(255).optional(),
    config: z.record(z.any()).optional(),
    actif: z.coerce.boolean().optional(),
  })
  .strict();

const ToggleAutomationSchema = z.object({ actif: z.coerce.boolean() }).strict();

module.exports = { CreateCustomAutomationSchema, UpdateAutomationSchema, ToggleAutomationSchema };
