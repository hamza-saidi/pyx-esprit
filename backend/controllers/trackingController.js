const { EnvoiEmail, StatistiqueCampagne, sequelize } = require('../models');
const { Op } = require('sequelize');

// Tracking des ouvertures d'emails
exports.trackOpen = async (req, res) => {
  const { token } = req.params;
  try {
    // Trouver l'envoi correspondant
    const envoi = await EnvoiEmail.findOne({
      where: { token_tracking: token },
    });

    if (!envoi) {
      console.warn(`[TRACKING] Open attempt for non-existent token: ${token}`);
      return res.status(404).send('Email non trouvé');
    }

    // Mettre à jour les statistiques d'ouverture
    const now = new Date();
    const currentOpens = envoi.nombre_ouvertures || 0;

    const updates = {
      statut: 'ouvert',
      date_ouverture: now,
      nombre_ouvertures: currentOpens + 1,
    };

    await envoi.update(updates);

    // Mettre à jour les statistiques de la campagne (non bloquant)
    mettreAJourStatistiquesCampagne(envoi.campagne_id).catch((err) => {
      console.error('[TRACKING] Error updating global campaign stats after open:', err);
    });

    // Retourner un pixel transparent 1x1
    const pixel = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      'base64'
    );

    res.set({
      'Content-Type': 'image/png',
      'Content-Length': pixel.length,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    });

    return res.send(pixel);
  } catch (error) {
    console.error(`[TRACKING] Error tracking open for token ${token}:`, error);
    // On retourne quand même un pixel vide pour ne pas casser l'affichage de l'email
    const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    res.set('Content-Type', 'image/gif');
    return res.send(pixel);
  }
};

// Tracking des clics sur les liens
exports.trackClick = async (req, res) => {
  const { token } = req.params;
  const { url } = req.query;

  try {
    if (!url) {
      console.warn(`[TRACKING] Click attempt without URL for token: ${token}`);
      return res.status(400).send('URL manquante');
    }

    // Trouver l'envoi correspondant
    const envoi = await EnvoiEmail.findOne({
      where: { token_tracking: token },
    });

    if (!envoi) {
      console.warn(`[TRACKING] Token not found: ${token}`);
      return res.status(404).send('Email non trouvé');
    }

    console.log(
      `[TRACKING] Click detected for campaign ${envoi.campagne_id}, contact ${envoi.contact_id}, URL: ${url}`
    );

    // Mettre à jour les statistiques de clic
    const now = new Date();

    // S'assurer que nombre_clics n'est pas NULL
    const currentClicks = envoi.nombre_clics || 0;

    const updates = {
      statut: 'cliqué',
      date_clic: now,
      nombre_clics: currentClicks + 1,
    };

    // Ajouter le lien cliqué à la liste (gestion robuste du JSON)
    let liensCliques = [];
    try {
      if (envoi.liens_cliques) {
        liensCliques =
          typeof envoi.liens_cliques === 'string'
            ? JSON.parse(envoi.liens_cliques)
            : Array.from(envoi.liens_cliques);
      }
    } catch (e) {
      console.error('[TRACKING] Error parsing liens_cliques:', e);
      liensCliques = [];
    }

    if (!liensCliques.includes(url)) {
      liensCliques.push(url);
      updates.liens_cliques = liensCliques;
    }

    await envoi.update(updates);

    // Mettre à jour les statistiques globales de la campagne (non bloquant pour le redirect)
    mettreAJourStatistiquesCampagne(envoi.campagne_id).catch((err) => {
      console.error('[TRACKING] Error updating global campaign stats:', err);
    });

    // Rediriger vers l'URL originale
    return res.redirect(url);
  } catch (error) {
    console.error(`[TRACKING] CRITICAL ERROR for token ${token}:`, error);
    // En cas d'erreur, on essaie quand même de rediriger l'utilisateur vers l'URL s'il y en a une
    if (url) {
      return res.redirect(url);
    }
    return res.status(500).send('Erreur serveur');
  }
};

// Fonction utilitaire pour mettre à jour les statistiques de campagne
async function mettreAJourStatistiquesCampagne(campagneId) {
  try {
    // Compter les envois par statut
    const stats = await EnvoiEmail.findAll({
      where: { campagne_id: campagneId },
      attributes: ['statut', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      group: ['statut'],
    });

    // Compter les ouvertures et clics séparément
    const ouverts = await EnvoiEmail.count({
      where: {
        campagne_id: campagneId,
        date_ouverture: { [Op.not]: null },
      },
    });

    const clics = await EnvoiEmail.count({
      where: {
        campagne_id: campagneId,
        date_clic: { [Op.not]: null },
      },
    });

    // Calculer les totaux
    let totalEnvoyes = 0;
    let totalErreurs = 0;

    stats.forEach((stat) => {
      const count = parseInt(stat.dataValues.count);

      if (
        stat.statut === 'envoyé' ||
        stat.statut === 'livré' ||
        stat.statut === 'ouvert' ||
        stat.statut === 'cliqué'
      ) {
        totalEnvoyes += count;
      }
      if (stat.statut === 'erreur') {
        totalErreurs += count;
      }
    });

    // Mettre à jour les statistiques
    await StatistiqueCampagne.update(
      {
        nb_envoyes: totalEnvoyes,
        nb_ouverts: ouverts,
        nb_clics: clics,
        nb_erreurs: totalErreurs,
      },
      {
        where: { campagne_id: campagneId },
      }
    );

    console.log(
      `Statistiques mises à jour pour campagne ${campagneId}: ${totalEnvoyes} envoyés, ${ouverts} ouverts, ${clics} clics`
    );
  } catch (error) {
    console.error('Erreur lors de la mise à jour des statistiques de campagne:', error);
  }
}
