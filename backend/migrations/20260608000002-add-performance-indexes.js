'use strict';

module.exports = {
  up: async (queryInterface) => {
    const safeAddIndex = async (table, columns, options) => {
      try {
        await queryInterface.addIndex(table, columns, options);
        console.log(`Migration UP: Added index ${options.name} on table ${table}.`);
      } catch (err) {
        // Index might already exist
      }
    };

    // Add performance indexes on contact
    await safeAddIndex('contact', ['email'], { name: 'idx_contact_email' });
    await safeAddIndex('contact', ['sexe'], { name: 'idx_contact_sexe' });
    await safeAddIndex('contact', ['handicap'], { name: 'idx_contact_handicap' });
    await safeAddIndex('contact', ['ville'], { name: 'idx_contact_ville' });
    await safeAddIndex('contact', ['type_client'], { name: 'idx_contact_type_client' });
    await safeAddIndex('contact', ['statut'], { name: 'idx_contact_statut' });
    await safeAddIndex('contact', ['actif'], { name: 'idx_contact_actif' });

    // Add tag junction index
    await safeAddIndex('contact_tag', ['tag_id'], { name: 'idx_contact_tag_tag' });

    // Add campaign indexes
    await safeAddIndex('campagne_email', ['statut'], { name: 'idx_campagne_statut' });
    await safeAddIndex('campagne_email', ['date_programmation'], {
      name: 'idx_campagne_date_prog',
    });
    await safeAddIndex('campagne_email', ['actif'], { name: 'idx_campagne_actif' });

    // Add individual email send indexes
    await safeAddIndex('envoi_email', ['campagne_id'], { name: 'idx_envoi_campagne' });
    await safeAddIndex('envoi_email', ['contact_id'], { name: 'idx_envoi_contact' });
    await safeAddIndex('envoi_email', ['statut'], { name: 'idx_envoi_statut' });
    await safeAddIndex('envoi_email', ['date_envoi'], { name: 'idx_envoi_date_envoi' });
  },

  down: async (queryInterface) => {
    const safeRemoveIndex = async (table, name) => {
      try {
        await queryInterface.removeIndex(table, name);
        console.log(`Migration DOWN: Removed index ${name} from table ${table}.`);
      } catch (err) {
        // Index might not exist
      }
    };

    await safeRemoveIndex('contact', 'idx_contact_email');
    await safeRemoveIndex('contact', 'idx_contact_sexe');
    await safeRemoveIndex('contact', 'idx_contact_handicap');
    await safeRemoveIndex('contact', 'idx_contact_ville');
    await safeRemoveIndex('contact', 'idx_contact_type_client');
    await safeRemoveIndex('contact', 'idx_contact_statut');
    await safeRemoveIndex('contact', 'idx_contact_actif');
    await safeRemoveIndex('contact_tag', 'idx_contact_tag_tag');
    await safeRemoveIndex('campagne_email', 'idx_campagne_statut');
    await safeRemoveIndex('campagne_email', 'idx_campagne_date_prog');
    await safeRemoveIndex('campagne_email', 'idx_campagne_actif');
    await safeRemoveIndex('envoi_email', 'idx_envoi_campagne');
    await safeRemoveIndex('envoi_email', 'idx_envoi_contact');
    await safeRemoveIndex('envoi_email', 'idx_envoi_statut');
    await safeRemoveIndex('envoi_email', 'idx_envoi_date_envoi');
  },
};
