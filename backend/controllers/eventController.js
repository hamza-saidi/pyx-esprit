const { Evenement, Rsvp, Contact, Tag, sequelize } = require('../models');
const { Op } = require('sequelize');
const createEvent = require('../use-cases/event/createEvent');
const updateEvent = require('../use-cases/event/updateEvent');
const logger = require('../utils/logger');

// CRUD événements avec validation avancée
exports.create = async (req, res, next) => {
  try {
    const event = await createEvent(req.body, { clubId: req.clubId, userId: req.user.id });
    res.status(201).json({ message: 'Événement créé avec succès', event });
  } catch (err) {
    next(err);
  }
};

exports.getAll = async (req, res) => {
  try {
    const {
      statut,
      type,
      search,
      date_debut,
      date_fin,
      lieu,
      index_requis,
      page = 1,
      limit = 20,
      sortBy = 'date',
      sortOrder = 'ASC',
    } = req.query;

    const offset = (page - 1) * limit;
    let whereClause = { actif: true };

    // Filtres
    if (statut) whereClause.statut = statut;
    if (type) whereClause.type_evenement = type;
    if (lieu) whereClause.lieu = { [Op.like]: `%${lieu}%` };
    if (index_requis) whereClause.index_requis = { [Op.lte]: parseFloat(index_requis) };

    if (search) {
      whereClause[Op.or] = [
        { titre: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
        { lieu: { [Op.like]: `%${search}%` } },
      ];
    }

    if (date_debut || date_fin) {
      whereClause.date = {};
      if (date_debut) whereClause.date[Op.gte] = new Date(date_debut);
      if (date_fin) whereClause.date[Op.lte] = new Date(date_fin);
    }

    // Validation du tri
    const allowedSortFields = ['date', 'titre', 'lieu', 'type_evenement', 'prix'];
    const allowedSortOrders = ['ASC', 'DESC'];

    const finalSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'date';
    const finalSortOrder = allowedSortOrders.includes(sortOrder.toUpperCase())
      ? sortOrder.toUpperCase()
      : 'ASC';

    const { count, rows: events } = await Evenement.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Rsvp,
          as: 'rsvps',
          include: [{ model: Contact, as: 'contact' }],
        },
      ],
      order: [[finalSortBy, finalSortOrder]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    // Calculer les statistiques globales
    const statsGlobales = await Evenement.findAll({
      where: { actif: true },
      attributes: [
        'statut',
        'type_evenement',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      ],
      group: ['statut', 'type_evenement'],
    });

    res.json({
      data: events,
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / limit),
      statsGlobales: statsGlobales.reduce((acc, stat) => {
        const key = `${stat.statut}_${stat.type_evenement}`;
        acc[key] = parseInt(stat.dataValues.count);
        return acc;
      }, {}),
      filters: {
        statut,
        type,
        search,
        date_debut,
        date_fin,
        lieu,
        index_requis,
      },
    });
  } catch (err) {
    logger.error('Erreur getAll events:', err);
    res.status(500).json({
      message: 'Erreur lors de la récupération des événements',
      error: err.message,
    });
  }
};

exports.getOne = async (req, res) => {
  try {
    const { id } = req.params;

    const event = await Evenement.findByPk(id, {
      include: [
        {
          model: Rsvp,
          as: 'rsvps',
          include: [
            {
              model: Contact,
              as: 'contact',
              attributes: ['id', 'nom', 'prenom', 'email', 'telephone', 'handicap', 'type_client'],
            },
          ],
        },
      ],
    });

    if (!event) {
      return res.status(404).json({ message: 'Événement non trouvé' });
    }

    // Calculer les statistiques de l'événement
    const statsEvenement = {
      total_invites: event.rsvps?.length || 0,
      confirmes: event.rsvps?.filter((r) => r.statut === 'confirmé').length || 0,
      absents: event.rsvps?.filter((r) => r.statut === 'absent').length || 0,
      en_attente: event.rsvps?.filter((r) => r.statut === 'invité').length || 0,
      taux_confirmation: 0,
      taux_participation: 0,
    };

    if (statsEvenement.total_invites > 0) {
      statsEvenement.taux_confirmation = (
        (statsEvenement.confirmes / statsEvenement.total_invites) *
        100
      ).toFixed(2);
      statsEvenement.taux_participation = (
        ((statsEvenement.confirmes + statsEvenement.absents) / statsEvenement.total_invites) *
        100
      ).toFixed(2);
    }

    res.json({
      ...event.toJSON(),
      statistiques: statsEvenement,
    });
  } catch (err) {
    logger.error('Erreur getOne event:', err);
    res.status(500).json({
      message: "Erreur lors de la récupération de l'événement",
      error: err.message,
    });
  }
};

