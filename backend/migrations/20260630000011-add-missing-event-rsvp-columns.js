'use strict';

// eventController.js has always read/written these columns, but neither the
// Sequelize models nor any prior migration ever declared them - every query
// in the events feature (getAll's `where: { actif: true }`, create's
// conflict check, etc.) was throwing "Unknown column" against the real
// schema. Found by tracing the model against the controller; confirmed
// against the live dev database (`DESCRIBE evenement` / `DESCRIBE rsvp`).
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const evenementInfo = await queryInterface.describeTable('evenement');
    const evenementColumns = {
      capacite_max: { type: Sequelize.INTEGER, allowNull: true },
      type_evenement: { type: Sequelize.STRING(50), allowNull: true, defaultValue: 'tournoi' },
      prix: { type: Sequelize.DECIMAL(10, 2), allowNull: true, defaultValue: 0 },
      tags_ids: { type: Sequelize.JSON, allowNull: true },
      parametres: { type: Sequelize.JSON, allowNull: true },
      statut: {
        type: Sequelize.ENUM('planifié', 'en_cours', 'annule', 'termine'),
        allowNull: true,
        defaultValue: 'planifié',
      },
      actif: { type: Sequelize.BOOLEAN, allowNull: true, defaultValue: true },
    };
    for (const [name, definition] of Object.entries(evenementColumns)) {
      if (!evenementInfo[name]) {
        await queryInterface.addColumn('evenement', name, definition);
        console.log(`Migration UP: Added "evenement.${name}".`);
      }
    }
    await queryInterface.addIndex('evenement', ['actif']).catch(() => {});
    await queryInterface.addIndex('evenement', ['statut']).catch(() => {});

    const rsvpInfo = await queryInterface.describeTable('rsvp');
    const rsvpColumns = {
      message_personnalise: { type: Sequelize.TEXT, allowNull: true },
      date_invitation: { type: Sequelize.DATE, allowNull: true },
      commentaire: { type: Sequelize.TEXT, allowNull: true },
      date_confirmation: { type: Sequelize.DATE, allowNull: true },
    };
    for (const [name, definition] of Object.entries(rsvpColumns)) {
      if (!rsvpInfo[name]) {
        await queryInterface.addColumn('rsvp', name, definition);
        console.log(`Migration UP: Added "rsvp.${name}".`);
      }
    }

    // 'annule' is a valid RSVP status (used by updateRsvp/cancelEvent) but
    // missing from the original ENUM.
    if (rsvpInfo.statut && !rsvpInfo.statut.type.includes('annule')) {
      await queryInterface.changeColumn('rsvp', 'statut', {
        type: Sequelize.ENUM('invité', 'confirmé', 'absent', 'annule'),
        defaultValue: 'invité',
      });
      console.log('Migration UP: Extended rsvp.statut ENUM with "annule".');
    }
  },

  down: async (queryInterface) => {
    const evenementColumns = [
      'capacite_max',
      'type_evenement',
      'prix',
      'tags_ids',
      'parametres',
      'statut',
      'actif',
    ];
    for (const name of evenementColumns) {
      try {
        await queryInterface.removeColumn('evenement', name);
      } catch (err) {
        console.error(`Migration DOWN Error removing evenement.${name}:`, err.message);
      }
    }
    const rsvpColumns = [
      'message_personnalise',
      'date_invitation',
      'commentaire',
      'date_confirmation',
    ];
    for (const name of rsvpColumns) {
      try {
        await queryInterface.removeColumn('rsvp', name);
      } catch (err) {
        console.error(`Migration DOWN Error removing rsvp.${name}:`, err.message);
      }
    }
  },
};
