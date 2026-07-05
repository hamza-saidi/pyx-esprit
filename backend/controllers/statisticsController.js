const {
  StatistiqueCampagne,
  CampagneEmail,
  Contact,
  Segment,
  Tag,
  Evenement,
  Rsvp,
  EnvoiEmail,
  sequelize,
} = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

// Récupérer les statistiques d'une campagne spécifique
exports.getByCampaign = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const {
      periode = '30j',
      page = 1,
      limit = 20,
      search = '',
      status = 'all', // all, openers, clickers, non_openers, errors
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const limitInt = parseInt(limit);

    const stats = await StatistiqueCampagne.findOne({
      where: { campagne_id: campaignId },
    });

    if (!stats) {
      return res.status(404).json({ message: 'Statistiques non trouvées' });
    }

    // Récupérer les données détaillées de la campagne
    const campagne = await CampagneEmail.findByPk(campaignId);
    if (!campagne) {
      return res.status(404).json({ message: 'Campagne non trouvée' });
    }

    // Construction de la clause where pour les envois
    const whereEnvoi = { campagne_id: campaignId };

    // Filtre par statut
    if (status === 'openers') {
      whereEnvoi.date_ouverture = { [Op.not]: null };
    } else if (status === 'clickers') {
      whereEnvoi.date_clic = { [Op.not]: null };
    } else if (status === 'non_openers') {
      whereEnvoi.date_ouverture = null;
      whereEnvoi.statut = { [Op.notIn]: ['erreur', 'bounce', 'spam'] };
    } else if (status === 'errors') {
      whereEnvoi.statut = { [Op.in]: ['erreur', 'bounce', 'spam'] };
    }

    // Si recherche par email ou nom
    let includeContact = {
      model: Contact,
      as: 'contact',
      attributes: ['id', 'prenom', 'nom', 'email'],
    };

    if (search) {
      const searchLower = search.toLowerCase();
      whereEnvoi[Op.or] = [
        { email_destinataire: { [Op.like]: `%${search}%` } },
        { '$contact.prenom$': { [Op.like]: `%${search}%` } },
        { '$contact.nom$': { [Op.like]: `%${search}%` } },
      ];
    }

    logger.debug(
      `[DEBUG] getByCampaign request: status="${status}", search="${search}", page=${page}`
    );

    // Récupérer le nombre total de manière robuste
    const totalCount = await EnvoiEmail.count({ where: { campagne_id: campaignId } });

    // Récupérer les détails des envois pour la page actuelle
    const { rows: envois } = await EnvoiEmail.findAndCountAll({
      where: whereEnvoi,
      attributes: [
        'id',
        'contact_id',
        'email_destinataire',
        'statut',
        'date_envoi',
        'date_ouverture',
        'date_clic',
        'nombre_ouvertures',
        'nombre_clics',
      ],
      include: [
        {
          model: Contact,
          as: 'contact',
          attributes: ['id', 'prenom', 'nom', 'email'],
          required: false, // Force LEFT JOIN
        },
      ],
      limit: limitInt,
      offset: offset,
      order: [['date_envoi', 'DESC']],
      distinct: true,
      subQuery: false, // Évite les bugs de pagination Sequelize avec les includes
    });

    logger.debug(
      `[DEBUG] Campagne ${campaignId}: ${totalCount} envois totaux, ${envois.length} sur cette page (status: ${status})`
    );

    // Pour la timeline, on a besoin de TOUS les envois (ou au moins les agrégés)
    // Comme c'est lourd, on fait une requête d'agrégation séparée
    const timelineData = await EnvoiEmail.findAll({
      where: { campagne_id: campaignId },
      attributes: [
        [sequelize.fn('DATE', sequelize.col('date_envoi')), 'date'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'envoyes'],
        [
          sequelize.fn(
            'SUM',
            sequelize.literal('CASE WHEN date_ouverture IS NOT NULL THEN 1 ELSE 0 END')
          ),
          'ouverts',
        ],
        [
          sequelize.fn(
            'SUM',
            sequelize.literal('CASE WHEN date_clic IS NOT NULL THEN 1 ELSE 0 END')
          ),
          'clics',
        ],
      ],
      group: [sequelize.fn('DATE', sequelize.col('date_envoi'))],
      order: [[sequelize.fn('DATE', sequelize.col('date_envoi')), 'ASC']],
      raw: true,
    });

    const contactActivity = envois.map((envoi) => {
      const fullName = [envoi.contact?.prenom, envoi.contact?.nom].filter(Boolean).join(' ').trim();
      return {
        id: envoi.id,
        contact_id: envoi.contact_id,
        email: envoi.email_destinataire,
        nom: fullName || envoi.contact?.email || envoi.email_destinataire,
        statut: envoi.statut,
        date_envoi: envoi.date_envoi,
        date_ouverture: envoi.date_ouverture,
        date_clic: envoi.date_clic,
        nombre_ouvertures: envoi.nombre_ouvertures,
        nombre_clics: envoi.nombre_clics,
      };
    });

    // Top contacts (toujours basé sur tous les contacts, donc une autre requête ou agrégation)
    const topContactsRaw = await EnvoiEmail.findAll({
      where: { campagne_id: campaignId },
      attributes: [
        'contact_id',
        'email_destinataire',
        [sequelize.literal('nombre_ouvertures + nombre_clics'), 'engagement'],
      ],
      include: [{ model: Contact, as: 'contact', attributes: ['prenom', 'nom', 'email'] }],
      order: [[sequelize.literal('engagement'), 'DESC']],
      limit: 10,
    });

    const topContacts = topContactsRaw.map((tc) => {
      const fullName = [tc.contact?.prenom, tc.contact?.nom].filter(Boolean).join(' ').trim();
      return {
        id: tc.contact_id,
        nom: fullName || tc.contact?.email || tc.email_destinataire,
        email: tc.email_destinataire,
        nombre_ouvertures: tc.dataValues.engagement, // Approximation
      };
    });

    // Récupérer les nombres totaux par statut de manière explicite pour les onglets
    const [openersCount, clickersCount, errorsCount] = await Promise.all([
      EnvoiEmail.count({ where: { campagne_id: campaignId, date_ouverture: { [Op.not]: null } } }),
      EnvoiEmail.count({ where: { campagne_id: campaignId, date_clic: { [Op.not]: null } } }),
      EnvoiEmail.count({
        where: { campagne_id: campaignId, statut: { [Op.in]: ['erreur', 'bounce', 'spam'] } },
      }),
    ]);

    const nonOpenersCount = totalCount - openersCount - errorsCount;

    const statsEnTempsReel = {
      total: totalCount,
      ouverts: openersCount,
      clics: clickersCount,
      erreurs: errorsCount,
      taux_ouverture: totalCount > 0 ? ((openersCount / totalCount) * 100).toFixed(2) : 0,
      taux_clic: totalCount > 0 ? ((clickersCount / totalCount) * 100).toFixed(2) : 0,
    };

    res.json({
      campagne: {
        id: campagne.id,
        titre: campagne.titre,
        type: campagne.type_campagne,
        statut: campagne.statut,
        date_creation: campagne.date_creation,
        date_envoi: campagne.date_envoi,
      },
      statistiques: stats,
      stats_en_temps_reel: statsEnTempsReel,
      pagination: {
        total: totalCount,
        page: parseInt(page),
        limit: limitInt,
        totalPages: Math.ceil(totalCount / limitInt),
        counts: {
          all: totalCount,
          openers: openersCount,
          clickers: clickersCount,
          non_openers: Math.max(0, nonOpenersCount),
          errors: errorsCount,
        },
      },
      envois: contactActivity, // Pour compatibilité ascendante
      timeline: timelineData,
      top_contacts: topContacts,
      contact_activity: contactActivity,
      total_activity_count: totalCount,
    });
  } catch (err) {
    logger.error('Erreur getByCampaign:', err);
    res.status(500).json({
      message: 'Erreur lors de la récupération des statistiques',
      error: err.message,
    });
  }
};

