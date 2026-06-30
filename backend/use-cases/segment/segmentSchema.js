const { z } = require('zod');

// criteres is a flexible filter-rule tree (see buildContactQueryFromCriteria
// in segmentController.js) - validated as a plain object here, not a fixed
// shape; the SQL-injection-prone fields inside it (tag ids) are validated
// where they're actually interpolated, not at this layer.
const SegmentSchema = z
  .object({
    nom: z.string().trim().min(1).max(100),
    criteres: z.record(z.any()),
  })
  .strict();

const SegmentUpdateSchema = SegmentSchema.partial();

module.exports = { SegmentSchema, SegmentUpdateSchema };