exports.update = async (req, res, next) => {
  try {
    const event = await updateEvent(req.params.id, req.body, { clubId: req.clubId });
    res.json({ message: 'Événement mis à jour avec succès', event });
  } catch (err) {
    next(err);
  }
};

exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    const event = await Evenement.findByPk(id);
    if (!event) {
      return res.status(404).json({ message: 'Événement non trouvé' });
    }

    // Vérifier que l'événement peut être supprimé
    if (event.statut === 'en_cours') {
      return res.status(400).json({
        message: 'Impossible de supprimer un événement en cours',
      });
    }

    // Soft delete
    await event.update({ actif: false });

    res.json({ message: 'Événement supprimé avec succès' });
  } catch (err) {
    logger.error('Erreur delete event:', err);
    res.status(500).json({
      message: "Erreur lors de la suppression de l'événement",
      error: err.message,
    });
  }
};

// Inviter des contacts à un événement (créer RSVP)
exports.invite = async (req, res) => {
  try {
    const { contact_ids, message_personnalise } = req.body;
    const { id: evenement_id } = req.params;

    if (!contact_ids || !Array.isArray(contact_ids) || contact_ids.length === 0) {
      return res.status(400).json({
        message: 'Au moins un contact doit être spécifié',
      });
    }

    const event = await Evenement.findByPk(evenement_id);
    if (!event) {
      return res.status(404).json({ message: 'Événement non trouvé' });
    }

    // Vérifier la capacité
    if (event.capacite_max) {
      const rsvpsExistants = await Rsvp.count({
        where: { evenement_id, statut: { [Op.in]: ['invité', 'confirmé'] } },
      });

      if (rsvpsExistants + contact_ids.length > event.capacite_max) {
        return res.status(400).json({
          message: `Capacité maximale dépassée. Places disponibles: ${event.capacite_max - rsvpsExistants}`,
        });
      }
    }

    // Créer les RSVP
    const rsvps = [];
    for (const contact_id of contact_ids) {
      // Vérifier si le contact n'est pas déjà invité
      const rsvpExistant = await Rsvp.findOne({
        where: { contact_id, evenement_id },
      });

      if (!rsvpExistant) {
        const rsvp = await Rsvp.create({
          contact_id,
          evenement_id,
          statut: 'invité',
          message_personnalise: message_personnalise || null,
          date_invitation: new Date(),
        });
        rsvps.push(rsvp);
      }
    }

    res.status(201).json({
      message: `${rsvps.length} invitation(s) créée(s) avec succès`,
      rsvps_crees: rsvps.length,
      total_invites: await Rsvp.count({ where: { evenement_id } }),
    });
  } catch (err) {
    logger.error('Erreur invite:', err);
    res.status(500).json({
      message: "Erreur lors de l'invitation des contacts",
      error: err.message,
    });
  }
};

// Mettre à jour le statut RSVP
exports.updateRsvp = async (req, res) => {
  try {
    const { rsvpId } = req.params;
    const { statut, commentaire, date_confirmation } = req.body;

    const rsvp = await Rsvp.findByPk(rsvpId, {
      include: [
        { model: Contact, as: 'contact' },
        { model: Evenement, as: 'evenement' },
      ],
    });

    if (!rsvp) {
      return res.status(404).json({ message: 'RSVP non trouvé' });
    }

    // Vérifier que le statut est valide
    const statutsValides = ['invité', 'confirmé', 'absent', 'annule'];
    if (!statutsValides.includes(statut)) {
      return res.status(400).json({
        message: 'Statut invalide',
      });
    }

    // Vérifier la capacité si on confirme
    if (statut === 'confirmé' && rsvp.evenement.capacite_max) {
      const confirmesExistants = await Rsvp.count({
        where: {
          evenement_id: rsvp.evenement_id,
          statut: 'confirmé',
          id: { [Op.ne]: rsvpId },
        },
      });

      if (confirmesExistants >= rsvp.evenement.capacite_max) {
        return res.status(400).json({
          message: 'Capacité maximale atteinte pour cet événement',
        });
      }
    }

    await rsvp.update({
      statut,
      commentaire: commentaire || null,
      date_confirmation: statut === 'confirmé' ? date_confirmation || new Date() : null,
    });

    res.json({
      message: 'Statut RSVP mis à jour avec succès',
      rsvp: await Rsvp.findByPk(rsvpId, {
        include: [
          { model: Contact, as: 'contact' },
          { model: Evenement, as: 'evenement' },
        ],
      }),
    });
  } catch (err) {
    logger.error('Erreur updateRsvp:', err);
    res.status(500).json({
      message: 'Erreur lors de la mise à jour du RSVP',
      error: err.message,
    });
  }
};

