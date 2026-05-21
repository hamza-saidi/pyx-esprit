/*
  One-time script to generate tags for all existing contacts
  based on their Category and Distribution names.

  Usage:
    node generate-auto-tags.js [--batchSize=500]
*/

const { Contact, Category, Distribution, Tag } = require('./models');

async function ensureTagsForContact(contact) {
  await contact.reload({
    include: [
      { model: Category, as: 'category' },
      { model: Distribution, as: 'distribution' },
      { model: Tag, as: 'tags', through: { attributes: [] } }
    ]
  });
  const desiredTagNames = [];
  if (contact.category && contact.category.nom) desiredTagNames.push(String(contact.category.nom).trim());
  if (contact.distribution && contact.distribution.nom) desiredTagNames.push(String(contact.distribution.nom).trim());
  if (!desiredTagNames.length) return false;
  const existingTagNames = new Set((contact.tags || []).map(t => t.nom));
  let changed = false;
  for (const tagName of desiredTagNames) {
    if (!tagName || existingTagNames.has(tagName)) continue;
    const [tag] = await Tag.findOrCreate({ where: { nom: tagName }, defaults: { nom: tagName } });
    await contact.addTag(tag);
    changed = true;
  }
  return changed;
}

async function main() {
  const arg = process.argv.find(a => a.startsWith('--batchSize='));
  const batchSize = Math.min(arg ? Number(arg.split('=')[1]) || 500 : 500, 2000);
  let page = 0;
  let processed = 0;
  let updated = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const contacts = await Contact.findAll({
      include: [
        { model: Category, as: 'category' },
        { model: Distribution, as: 'distribution' },
        { model: Tag, as: 'tags', through: { attributes: [] } }
      ],
      limit: batchSize,
      offset: page * batchSize,
      order: [['id','ASC']]
    });
    if (!contacts.length) break;
    for (const contact of contacts) {
      const changed = await ensureTagsForContact(contact);
      if (changed) updated += 1;
      processed += 1;
      if (processed % 500 === 0) {
        console.log(`Progress: processed=${processed}, updated=${updated}`);
      }
    }
    page += 1;
  }
  console.log(`Done. Processed: ${processed}, Contacts updated: ${updated}`);
}

main().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});



