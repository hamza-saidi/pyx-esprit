/**
 * Fusionne plusieurs tags en un tag cible en utilisant directement la base de données.
 * Plus fiable que la version HTTP car ne nécessite pas que le serveur soit démarré.
 * 
 * Usage:
 *   node merge-tags-db.js
 * 
 * Pour appliquer réellement (pas juste dry-run):
 *   DRY_RUN=false node merge-tags-db.js
 * 
 * Pour supprimer les anciens tags après fusion:
 *   DRY_RUN=false DELETE_OLD_TAGS=true node merge-tags-db.js
 */

const { Tag, Contact, ContactTag } = require('./models');
const { sequelize } = require('./models');

// --- Configuration ---------------------------------------------------------
// Tags source -> tag cible
const SOURCE_TAG_NAMES = [
  'TO GOLF Belgique',
  'TO GOLF BELGE'
    
 
];
const TARGET_TAG_NAME = 'TO GOLF Belgique';

// Options
const DRY_RUN = (process.env.DRY_RUN || 'true').toLowerCase() === 'true';
const DELETE_OLD_TAGS = (process.env.DELETE_OLD_TAGS || 'false').toLowerCase() === 'true';

// ---------------------------------------------------------------------------
const normalize = (s) => (s || '').toString().trim().toLowerCase();

