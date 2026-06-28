/*
  One-time maintenance script
  - Delete ALL existing tags and contact-tag links
  - Re-create tags from Category.nom and Distribution.nom (no word splitting)

  Usage:
    node backend/reset-tags-from-categories-distributions.js
*/

const { Tag, ContactTag, Category, Distribution } = require('./models');

async function main() {
  let deletedLinks = 0;
  let deletedTags = 0;
  let createdTags = 0;

  // 1) Wipe contact-tag associations first (FK safety)
  deletedLinks = await ContactTag.destroy({ where: {}, truncate: true });

  // 2) Wipe all tags
  deletedTags = await Tag.destroy({ where: {}, truncate: true });

  // 3) Build unique list of names from categories and distributions
  const [categories, distributions] = await Promise.all([
    Category.findAll({ attributes: ['nom'], order: [['id', 'ASC']] }),
    Distribution.findAll({ attributes: ['nom'], order: [['id', 'ASC']] }),
  ]);

  const namesSet = new Set();
  for (const c of categories) {
    const name = String(c.nom || '').trim();
    if (name) namesSet.add(name);
  }
  for (const d of distributions) {
    const name = String(d.nom || '').trim();
    if (name) namesSet.add(name);
  }

  // 4) Create tags exactly as-is
  for (const name of namesSet) {
    const safe = name.slice(0, 50); // respect Tag.nom length
    await Tag.create({ nom: safe });
    createdTags += 1;
  }

  console.log(
    `Done. contact_tag cleared: ${deletedLinks}, tags cleared: ${deletedTags}, new tags created: ${createdTags}`
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
