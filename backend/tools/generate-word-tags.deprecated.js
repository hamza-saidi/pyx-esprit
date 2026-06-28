/*
  DEPRECATED: Word-splitting tag generator

  This script was intentionally deprecated to prevent splitting category or
  distribution names into multiple tags. Your platform now uses category and
  distribution names as-is for tags.

  If you need to backfill tags, use one of these instead:
    - node backend/reset-tags-from-categories-distributions.js
    - node backend/generate-auto-tags.js --batchSize=500
*/

console.error(
  '\n[DEPRECATED] backend/generate-word-tags.js is disabled. Use:\n' +
    '  - node backend/reset-tags-from-categories-distributions.js\n' +
    '  - node backend/generate-auto-tags.js --batchSize=500\n'
);
process.exit(1);
