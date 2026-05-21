/*
  Maintenance script: Normalize and deduplicate tags

  - Normalizes tag names to fix accent composition and spacing issues
    (uses Unicode NFC, trims and collapses inner spaces)
  - Merges duplicate tags that end up with the same normalized key
    by re-linking all contact_tag rows to the surviving tag, then deletes duplicates

  Usage:
    node backend/normalize-and-dedupe-tags.js
*/

const { sequelize, Tag, ContactTag } = require('./models');

function normalizeName(name) {
  if (!name) return '';
  const raw = String(name);
  // Normalize to NFC to fix decomposed accents, trim and collapse spaces
  const nfc = raw.normalize('NFC');
  const trimmed = nfc.trim().replace(/\s+/g, ' ');
  return trimmed;
}

function canonicalKey(name) {
  // Case-insensitive key on normalized name
  return normalizeName(name).toLocaleLowerCase();
}

async function main() {
  const t = await sequelize.transaction();
  try {
    const tags = await Tag.findAll({ order: [['id','ASC']], transaction: t, lock: t.LOCK.UPDATE });

    const keyToPrimary = new Map(); // canonical -> primary Tag instance
    const duplicates = []; // { duplicate: Tag, primary: Tag }
    let renamed = 0;

    for (const tag of tags) {
      const normalized = normalizeName(tag.nom);
      const key = canonicalKey(tag.nom);

      // 1) Rename tag to normalized value (if changed)
      if (normalized !== tag.nom) {
        tag.nom = normalized.slice(0, 50); // respect schema limit
        await tag.save({ transaction: t });
        renamed += 1;
      }

      // Recompute canonical key after potential rename
      const newKey = canonicalKey(tag.nom);
      const primary = keyToPrimary.get(newKey);
      if (!primary) {
        keyToPrimary.set(newKey, tag);
      } else if (primary.id !== tag.id) {
        duplicates.push({ duplicate: tag, primary });
      }
    }

    // 2) Merge duplicates: re-link contact_tag to primary, then delete duplicate tags
    let reassociatedLinks = 0;
    let deletedTags = 0;
    for (const { duplicate, primary } of duplicates) {
      // Move links
      // Delete any duplicate link rows that would violate PK(contact_id, tag_id)
      await sequelize.query(
        'DELETE ct FROM contact_tag ct JOIN contact_tag ct2 ON ct.contact_id = ct2.contact_id AND ct.tag_id = ? AND ct2.tag_id = ?',
        { replacements: [duplicate.id, primary.id], transaction: t }
      ).catch(() => {});

      const [result] = await sequelize.query(
        'UPDATE contact_tag SET tag_id = ? WHERE tag_id = ?',
        { replacements: [primary.id, duplicate.id], transaction: t }
      );
      // result.affectedRows for mysql2; fallback to 0
      reassociatedLinks += Number(result?.affectedRows || 0);

      // Delete the duplicate tag
      await ContactTag.destroy({ where: { tag_id: duplicate.id }, transaction: t });
      await Tag.destroy({ where: { id: duplicate.id }, transaction: t });
      deletedTags += 1;
    }

    await t.commit();
    console.log(`Done. Renamed tags: ${renamed}, Duplicates merged: ${deletedTags}, Links reassociated: ${reassociatedLinks}`);
  } catch (err) {
    await t.rollback();
    console.error('Error normalizing/deduplicating tags:', err);
    process.exit(1);
  }
}

main().then(() => process.exit(0));