// Nouvelle fonction : Obtenir les statistiques d'un événement
exports.getEventStats = async (req, res) => {
  try {
    const { id } = req.params;

    const event = await Evenement.findByPk(id, {
      include: [
        {
          model: Rsvp,
          as: 'rsvps',
          include: [{ model: Contact, as: 'contact' }],
        },
      ],
    });

    if (!event) {
      return res.status(404).json({ message: 'Événement non trouvé' });
    }

    // Statistiques détaillées
    const stats = {
      total_invites: event.rsvps?.length || 0,
      confirmes: event.rsvps?.filter((r) => r.statut === 'confirmé').length || 0,
      absents: event.rsvps?.filter((r) => r.statut === 'absent').length || 0,
      en_attente: event.rsvps?.filter((r) => r.statut === 'invité').length || 0,
      annules: event.rsvps?.filter((r) => r.statut === 'annule').length || 0,
      taux_confirmation: 0,
      taux_participation: 0,
      taux_annulation: 0,
    };

    if (stats.total_invites > 0) {
      stats.taux_confirmation = ((stats.confirmes / stats.total_invites) * 100).toFixed(2);
      stats.taux_participation = (
        ((stats.confirmes + stats.absents) / stats.total_invites) *
        100
      ).toFixed(2);
      stats.taux_annulation = ((stats.annules / stats.total_invites) * 100).toFixed(2);
    }

    // Statistiques par type de client
    const statsParTypeClient = {};
    event.rsvps?.forEach((rsvp) => {
      const type = rsvp.contact?.type_client || 'non_defini';
      if (!statsParTypeClient[type]) {
        statsParTypeClient[type] = { total: 0, confirmes: 0, absents: 0 };
      }
      statsParTypeClient[type].total++;
      if (rsvp.statut === 'confirmé') statsParTypeClient[type].confirmes++;
      if (rsvp.statut === 'absent') statsParTypeClient[type].absents++;
    });

    // Statistiques par handicap
    const statsParHandicap = {};
    event.rsvps?.forEach((rsvp) => {
      const handicap = rsvp.contact?.handicap || 'non_defini';
      if (!statsParHandicap[handicap]) {
        statsParHandicap[handicap] = { total: 0, confirmes: 0 };
      }
      statsParHandicap[handicap].total++;
      if (rsvp.statut === 'confirmé') statsParHandicap[handicap].confirmes++;
    });

    res.json({
      evenement: {
        id: event.id,
        titre: event.titre,
        date: event.date,
        lieu: event.lieu,
        capacite_max: event.capacite_max,
        statut: event.statut,
      },
      statistiques: stats,
      repartition_par_type_client: statsParTypeClient,
      repartition_par_handicap: statsParHandicap,
    });
  } catch (err) {
    logger.error('Erreur getEventStats:', err);
    res.status(500).json({
      message: 'Erreur lors de la récupération des statistiques',
      error: err.message,
    });
  }
};

// Nouvelle fonction : Annuler un événement
exports.cancelEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { raison_annulation } = req.body;

    const event = await Evenement.findByPk(id);
    if (!event) {
      return res.status(404).json({ message: 'Événement non trouvé' });
    }

    if (event.statut === 'annule') {
      return res.status(400).json({ message: "L'événement est déjà annulé" });
    }

    if (event.statut === 'termine') {
      return res.status(400).json({ message: "Impossible d'annuler un événement terminé" });
    }

    // Annuler l'événement
    await event.update({
      statut: 'annule',
      parametres: {
        ...event.parametres,
        raison_annulation,
        annule_le: new Date().toISOString(),
        annule_par: req.user.id,
      },
    });

    // Mettre à jour tous les RSVP en attente
    await Rsvp.update(
      { statut: 'annule' },
      {
        where: {
          evenement_id: id,
          statut: 'invité',
        },
      }
    );

    res.json({
      message: 'Événement annulé avec succès',
      event: await Evenement.findByPk(id),
    });
  } catch (err) {
    logger.error('Erreur cancelEvent:', err);
    res.status(500).json({
      message: "Erreur lors de l'annulation de l'événement",
      error: err.message,
    });
  }
};