async function main() {
  console.log('='.repeat(60));
  console.log('FUSION DE TAGS');
  console.log('='.repeat(60));
  console.log(`Mode: ${DRY_RUN ? 'DRY-RUN (simulation)' : 'APPLICATION RÉELLE'}`);
  console.log(`Tags source: ${SOURCE_TAG_NAMES.join(', ')}`);
  console.log(`Tag cible: ${TARGET_TAG_NAME}`);
  console.log(`Supprimer anciens tags: ${DELETE_OLD_TAGS}`);
  console.log('='.repeat(60));
  console.log();

  try {
    // Test de connexion
    await sequelize.authenticate();
    console.log('✓ Connexion à la base de données réussie\n');

    // 1. Récupérer tous les tags
    const allTags = await Tag.findAll();
    console.log(`Total de tags dans la base: ${allTags.length}`);

    // 2. Trouver les tags source
    const sourceTags = allTags.filter((t) =>
      SOURCE_TAG_NAMES.map(normalize).includes(normalize(t.nom))
    );

    if (sourceTags.length === 0) {
      console.log('⚠ Aucun des tags source n\'existe dans la base de données.');
      console.log('Tags recherchés:', SOURCE_TAG_NAMES.join(', '));
      return;
    }

    console.log(`\nTags source trouvés (${sourceTags.length}):`);
    sourceTags.forEach(t => console.log(`  - ${t.nom} (ID: ${t.id})`));

    // 3. Trouver ou créer le tag cible
    let targetTag = allTags.find((t) => normalize(t.nom) === normalize(TARGET_TAG_NAME));
    
    if (!targetTag) {
      if (DRY_RUN) {
        console.log(`\n[DRY] Le tag "${TARGET_TAG_NAME}" sera créé`);
        targetTag = { id: '__dry__', nom: TARGET_TAG_NAME };
      } else {
        targetTag = await Tag.create({ nom: TARGET_TAG_NAME });
        console.log(`\n✓ Tag cible créé: ${targetTag.nom} (ID: ${targetTag.id})`);
      }
    } else {
      console.log(`\n✓ Tag cible existe déjà: ${targetTag.nom} (ID: ${targetTag.id})`);
    }

    const sourceIds = sourceTags.map((t) => t.id);
    const targetId = targetTag.id;

    // 4. Trouver tous les contacts qui ont au moins un des tags source
    const contactsWithSourceTags = await Contact.findAll({
      include: [{
        model: Tag,
        as: 'tags',
        where: { id: sourceIds },
        through: { attributes: [] },
        required: true
      }]
    });

    console.log(`\nContacts concernés: ${contactsWithSourceTags.length}`);

    if (contactsWithSourceTags.length === 0) {
      console.log('Aucun contact n\'a les tags source. Rien à faire.');
      return;
    }

    // 5. Pour chaque contact: ajouter le tag cible et retirer les tags source
    let addedCount = 0;
    let removedCount = 0;

    for (const contact of contactsWithSourceTags) {
      // Recharger le contact avec ses tags
      await contact.reload({
        include: [{ model: Tag, as: 'tags', through: { attributes: [] } }]
      });

      const contactTagIds = contact.tags.map(t => t.id);

      // Ajouter le tag cible s'il n'est pas déjà présent
      if (!contactTagIds.includes(targetId)) {
        if (DRY_RUN) {
          console.log(`[DRY] + Ajouter tag "${TARGET_TAG_NAME}" au contact ${contact.id} (${contact.prenom} ${contact.nom})`);
        } else {
          await contact.addTag(targetTag);
          console.log(`✓ Tag "${TARGET_TAG_NAME}" ajouté au contact ${contact.id}`);
        }
        addedCount++;
      }

      // Retirer les tags source (sauf si c'est le tag cible lui-même)
      for (const sourceTag of sourceTags) {
        if (sourceTag.id === targetId) continue; // Ne pas retirer si c'est le tag cible
        if (contactTagIds.includes(sourceTag.id)) {
          if (DRY_RUN) {
            console.log(`[DRY] - Retirer tag "${sourceTag.nom}" du contact ${contact.id}`);
          } else {
            await contact.removeTag(sourceTag);
            console.log(`✓ Tag "${sourceTag.nom}" retiré du contact ${contact.id}`);
          }
          removedCount++;
        }
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log('RÉSUMÉ:');
    console.log(`${'='.repeat(60)}`);
    console.log(`Tags source: ${sourceTags.length}`);
    console.log(`Tag cible: ${targetTag.nom}`);
    console.log(`Contacts traités: ${contactsWithSourceTags.length}`);
    console.log(`Tags ajoutés: ${addedCount}`);
    console.log(`Tags retirés: ${removedCount}`);

    // 6. Optionnel: supprimer les anciens tags
    if (DELETE_OLD_TAGS && !DRY_RUN) {
      console.log(`\n${'='.repeat(60)}`);
      console.log('SUPPRESSION DES ANCIENS TAGS');
      console.log(`${'='.repeat(60)}`);
      
      for (const sourceTag of sourceTags) {
        if (sourceTag.id === targetId) {
          console.log(`⚠ Le tag "${sourceTag.nom}" est le tag cible, pas de suppression`);
          continue;
        }

        // Vérifier s'il reste des contacts avec ce tag
        const remainingContacts = await Contact.count({
          include: [{
            model: Tag,
            as: 'tags',
            where: { id: sourceTag.id },
            through: { attributes: [] },
            required: true
          }]
        });

        if (remainingContacts > 0) {
          console.log(`⚠ Le tag "${sourceTag.nom}" est encore utilisé par ${remainingContacts} contact(s), pas de suppression`);
        } else {
          try {
            await Tag.destroy({ where: { id: sourceTag.id } });
            console.log(`✓ Tag "${sourceTag.nom}" supprimé`);
          } catch (e) {
            console.error(`✗ Erreur lors de la suppression du tag "${sourceTag.nom}":`, e.message);
          }
        }
      }
    } else if (DELETE_OLD_TAGS && DRY_RUN) {
      console.log(`\n[DRY] Les anciens tags seraient supprimés si DRY_RUN=false`);
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(DRY_RUN ? '✓ SIMULATION TERMINÉE (aucune modification réelle)' : '✓ FUSION TERMINÉE');
    console.log(`${'='.repeat(60)}\n`);

  } catch (error) {
    console.error('\n✗ ERREUR:', error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Exécuter
main();






