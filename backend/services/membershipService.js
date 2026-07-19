'use strict';

const { Contact } = require('../models');
const { Op } = require('sequelize');

/**
 * Met à jour automatiquement statut_abonnement en fonction de date_expiration_abonnement.
 *
 * Règles :
 *   actif           → a_renouveler  si expiration dans 0–30 jours
 *   actif/a_renouveler → expiré    si expiration < aujourd'hui
 *   a_renouveler    → actif         si expiration redevient > 30 jours (renouvellement manuel)
 */
async function syncMembershipStatuses(clubId) {
  const today = new Date();
  const in30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

  await Promise.all([
    Contact.update(
      { statut_abonnement: 'a_renouveler' },
      {
        where: {
          club_id: clubId,
          statut_abonnement: 'actif',
          date_expiration_abonnement: { [Op.between]: [today, in30Days] },
        },
      }
    ),
    Contact.update(
      { statut_abonnement: 'expiré' },
      {
        where: {
          club_id: clubId,
          statut_abonnement: { [Op.in]: ['actif', 'a_renouveler'] },
          date_expiration_abonnement: { [Op.lt]: today },
        },
      }
    ),
    Contact.update(
      { statut_abonnement: 'actif' },
      {
        where: {
          club_id: clubId,
          statut_abonnement: 'a_renouveler',
          date_expiration_abonnement: { [Op.gt]: in30Days },
        },
      }
    ),
  ]);
}

module.exports = { syncMembershipStatuses };