// Tableau de bord principal avec toutes les statistiques
exports.getDashboard = async (req, res) => {
  try {
    const { periode = '30j' } = req.query;

    // Calculer la période
    const maintenant = new Date();
    let dateDebut;

    switch (periode) {
      case '7j':
        dateDebut = new Date(maintenant.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30j':
        dateDebut = new Date(maintenant.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90j':
        dateDebut = new Date(maintenant.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1an':
        dateDebut = new Date(maintenant.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        dateDebut = new Date(maintenant.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Statistiques globales des campagnes
    const statsCampagnes = await CampagneEmail.findAll({
      where: {
        date_creation: { [Op.gte]: dateDebut },
        actif: true,
      },
      attributes: [
        'statut',
        'type_campagne',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('nb_envoyes')), 'total_envoyes'],
        [sequelize.fn('SUM', sequelize.col('nb_erreurs')), 'total_erreurs'],
      ],
      group: ['statut', 'type_campagne'],
    });

    // Statistiques des envois
    const statsEnvois = await EnvoiEmail.findAll({
      where: {
        date_envoi: { [Op.gte]: dateDebut },
      },
      attributes: [
        'statut',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [
          sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('campagne_id'))),
          'campagnes_uniques',
        ],
      ],
      group: ['statut'],
    });

    // Statistiques des contacts
    const statsContacts = await Contact.findAll({
      where: {
        date_creation: { [Op.gte]: dateDebut },
        actif: true,
      },
      attributes: ['type_client', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      group: ['type_client'],
    });

    // Statistiques des événements
    const statsEvenements = await Evenement.findAll({
      where: {
        date: { [Op.gte]: dateDebut },
      },
      attributes: [[sequelize.fn('COUNT', sequelize.col('id')), 'total_evenements']],
    });

    // Statistiques des RSVP (pas de filtre par date car pas de createdAt)
    const statsRsvp = await Rsvp.findAll({
      attributes: ['statut', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      group: ['statut'],
    });

    // Calculer les métriques de performance
    const totalCampagnes = statsCampagnes.reduce(
      (sum, stat) => sum + parseInt(stat.dataValues.count),
      0
    );
    const totalEnvois = statsEnvois.reduce((sum, stat) => sum + parseInt(stat.dataValues.count), 0);
    const totalContacts = statsContacts.reduce(
      (sum, stat) => sum + parseInt(stat.dataValues.count),
      0
    );
    const totalEvenements =
      statsEvenements.length > 0 ? parseInt(statsEvenements[0].dataValues.total_evenements) : 0;

    // Calculer les taux de conversion
    const envoisEnvoyes = statsEnvois.find((s) => s.statut === 'envoyé')?.dataValues?.count || 0;
    const envoisOuverts = statsEnvois.find((s) => s.statut === 'ouvert')?.dataValues?.count || 0;
    const envoisClics = statsEnvois.find((s) => s.statut === 'clic')?.dataValues?.count || 0;

    const tauxOuverture =
      envoisEnvoyes > 0 ? ((envoisOuverts / envoisEnvoyes) * 100).toFixed(2) : 0;
    const tauxClic = envoisEnvoyes > 0 ? ((envoisClics / envoisEnvoyes) * 100).toFixed(2) : 0;

    // Métriques globales de l'Audience
    const audience_total = await Contact.count();
    const audience_actif = await Contact.count({ where: { actif: true } });

    // Growth sur 30 jours
    const thirtyDaysAgoGrowth = new Date(maintenant.getTime() - 30 * 24 * 60 * 60 * 1000);
    const growthDataRaw = await Contact.findAll({
      where: { date_creation: { [Op.gte]: thirtyDaysAgoGrowth } },
      attributes: [
        [sequelize.fn('DATE', sequelize.col('date_creation')), 'date'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      ],
      group: [sequelize.fn('DATE', sequelize.col('date_creation'))],
      order: [[sequelize.fn('DATE', sequelize.col('date_creation')), 'ASC']],
      raw: true,
    });

    const growthMap = new Map();
    for (let i = 30; i >= 0; i--) {
      const d = new Date(maintenant.getTime() - i * 24 * 60 * 60 * 1000);
      growthMap.set(d.toISOString().split('T')[0], 0);
    }
    growthDataRaw.forEach((row) => {
      const dStr = row.date;
      const dateStr =
        dStr instanceof Date
          ? dStr.toISOString().split('T')[0]
          : typeof dStr === 'string' && dStr.length >= 10
            ? dStr.substring(0, 10)
            : dStr;
      if (growthMap.has(dateStr)) {
        growthMap.set(dateStr, parseInt(row.count));
      }
    });
    const audience_growth = Array.from(growthMap.entries()).map(([date, count]) => ({
      date: date.substring(5), // MM-DD
      'Nouveaux contacts': count,
    }));

    // Top Tags globaux
    const topTagsRaw = await Tag.findAll({
      include: [
        {
          model: Contact,
          as: 'contacts',
          attributes: [],
          through: { attributes: [] },
        },
      ],
      attributes: ['nom', [sequelize.fn('COUNT', sequelize.col('contacts.id')), 'contactCount']],
      group: ['Tag.id', 'Tag.nom'],
      order: [[sequelize.fn('COUNT', sequelize.col('contacts.id')), 'DESC']],
      limit: 10,
      subQuery: false,
      raw: true,
    });
    const audience_top_tags = topTagsRaw.map((t) => ({
      nom: t.nom,
      count: parseInt(t.contactCount || 0),
    }));

    res.json({
      periode,
      date_debut: dateDebut,
      date_fin: maintenant,
      metriques_globales: {
        total_campagnes: totalCampagnes,
        total_envois: totalEnvois,
        total_contacts: totalContacts,
        total_evenements: totalEvenements,
      },
      audience_metrics: {
        total: audience_total,
        actif: audience_actif,
        growth: audience_growth,
        top_tags: audience_top_tags,
      },
      performance_email: {
        taux_ouverture: parseFloat(tauxOuverture),
        taux_clic: parseFloat(tauxClic),
        envois_envoyes: envoisEnvoyes,
        envois_ouverts: envoisOuverts,
        envois_clics: envoisClics,
      },
      repartition_campagnes: statsCampagnes.map((stat) => ({
        statut: stat.statut,
        type: stat.type_campagne,
        count: parseInt(stat.dataValues.count),
        total_envoyes: parseInt(stat.dataValues.total_envoyes || 0),
        total_erreurs: parseInt(stat.dataValues.total_erreurs || 0),
      })),
      repartition_contacts: statsContacts.map((stat) => ({
        type_client: stat.type_client,
        count: parseInt(stat.dataValues.count),
      })),
      repartition_rsvp: statsRsvp.map((stat) => ({
        statut: stat.statut,
        count: parseInt(stat.dataValues.count),
      })),
    });
  } catch (err) {
    logger.error('Erreur getDashboard:', err);
    res.status(500).json({
      message: 'Erreur lors de la récupération du tableau de bord',
      error: err.message,
    });
  }
};

// Statistiques comparatives entre périodes
exports.getComparaisonPeriodes = async (req, res) => {
  try {
    const { periode1 = '30j', periode2 = '60j' } = req.query;

    const maintenant = new Date();
    const dateFin1 = new Date(maintenant.getTime() - 30 * 24 * 60 * 60 * 1000);
    const dateDebut1 = new Date(dateFin1.getTime() - 30 * 24 * 60 * 60 * 1000);
    const dateFin2 = new Date(maintenant.getTime() - 60 * 24 * 60 * 60 * 1000);
    const dateDebut2 = new Date(dateFin2.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Statistiques période 1
    const statsPeriode1 = await getStatsForPeriod(dateDebut1, dateFin1);

    // Statistiques période 2
    const statsPeriode2 = await getStatsForPeriod(dateDebut2, dateFin2);

    // Calculer les variations
    const variations = {
      campagnes: calculerVariation(statsPeriode1.campagnes, statsPeriode2.campagnes),
      envois: calculerVariation(statsPeriode1.envois, statsPeriode2.envois),
      taux_ouverture: calculerVariation(statsPeriode1.taux_ouverture, statsPeriode2.taux_ouverture),
      taux_clic: calculerVariation(statsPeriode1.taux_clic, statsPeriode2.taux_clic),
      contacts: calculerVariation(statsPeriode1.contacts, statsPeriode2.contacts),
    };

    res.json({
      periode1: {
        nom: 'Période récente',
        date_debut: dateDebut1,
        date_fin: dateFin1,
        stats: statsPeriode1,
      },
      periode2: {
        nom: 'Période précédente',
        date_debut: dateDebut2,
        date_fin: dateFin2,
        stats: statsPeriode2,
      },
      variations,
      analyse: genererAnalyse(variations),
    });
  } catch (err) {
    logger.error('Erreur getComparaisonPeriodes:', err);
    res.status(500).json({
      message: 'Erreur lors de la comparaison des périodes',
      error: err.message,
    });
  }
};

// Statistiques par segment
exports.getStatsBySegment = async (req, res) => {
  try {
    const { segmentId } = req.params;
    const { periode = '30j' } = req.query;

    const segment = await Segment.findByPk(segmentId);
    if (!segment) {
      return res.status(404).json({ message: 'Segment non trouvé' });
    }

    // Calculer la période
    const maintenant = new Date();
    let dateDebut;

    switch (periode) {
      case '7j':
        dateDebut = new Date(maintenant.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30j':
        dateDebut = new Date(maintenant.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90j':
        dateDebut = new Date(maintenant.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        dateDebut = new Date(maintenant.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Récupérer les campagnes du segment
    const campagnes = await CampagneEmail.findAll({
      where: {
        segment_id: segmentId,
        date_creation: { [Op.gte]: dateDebut },
        actif: true,
      },
      include: [
        {
          model: StatistiqueCampagne,
          as: 'statistiques',
        },
      ],
    });

    // Calculer les statistiques du segment
    const statsSegment = {
      total_campagnes: campagnes.length,
      total_envois: campagnes.reduce((sum, c) => sum + (c.statistiques?.nb_envoyes || 0), 0),
      total_ouverts: campagnes.reduce((sum, c) => sum + (c.statistiques?.nb_ouverts || 0), 0),
      total_clics: campagnes.reduce((sum, c) => sum + (c.statistiques?.nb_clics || 0), 0),
      taux_ouverture: 0,
      taux_clic: 0,
    };

    if (statsSegment.total_envois > 0) {
      statsSegment.taux_ouverture = (
        (statsSegment.total_ouverts / statsSegment.total_envois) *
        100
      ).toFixed(2);
      statsSegment.taux_clic = (
        (statsSegment.total_clics / statsSegment.total_envois) *
        100
      ).toFixed(2);
    }

    // Performance par campagne
    const performanceParCampagne = campagnes.map((campagne) => ({
      id: campagne.id,
      titre: campagne.titre,
      date_creation: campagne.date_creation,
      statut: campagne.statut,
      nb_envoyes: campagne.statistiques?.nb_envoyes || 0,
      nb_ouverts: campagne.statistiques?.nb_ouverts || 0,
      nb_clics: campagne.statistiques?.nb_clics || 0,
      taux_ouverture:
        campagne.statistiques?.nb_envoyes > 0
          ? ((campagne.statistiques.nb_ouverts / campagne.statistiques.nb_envoyes) * 100).toFixed(2)
          : 0,
      taux_clic:
        campagne.statistiques?.nb_envoyes > 0
          ? ((campagne.statistiques.nb_clics / campagne.statistiques.nb_envoyes) * 100).toFixed(2)
          : 0,
    }));

    res.json({
      segment: {
        id: segment.id,
        nom: segment.nom,
        criteres: segment.criteres,
      },
      periode,
      date_debut: dateDebut,
      date_fin: maintenant,
      statistiques: statsSegment,
      performance_par_campagne: performanceParCampagne,
    });
  } catch (err) {
    logger.error('Erreur getStatsBySegment:', err);
    res.status(500).json({
      message: 'Erreur lors de la récupération des statistiques du segment',
      error: err.message,
    });
  }
};

// Statistiques des événements
exports.getEventStats = async (req, res) => {
  try {
    const { periode = '30j' } = req.query;

    // Calculer la période
    const maintenant = new Date();
    let dateDebut;

    switch (periode) {
      case '7j':
        dateDebut = new Date(maintenant.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30j':
        dateDebut = new Date(maintenant.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90j':
        dateDebut = new Date(maintenant.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        dateDebut = new Date(maintenant.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Statistiques des événements
    const evenements = await Evenement.findAll({
      where: {
        date: { [Op.gte]: dateDebut },
      },
      include: [
        {
          model: Rsvp,
          as: 'rsvps',
          include: [
            {
              model: Contact,
              as: 'contact',
              attributes: ['id', 'nom', 'prenom', 'email', 'type_client'],
            },
          ],
        },
      ],
    });

    // Calculer les statistiques
    const statsEvenements = {
      total_evenements: evenements.length,
      total_invites: evenements.reduce((sum, e) => sum + e.rsvps.length, 0),
      total_confirmes: evenements.reduce(
        (sum, e) => sum + e.rsvps.filter((r) => r.statut === 'confirmé').length,
        0
      ),
      total_absents: evenements.reduce(
        (sum, e) => sum + e.rsvps.filter((r) => r.statut === 'absent').length,
        0
      ),
      taux_confirmation: 0,
      taux_participation: 0,
    };

    if (statsEvenements.total_invites > 0) {
      statsEvenements.taux_confirmation = (
        (statsEvenements.total_confirmes / statsEvenements.total_invites) *
        100
      ).toFixed(2);
      statsEvenements.taux_participation = (
        ((statsEvenements.total_confirmes + statsEvenements.total_absents) /
          statsEvenements.total_invites) *
        100
      ).toFixed(2);
    }

    // Performance par événement
    const performanceParEvenement = evenements.map((evenement) => {
      const totalRsvp = evenement.rsvps.length;
      const confirmes = evenement.rsvps.filter((r) => r.statut === 'confirmé').length;
      const absents = evenement.rsvps.filter((r) => r.statut === 'absent').length;

      return {
        id: evenement.id,
        titre: evenement.titre,
        date: evenement.date,
        lieu: evenement.lieu,
        total_invites: totalRsvp,
        confirmes,
        absents,
        taux_confirmation: totalRsvp > 0 ? ((confirmes / totalRsvp) * 100).toFixed(2) : 0,
        taux_participation:
          totalRsvp > 0 ? (((confirmes + absents) / totalRsvp) * 100).toFixed(2) : 0,
      };
    });

    res.json({
      periode,
      date_debut: dateDebut,
      date_fin: maintenant,
      statistiques: statsEvenements,
      performance_par_evenement: performanceParEvenement,
    });
  } catch (err) {
    logger.error('Erreur getEventStats:', err);
    res.status(500).json({
      message: 'Erreur lors de la récupération des statistiques des événements',
      error: err.message,
    });
  }
};

// Fonctions utilitaires
async function getStatsForPeriod(dateDebut, dateFin) {
  const campagnes = await CampagneEmail.count({
    where: {
      date_creation: { [Op.between]: [dateDebut, dateFin] },
      actif: true,
    },
  });

  const envois = await EnvoiEmail.count({
    where: {
      date_envoi: { [Op.between]: [dateDebut, dateFin] },
    },
  });

  const contacts = await Contact.count({
    where: {
      date_creation: { [Op.between]: [dateDebut, dateFin] },
      actif: true,
    },
  });

  // Calculer les taux moyens
  const envoisEnvoyes = await EnvoiEmail.count({
    where: {
      date_envoi: { [Op.between]: [dateDebut, dateFin] },
      statut: 'envoyé',
    },
  });

  const envoisOuverts = await EnvoiEmail.count({
    where: {
      date_envoi: { [Op.between]: [dateDebut, dateFin] },
      date_ouverture: { [Op.not]: null },
    },
  });

  const envoisClics = await EnvoiEmail.count({
    where: {
      date_envoi: { [Op.between]: [dateDebut, dateFin] },
      date_clic: { [Op.not]: null },
    },
  });

  const tauxOuverture = envoisEnvoyes > 0 ? ((envoisOuverts / envoisEnvoyes) * 100).toFixed(2) : 0;
  const tauxClic = envoisEnvoyes > 0 ? ((envoisClics / envoisEnvoyes) * 100).toFixed(2) : 0;

  return {
    campagnes,
    envois,
    contacts,
    taux_ouverture: parseFloat(tauxOuverture),
    taux_clic: parseFloat(tauxClic),
  };
}

function calculerVariation(valeur1, valeur2) {
  if (valeur2 === 0) return valeur1 > 0 ? 100 : 0;
  return (((valeur1 - valeur2) / valeur2) * 100).toFixed(2);
}

function genererAnalyse(variations) {
  const analyse = [];

  if (variations.campagnes > 10) {
    analyse.push('📈 Augmentation significative du nombre de campagnes');
  } else if (variations.campagnes < -10) {
    analyse.push('📉 Diminution du nombre de campagnes');
  }

  if (variations.taux_ouverture > 5) {
    analyse.push("🎯 Amélioration du taux d'ouverture");
  } else if (variations.taux_ouverture < -5) {
    analyse.push("⚠️ Baisse du taux d'ouverture - à surveiller");
  }

  if (variations.taux_clic > 3) {
    analyse.push('🔗 Amélioration du taux de clic');
  } else if (variations.taux_clic < -3) {
    analyse.push('⚠️ Baisse du taux de clic - à optimiser');
  }

  if (analyse.length === 0) {
    analyse.push('📊 Performance stable sur la période');
  }

  return analyse;
}
