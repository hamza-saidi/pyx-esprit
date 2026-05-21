/**
 * One-time helper script to create or refresh predefined segments
 * based on tag name patterns (Agences, Tour Operators, etc.).
 *
 * Usage:
 *   cd backend
 *   node create-tag-based-segments.js
 */

const { sequelize, Tag, Segment } = require('./models');

const SEGMENT_DEFINITIONS = [
  {
    name: 'Agences',
    matchers: [/agence/i, /agences/i],
  },
  {
    name: 'TO (Tour Operators)',
    matchers: [/^to[\s_\-]/i, / tour ?op/i, /tour-?opérateur/i, /tour-?operator/i],
  },
  {
    name: 'Tour Leaders',
    matchers: [/tour\s*leader/i, /\bTL\b/i],
  },
  {
    name: 'Journalistes',
    matchers: [/journalist/i, /journaliste/i, /press/i],
  },
  {
    name: 'Golfeurs',
    matchers: [/golf/i, /golfeur/i, /golfeuse/i],
  },
  {
    name: 'Abonnés',
    matchers: [/abonn/i, /subscriber/i],
  },
];

const normalize = (value = '') =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const matchesDefinition = (tagName, definition) => {
  const normalized = normalize(tagName);
  return definition.matchers.some((regex) => regex.test(tagName) || regex.test(normalized));
};

(async () => {
  try {
    console.log('Loading tags…');
    const tags = await Tag.findAll({ attributes: ['id', 'nom'] });
    if (!tags.length) {
      console.log('No tags found. Aborting.');
      return;
    }

    for (const definition of SEGMENT_DEFINITIONS) {
      const matchedTagIds = tags
        .filter((tag) => matchesDefinition(tag.nom || '', definition))
        .map((tag) => tag.id);

      if (!matchedTagIds.length) {
        console.log(`Skipping "${definition.name}" – no tags matched.`);
        continue;
      }

      const payload = {
        tag_ids: Array.from(new Set(matchedTagIds)),
      };

      const existing = await Segment.findOne({ where: { nom: definition.name } });
      if (existing) {
        await existing.update({ criteres: payload });
        console.log(`Updated segment "${definition.name}" with ${payload.tag_ids.length} tag(s).`);
      } else {
        await Segment.create({ nom: definition.name, criteres: payload });
        console.log(`Created segment "${definition.name}" with ${payload.tag_ids.length} tag(s).`);
      }
    }

    console.log('Done.');
  } catch (error) {
    console.error('Failed to create tag-based segments:', error);
  } finally {
    await sequelize.close();
  }
})();










