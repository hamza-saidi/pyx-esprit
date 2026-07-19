const {
  CampagneEmail,
  Segment,
  Contact,
  Tag,
  StatistiqueCampagne,
  EnvoiEmail,
  Utilisateur,
  sequelize,
} = require('../models');
const { Op } = require('sequelize');
const emailService = require('../services/emailService');
const path = require('path');
const fs = require('fs');
const { getPublicBaseUrl } = require('../utils/url');
const { pick } = require('../utils/pick');
const logger = require('../utils/logger');
const { buildContactQueryFromCriteria } = require('../utils/queryBuilder');

const ATTACHMENTS_DIR = path.join(__dirname, '..', 'uploads', 'campaign-attachments');

// Excludes id/club_id/createur_id (tenant isolation, ownership) and
// statistics fields (nb_envoyes/nb_erreurs/actif, server-managed). `statut`
// stays allowed here (this endpoint already validates the brouillon <->
// programmée transition below) but `en_cours`/`envoyée` can never be set
// this way since the function already rejects updates once the campaign
// reaches either of those statuses.
const CAMPAGNE_UPDATE_FIELDS = [
  'titre',
  'sujet',
  'contenu_html',
  'contenu_texte',
  'type_campagne',
  'date_programmation',
  'segment_id',
  'tags_ids',
  'contacts_ids',
  'parametres',
  'priorite',
  'limite_envois',
  'attachments',
  'statut',
];
function parseJsonField(raw, fallback = {}) {
  if (!raw) return fallback;
  if (typeof raw === 'object' && raw !== null) {
    // If it's already an object but is an array-like object (indexed strings), try to recover or return fallback
    if (
      Object.keys(raw).every((k) => !isNaN(k)) &&
      Object.keys(raw).length > 0 &&
      !Array.isArray(raw)
    ) {
      return fallback;
    }
    return raw;
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      // Recursively parse if double-stringified
      if (typeof parsed === 'string') return parseJsonField(parsed, fallback);
      return typeof parsed === 'object' && parsed !== null ? parsed : fallback;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

function parseAttachments(raw) {
  if (!raw) return [];
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  if (Array.isArray(raw)) return raw;
  return [];
}

// Ensure all internal URLs are absolute for both CRM UI and Emails
function normalizeUrls(html, req) {
  if (!html) return html;
  try {
    const baseUrl = getPublicBaseUrl(req).replace(/\/+$/, '');
    if (!baseUrl) return html;

    // 1. Replace localhost URLs: http://localhost:5000/api/... -> https://prod.com/api/...
    const localhostPattern = /https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/api\/[^"'\s<>\)]+)/gi;
    let processedHtml = html.replace(
      localhostPattern,
      (match, host, port, path) => `${baseUrl}${path}`
    );

    // 2. Replace relative paths: src="/api/..." -> src="https://prod.com/api/..."
    const relativePattern = /(src|href)=["'](\/(api|uploads|logo\.svg)[^"'\s<>\)]+)["']/gi;
    processedHtml = processedHtml.replace(
      relativePattern,
      (match, attr, path) => `${attr}="${baseUrl}${path}"`
    );

    return processedHtml;
  } catch (error) {
    logger.error('Error normalizing URLs:', error);
    return html;
  }
}

// Validation helper
const validateCampagneData = (data) => {
  const errors = [];

  if (!data.titre || data.titre.trim().length < 3) {
    errors.push('Le titre doit contenir au moins 3 caractères');
  }

  if (!data.contenu_html || data.contenu_html.replace(/<[^>]*>/g, '').trim().length < 5) {
    errors.push('Le contenu HTML doit contenir du contenu');
  }

  // Only check scheduling time when explicitly scheduling
  if (String(data.statut || '').toLowerCase() === 'programmée') {
    if (!data.date_programmation) {
      errors.push('Une date de programmation est requise pour programmer une campagne');
    } else if (new Date(data.date_programmation) <= new Date()) {
      errors.push('La date de programmation doit être dans le futur');
    }
  }

  if (data.limite_envois && (data.limite_envois < 1 || data.limite_envois > 100000)) {
    errors.push("La limite d'envois doit être entre 1 et 100,000");
  }

  return errors;
};

// Récupérer toutes les campagnes avec pagination et filtres avancés
const getAll = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      statut,
      type,
      search,
      date_debut,
      date_fin,
      createur_id,
      priorite,
      sortBy = 'date_creation',
      sortOrder = 'DESC',
    } = req.query;

    const offset = (page - 1) * limit;

    let whereClause = { actif: true };

    // Filtres de base
    if (statut) whereClause.statut = statut;
    if (type) whereClause.type_campagne = type;
    if (createur_id) whereClause.createur_id = createur_id;
    if (priorite) whereClause.priorite = priorite;

    // Filtre de recherche
    if (search) {
      whereClause[Op.or] = [
        { titre: { [Op.like]: `%${search}%` } },
        { sujet: { [Op.like]: `%${search}%` } },
        { contenu_html: { [Op.like]: `%${search}%` } },
      ];
    }

    // Filtres de date
    if (date_debut || date_fin) {
      whereClause.date_creation = {};
      if (date_debut) whereClause.date_creation[Op.gte] = new Date(date_debut);
      if (date_fin) whereClause.date_creation[Op.lte] = new Date(date_fin);
    }

    // Validation du tri
    const allowedSortFields = [
      'date_creation',
      'titre',
      'statut',
      'priorite',
      'date_programmation',
    ];
    const allowedSortOrders = ['ASC', 'DESC'];

    const finalSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'date_creation';
    const finalSortOrder = allowedSortOrders.includes(sortOrder.toUpperCase())
      ? sortOrder.toUpperCase()
      : 'DESC';

    const { count, rows: campagnes } = await CampagneEmail.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Utilisateur,
          as: 'createur',
          attributes: ['id', 'nom', 'email'],
        },
        {
          model: Segment,
          as: 'segment',
          attributes: ['id', 'nom'],
        },
        {
          model: StatistiqueCampagne,
          as: 'statistiques',
          attributes: ['nb_envoyes', 'nb_ouverts', 'nb_clics', 'nb_desabonnements'],
        },
      ],
      order: [[finalSortBy, finalSortOrder]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    // Calculer les statistiques globales
    const statsGlobales = await CampagneEmail.findAll({
      where: { actif: true },
      attributes: ['statut', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      group: ['statut'],
    });

    // Normalize URLs in HTML content for preview in CRM UI
    const campagnesNormalisees = campagnes.map((c) => {
      const data = c.toJSON();
      if (data.contenu_html) {
        data.contenu_html = normalizeUrls(data.contenu_html, req);
      }
      return data;
    });

    res.json({
      data: campagnesNormalisees,
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / limit),
      statsGlobales: statsGlobales.reduce((acc, stat) => {
        acc[stat.statut] = parseInt(stat.dataValues.count);
        return acc;
      }, {}),
      filters: {
        statut,
        type,
        search,
        date_debut,
        date_fin,
        createur_id,
        priorite,
      },
    });
  } catch (error) {
    logger.error('Erreur getAll campagnes:', error);
    res.status(500).json({
      message: 'Erreur lors de la récupération des campagnes',
      error: error.message,
    });
  }
};

// Récupérer une campagne par ID avec toutes les informations détaillées
const getOne = async (req, res) => {
  try {
    const { id } = req.params;

    const campagne = await CampagneEmail.findByPk(id, {
      include: [
        {
          model: Utilisateur,
          as: 'createur',
          attributes: ['id', 'nom', 'email'],
        },
        {
          model: Segment,
          as: 'segment',
        },
        {
          model: StatistiqueCampagne,
          as: 'statistiques',
        },
        {
          model: EnvoiEmail,
          as: 'envois',
          attributes: [
            'id',
            'statut',
            'date_envoi',
            'message_erreur',
            'date_ouverture',
            'date_clic',
          ],
          include: [
            {
              model: Contact,
              as: 'contact',
              attributes: ['id', 'email', 'nom', 'prenom'],
            },
          ],
        },
      ],
    });

    if (!campagne) {
      return res.status(404).json({ message: 'Campagne non trouvée' });
    }

    // Calculer les statistiques en temps réel
    const statsEnTempsReel = {
      total_envois: campagne.envois?.length || 0,
      envoyes: campagne.envois?.filter((e) => e.statut === 'envoyé').length || 0,
      erreurs: campagne.envois?.filter((e) => e.statut === 'erreur').length || 0,
      ouverts: campagne.envois?.filter((e) => e.date_ouverture).length || 0,
      clics: campagne.envois?.filter((e) => e.date_clic).length || 0,
      taux_ouverture: 0,
      taux_clic: 0,
    };

    if (statsEnTempsReel.total_envois > 0) {
      statsEnTempsReel.taux_ouverture = (
        (statsEnTempsReel.ouverts / statsEnTempsReel.total_envois) *
        100
      ).toFixed(2);
      statsEnTempsReel.taux_clic = (
        (statsEnTempsReel.clics / statsEnTempsReel.total_envois) *
        100
      ).toFixed(2);
    }

    // Normalize URLs for CRM UI preview
    const data = campagne.toJSON();
    if (data.contenu_html) {
      data.contenu_html = normalizeUrls(data.contenu_html, req);
    }

    res.json({
      ...data,
      stats_en_temps_reel: statsEnTempsReel,
    });
  } catch (error) {
    logger.error('Erreur getOne campagne:', error);
    res.status(500).json({
      message: 'Erreur lors de la récupération de la campagne',
      error: error.message,
    });
  }
};

// Créer une nouvelle campagne avec validation avancée
const create = async (req, res) => {
  try {
    const {
      titre,
      sujet,
      contenu_html,
      contenu_texte,
      type_campagne,
      date_programmation,
      segment_id,
      tags_ids,
      contacts_ids,
      parametres,
      priorite,
      limite_envois,
      test_ab,
      attachments,
      audience = 'custom', // 'all' | 'segment' | 'tags' | 'custom'
      where,
      direct_emails,
    } = req.body;

    // Validation des données
    // Render blocks_json to HTML if provided
    let final_contenu_html = contenu_html;
    if (req.body.blocks_json && !final_contenu_html) {
      try {
        const doc =
          typeof req.body.blocks_json === 'string'
            ? JSON.parse(req.body.blocks_json)
            : req.body.blocks_json;
        const styles = doc.styles || {};
        const fontFamily = styles.fontFamily || 'Arial, sans-serif';
        const textColor = styles.color || '#333333';
        const buttonColor = styles.buttonColor || '#1976d2';
        const css = `body{margin:0;padding:0} .container{max-width:600px;margin:0 auto;padding:0 16px;font-family:${fontFamily};color:${textColor}} .btn{background:${buttonColor};color:#fff;padding:12px 18px;border-radius:6px;text-decoration:none;display:inline-block}`;
        const renderBlock = (b) => {
          if (!b) return '';
          switch (b.type) {
            case 'title':
              return `<h1 style="margin:0 0 16px;font-size:24px;line-height:1.3">${b.text || ''}</h1>`;
            case 'text':
              return `<div style="margin:0 0 16px">${b.html || ''}</div>`;
            case 'image':
              return `<div style="margin:0 0 16px"><img src="${b.url || ''}" alt="" style="max-width:100%;border:0"/></div>`;
            case 'button':
              return `<div style="margin:16px 0"><a class="btn" href="${b.url || '#'}">${b.label || 'Bouton'}</a></div>`;
            case 'divider':
              return `<hr style="border:0;border-top:1px solid #e0e0e0;margin:16px 0"/>`;
            case 'spacer':
              return `<div style="height:${b.height || 16}px"></div>`;
            case 'columns2': {
              const left = Array.isArray(b.left) ? b.left.map(renderBlock).join('') : '';
              const right = Array.isArray(b.right) ? b.right.map(renderBlock).join('') : '';
              return `<table width=\"100%\" cellspacing=\"0\" cellpadding=\"0\"><tr><td valign=\"top\" width=\"50%\" style=\"padding-right:8px\">${left}</td><td valign=\"top\" width=\"50%\" style=\"padding-left:8px\">${right}</td></tr></table>`;
            }
            default:
              return '';
          }
        };
        const header = doc.header?.show
          ? `<div style=\"padding:16px 0;text-align:center\">${doc.header.logoUrl ? `<img src=\"${doc.header.logoUrl}\" style=\"max-height:48px\"/>` : ''}${doc.header.title ? `<div style=\"margin-top:8px;font-weight:700\">${doc.header.title}</div>` : ''}</div>`
          : '';
        const footer = doc.footer?.show
          ? `<div style=\"padding:24px 0;color:#777;font-size:12px;text-align:center\">${doc.footer.text || ''}</div>`
          : '';
        const body = (doc.blocks || []).map(renderBlock).join('');
        final_contenu_html = `<!doctype html><html><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"/><style>${css}</style></head><body><div class=\"container\">${header}${body}${footer}</div></body></html>`;
      } catch (e) {
        logger.debug('Render blocks_json failed:', e.message);
      }
    }

    const validationErrors = validateCampagneData({
      ...req.body,
      contenu_html: final_contenu_html || contenu_html,
    });
    if (validationErrors.length > 0) {
      return res.status(400).json({
        message: 'Données invalides',
        errors: validationErrors,
      });
    }

    // Vérifier que l'utilisateur a les permissions
    if (req.user.role !== 'admin' && priorite === 'urgente') {
      return res.status(403).json({
        message: 'Seuls les administrateurs peuvent créer des campagnes urgentes',
      });
    }

    // Prétraiter les emails directs: associer aux contacts (création si nécessaire)
    let finalContactsIds = contacts_ids || [];
    if (direct_emails && Array.isArray(direct_emails) && direct_emails.length > 0) {
      const emailsNettoyes = direct_emails
        .map((e) => (typeof e === 'string' ? e.trim() : ''))
        .filter((e) => e && /.+@.+\..+/.test(e));
      if (emailsNettoyes.length > 0) {
        const { Contact } = require('../models');
        const existants = await Contact.findAll({ where: { email: { [Op.in]: emailsNettoyes } } });
        const existantsByEmail = new Map(existants.map((c) => [c.email, c]));
        const aCreer = emailsNettoyes.filter((e) => !existantsByEmail.has(e));
        if (aCreer.length > 0) {
          const created = await Promise.all(
            aCreer.map((email) =>
              Contact.create({
                prenom: email.split('@')[0],
                nom: 'Direct',
                email,
                actif: true,
              })
            )
          );
          created.forEach((c) => existantsByEmail.set(c.email, c));
        }
        finalContactsIds = [
          ...new Set([
            ...finalContactsIds,
            ...emailsNettoyes.map((e) => existantsByEmail.get(e)?.id).filter(Boolean),
          ]),
        ];
      }
    }

    const baseParametres = parseJsonField(parametres, {});
    const parsedAttachments = parseAttachments(attachments || baseParametres.attachments);

    // Créer la campagne
    const campagne = await CampagneEmail.create({
      titre: titre.trim(),
      sujet: sujet?.trim() || titre.trim(),
      contenu_html: (final_contenu_html || contenu_html || '').trim(),
      contenu_texte: contenu_texte?.trim(),
      type_campagne: type_campagne || 'newsletter',
      // Laisser null si non programmée; ne pas imposer une date par défaut
      date_programmation: date_programmation ? new Date(date_programmation) : null,
      segment_id,
      tags_ids: tags_ids || [],
      contacts_ids: finalContactsIds,
      parametres: {
        ...(typeof baseParametres === 'object' && baseParametres !== null ? baseParametres : {}),
        test_ab: test_ab || false,
        version: 'A',
        created_at: new Date().toISOString(),
        audience,
        where: audience === 'custom' ? where : undefined,
        attachments: parsedAttachments,
      },
      priorite: priorite || 'normale',
      limite_envois,
      createur_id: req.user.id,
      date_creation: new Date(),
      statut: date_programmation ? 'programmée' : 'brouillon',
    });

    // Créer les statistiques initiales
    await StatistiqueCampagne.create({
      campagne_id: campagne.id,
      nb_envoyes: 0,
      nb_ouverts: 0,
      nb_clics: 0,
      nb_desabonnements: 0,
    });

    // Récupérer la campagne créée avec les associations
    const campagneCreee = await CampagneEmail.findByPk(campagne.id, {
      include: [
        {
          model: Utilisateur,
          as: 'createur',
          attributes: ['id', 'nom', 'email'],
        },
        {
          model: Segment,
          as: 'segment',
        },
        {
          model: StatistiqueCampagne,
          as: 'statistiques',
        },
      ],
    });

    res.status(201).json({
      message: 'Campagne créée avec succès',
      campagne: campagneCreee,
    });
  } catch (error) {
    logger.error('Erreur create campagne:', error);
    res.status(500).json({
      message: 'Erreur lors de la création de la campagne',
      error: error.message,
    });
  }
};

// Mettre à jour une campagne avec validation
const update = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = pick(req.body, CAMPAGNE_UPDATE_FIELDS);

    const campagne = await CampagneEmail.findByPk(id);
    if (!campagne) {
      return res.status(404).json({ message: 'Campagne non trouvée' });
    }

    // Vérifier les permissions
    if (campagne.createur_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        message: "Vous n'avez pas les permissions pour modifier cette campagne",
      });
    }

    // Vérifier que la campagne peut être modifiée
    if (['en_cours', 'envoyée'].includes(campagne.statut)) {
      return res.status(400).json({
        message: "Impossible de modifier une campagne en cours d'envoi ou déjà envoyée",
      });
    }

    // Validation des données de mise à jour
    if (
      updateData.titre ||
      updateData.contenu_html ||
      updateData.statut ||
      updateData.date_programmation
    ) {
      const validationData = {
        titre: updateData.titre || campagne.titre,
        contenu_html: updateData.contenu_html || campagne.contenu_html,
        date_programmation: updateData.date_programmation,
        statut: updateData.statut || campagne.statut,
      };

      const validationErrors = validateCampagneData(validationData);
      if (validationErrors.length > 0) {
        return res.status(400).json({
          message: 'Données invalides',
          errors: validationErrors,
        });
      }
    }

    // Si on change le statut vers programmée, vérifier qu'on a une date
    if (
      updateData.statut === 'programmée' &&
      !updateData.date_programmation &&
      !campagne.date_programmation
    ) {
      return res.status(400).json({
        message: 'Une date de programmation est requise pour programmer une campagne',
      });
    }

    if (updateData.parametres || updateData.attachments !== undefined) {
      const baseParams = parseJsonField(updateData.parametres, campagne.parametres || {});
      const parsedAttachments =
        updateData.attachments !== undefined
          ? parseAttachments(updateData.attachments)
          : parseAttachments(baseParams.attachments || campagne.parametres?.attachments);
      baseParams.attachments = parsedAttachments;
      updateData.parametres = baseParams;
      delete updateData.attachments;
    }

    // Mettre à jour
    await campagne.update(updateData);

    // Récupérer la campagne mise à jour avec les associations
    const campagneMiseAJour = await CampagneEmail.findByPk(id, {
      include: [
        {
          model: Utilisateur,
          as: 'createur',
          attributes: ['id', 'nom', 'email'],
        },
        {
          model: Segment,
          as: 'segment',
        },
        {
          model: StatistiqueCampagne,
          as: 'statistiques',
        },
      ],
    });

    res.json({
      message: 'Campagne mise à jour avec succès',
      campagne: campagneMiseAJour,
    });
  } catch (error) {
    logger.error('Erreur update campagne:', error);
    res.status(500).json({
      message: 'Erreur lors de la mise à jour de la campagne',
      error: error.message,
    });
  }
};

// Supprimer une campagne
const remove = async (req, res) => {
  try {
    const { id } = req.params;

    const campagne = await CampagneEmail.findByPk(id);
    if (!campagne) {
      return res.status(404).json({ message: 'Campagne non trouvée' });
    }

    // Vérifier que la campagne peut être supprimée
    // Bloque uniquement les campagnes en cours d'envoi (les campagnes envoyées peuvent être supprimées)
    if (campagne.statut === 'en_cours') {
      return res.status(400).json({
        message:
          "Impossible de supprimer une campagne en cours d'envoi. Veuillez attendre la fin de l'envoi.",
      });
    }

    // Soft delete
    await campagne.update({ actif: false });
    res.json({ message: 'Campagne supprimée avec succès' });
  } catch (error) {
    logger.error('Erreur remove campagne:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// Programmer l'envoi d'une campagne
const programmer = async (req, res) => {
  try {
    const { id } = req.params;
    const { date_programmation } = req.body;

    if (!date_programmation) {
      return res.status(400).json({
        message: 'La date de programmation est requise',
      });
    }

    const campagne = await CampagneEmail.findByPk(id);
    if (!campagne) {
      return res.status(404).json({ message: 'Campagne non trouvée' });
    }

    if (campagne.statut !== 'brouillon') {
      return res.status(400).json({
        message: 'Seules les campagnes en brouillon peuvent être programmées',
      });
    }

    // Vérifier que la date est dans le futur
    if (new Date(date_programmation) <= new Date()) {
      return res.status(400).json({
        message: 'La date de programmation doit être dans le futur',
      });
    }

    await campagne.update({
      statut: 'programmée',
      date_programmation: new Date(date_programmation),
    });

    res.json({
      message: 'Campagne programmée avec succès',
      campagne: await CampagneEmail.findByPk(id, {
        include: [
          { model: Utilisateur, as: 'createur', attributes: ['id', 'nom', 'email'] },
          { model: Segment, as: 'segment' },
        ],
      }),
    });
  } catch (error) {
    logger.error('Erreur programmer campagne:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// Annuler une campagne programmée
const annuler = async (req, res) => {
  try {
    const { id } = req.params;

    const campagne = await CampagneEmail.findByPk(id);
    if (!campagne) {
      return res.status(404).json({ message: 'Campagne non trouvée' });
    }

    if (campagne.statut !== 'programmée') {
      return res.status(400).json({
        message: 'Seules les campagnes programmées peuvent être annulées',
      });
    }

    await campagne.update({
      statut: 'brouillon',
      date_programmation: null,
    });

    res.json({
      message: 'Campagne annulée avec succès',
      campagne: await CampagneEmail.findByPk(id, {
        include: [
          { model: Utilisateur, as: 'createur', attributes: ['id', 'nom', 'email'] },
          { model: Segment, as: 'segment' },
        ],
      }),
    });
  } catch (error) {
    logger.error('Erreur annuler campagne:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// Envoyer une campagne immédiatement
const envoyer = async (req, res) => {
  try {
    const { id } = req.params;

    const campagne = await CampagneEmail.findByPk(id);
    if (!campagne) {
      return res.status(404).json({ message: 'Campagne non trouvée' });
    }

    if (campagne.statut !== 'brouillon' && campagne.statut !== 'programmée') {
      return res.status(400).json({
        message: 'Seules les campagnes en brouillon ou programmées peuvent être envoyées',
      });
    }

    // Mettre la campagne en statut programmée si elle était en brouillon
    if (campagne.statut === 'brouillon') {
      await campagne.update({
        statut: 'programmée',
        date_programmation: new Date(),
      });
    }

    // Lancer l'envoi via la file d'attente (decoupled queue manager)
    const queueService = require('../services/queueService');
    queueService.enqueueCampaign(id, req.clubId);

    res.json({
      message: 'Envoi de la campagne lancé avec succès',
      campagne: await CampagneEmail.findByPk(id, {
        include: [
          { model: Utilisateur, as: 'createur', attributes: ['id', 'nom', 'email'] },
          { model: Segment, as: 'segment' },
        ],
      }),
    });
  } catch (error) {
    logger.error('Erreur envoyer campagne:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// Envoyer un email de test
const envoyerTest = async (req, res) => {
  try {
    const { id } = req.params;
    const { email_test } = req.body;

    if (!email_test) {
      return res.status(400).json({
        message: "L'email de test est requis",
      });
    }

    const campagne = await CampagneEmail.findByPk(id);
    if (!campagne) {
      return res.status(404).json({ message: 'Campagne non trouvée' });
    }

    const result = await emailService.envoyerTest(email_test, campagne);
    res.json({
      message: 'Email de test envoyé avec succès',
      messageId: result.messageId,
    });
  } catch (error) {
    logger.error('Erreur envoi test:', error);
    res.status(500).json({
      message: "Erreur lors de l'envoi du test",
      error: error.message,
    });
  }
};

// Calculer le nombre de destinataires
const calculerDestinataires = async (req, res) => {
  try {
    const { segment_id, tags_ids, contacts_ids, audience, where } = req.body;

    logger.debug('=== CALCULER DESTINATAIRES DEBUG ===');
    logger.debug('Received data:', { segment_id, tags_ids, contacts_ids, audience, where });
    logger.debug('tags_ids type:', typeof tags_ids);
    logger.debug('tags_ids length:', tags_ids ? tags_ids.length : 'undefined');

    let whereClause = { actif: true };
    let include = [];
    let contacts = [];

    // PRIORITÉ: segment si fourni
    if (segment_id) {
      const segment = await Segment.findByPk(segment_id);
      if (segment) {
        const built = buildContactQueryFromCriteria(segment.criteres);
        whereClause = { ...whereClause, ...built.where };
        include = [...include, ...built.include];
      }
    } else {
      // Audience rapide sinon
      if (audience === 'custom' && where && typeof where === 'object')
        Object.assign(whereClause, where);
    }

    // Filtrer par tags si spécifiés
    if (tags_ids && tags_ids.length > 0) {
      logger.debug('Filtering by tags:', tags_ids);
      include.push({
        model: Tag,
        as: 'tags',
        where: { id: { [Op.in]: tags_ids } },
        through: { attributes: [] },
        required: true,
      });
    }

    // Extraction des emails directs s'ils sont fournis en brut (chaîne séparée par virgules ou tableau)
    let directEmailsList = [];
    if (req.body.direct_emails) {
      directEmailsList = Array.isArray(req.body.direct_emails)
        ? req.body.direct_emails
        : String(req.body.direct_emails)
            .split(',')
            .map((e) => e.trim())
            .filter((e) => e && /.+@.+\..+/.test(e));
    }

    // Protection: Si on est en mode "all" ou "custom" mais qu'AUCUN critère n'est fourni
    const hasAnyCriteria =
      segment_id ||
      (tags_ids && tags_ids.length > 0) ||
      (contacts_ids && contacts_ids.length > 0) ||
      directEmailsList.length > 0 ||
      (where && Object.keys(where).length > 0);

    if (!hasAnyCriteria && audience !== 'all') {
      return res.json({ nombre_destinataires: 0, contacts: [] });
    }

    // Compute count and sample without loading all
    let count = await Contact.count({ where: whereClause, include, distinct: true });
    let sample = await Contact.findAll({ where: whereClause, include, limit: 100 });

    // Fusionner avec les contacts_ids (ID existants) et direct_emails (emails bruts)
    const allManualIds = new Set(contacts_ids || []);

    // Si on a des emails directs, on cherche s'ils correspondent à des contacts existants
    if (directEmailsList.length > 0) {
      const existants = await Contact.findAll({
        where: { email: { [Op.in]: directEmailsList } },
        attributes: ['id'],
      });
      existants.forEach((c) => allManualIds.add(c.id));

      // Les emails qui n'existent pas encore comptent aussi (ils seront créés à l'envoi)
      const existantEmails = new Set(
        await Contact.findAll({
          where: { email: { [Op.in]: directEmailsList } },
          attributes: ['email'],
        }).then((res) => res.map((r) => r.email))
      );
      const aCreerCount = directEmailsList.filter((e) => !existantEmails.has(e)).length;
      count += aCreerCount;
    }

    const hasCriteria =
      (tags_ids && tags_ids.length > 0) || segment_id || (where && Object.keys(where).length > 0);

    if (allManualIds.size > 0) {
      const extra = await Contact.findAll({ where: { id: { [Op.in]: Array.from(allManualIds) } } });
      const sampleMap = new Map(sample.map((c) => [c.id, c]));
      extra.forEach((c) => sampleMap.set(c.id, c));
      sample = Array.from(sampleMap.values()).slice(0, 100);

      const orConditions = [{ id: { [Op.in]: Array.from(allManualIds) } }];
      if (hasCriteria) {
        orConditions.push(whereClause);
      }

      count =
        (await Contact.count({
          where: orConditions.length > 1 ? { [Op.or]: orConditions } : orConditions[0],
          include: include.length > 0 ? include : undefined,
          distinct: true,
        })) + directEmailsList.filter((e) => !new Set(sample.map((s) => s.email)).has(e)).length;
    }

    logger.debug('Final result - Total contacts:', contacts.length);
    logger.debug(
      'Final contacts sample:',
      contacts.slice(0, 3).map((c) => ({
        id: c.id,
        email: c.email,
        nom: c.nom,
        prenom: c.prenom,
        tags: c.tags ? c.tags.map((t) => t.nom) : [],
      }))
    );
    logger.debug('=== END DEBUG ===\n');

    res.json({
      nombre_destinataires: count + (contacts_ids?.length ? 0 : 0),
      contacts: sample.map((c) => ({
        id: c.id,
        email: c.email,
        nom: c.nom,
        prenom: c.prenom,
        handicap: c.handicap,
        ville: c.ville,
        type_client: c.type_client,
      })),
    });
  } catch (error) {
    logger.error('Erreur calculer destinataires:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// Récupérer les statistiques d'une campagne avec analyses avancées
const getStatistiques = async (req, res) => {
  try {
    const { id } = req.params;
    const light = req.query.light === '1' || req.query.light === 'true';

    const campagne = await CampagneEmail.findByPk(id);
    if (!campagne) {
      return res.status(404).json({ message: 'Campagne non trouvée' });
    }

    const statistiques = await StatistiqueCampagne.findOne({ where: { campagne_id: id } });

    let envois = [];
    let statsEnTempsReel = {
      total: 0,
      envoyes: 0,
      erreurs: 0,
      ouverts: 0,
      clics: 0,
      taux_ouverture: 0,
      taux_clic: 0,
    };

    if (light) {
      // Optimized counts without fetching all envois
      const [total, envoyes, erreurs, ouverts, clics] = await Promise.all([
        EnvoiEmail.count({ where: { campagne_id: id } }),
        EnvoiEmail.count({ where: { campagne_id: id, statut: 'envoyé' } }),
        EnvoiEmail.count({ where: { campagne_id: id, statut: 'erreur' } }),
        EnvoiEmail.count({ where: { campagne_id: id, date_ouverture: { [Op.not]: null } } }),
        EnvoiEmail.count({ where: { campagne_id: id, date_clic: { [Op.not]: null } } }),
      ]);
      statsEnTempsReel = {
        total,
        envoyes,
        erreurs,
        ouverts,
        clics,
        taux_ouverture: total > 0 ? ((ouverts / total) * 100).toFixed(2) : 0,
        taux_clic: total > 0 ? ((clics / total) * 100).toFixed(2) : 0,
      };
    } else {
      // Full details (heavier)
      envois = await EnvoiEmail.findAll({
        where: { campagne_id: id },
        attributes: [
          'statut',
          'date_envoi',
          'date_ouverture',
          'date_clic',
          'ip_ouverture',
          'user_agent_ouverture',
          'pays_ouverture',
          'ville_ouverture',
        ],
        include: [
          {
            model: Contact,
            as: 'contact',
            attributes: ['id', 'email', 'nom', 'prenom', 'ville', 'handicap', 'type_client'],
          },
        ],
      });

      statsEnTempsReel = {
        total: envois.length,
        envoyes: envois.filter((e) => e.statut === 'envoyé').length,
        erreurs: envois.filter((e) => e.statut === 'erreur').length,
        ouverts: envois.filter((e) => e.date_ouverture).length,
        clics: envois.filter((e) => e.date_clic).length,
        taux_ouverture:
          envois.length > 0
            ? ((envois.filter((e) => e.date_ouverture).length / envois.length) * 100).toFixed(2)
            : 0,
        taux_clic:
          envois.length > 0
            ? ((envois.filter((e) => e.date_clic).length / envois.length) * 100).toFixed(2)
            : 0,
      };
    }

    let analysesGeo = {};
    let analysesClient = {};
    let ouverturesParHeure = {};
    if (!light) {
      // Only compute heavy analyses in non-light mode
      analysesGeo = envois
        .filter((e) => e.pays_ouverture)
        .reduce((acc, e) => {
          const pays = e.pays_ouverture;
          if (!acc[pays]) acc[pays] = { ouverts: 0, total: 0 };
          acc[pays].ouverts++;
          acc[pays].total++;
          return acc;
        }, {});

      analysesClient = envois
        .filter((e) => e.contact && e.contact.type_client)
        .reduce((acc, e) => {
          const type = e.contact.type_client;
          if (!acc[type]) acc[type] = { ouverts: 0, total: 0 };
          if (e.date_ouverture) acc[type].ouverts++;
          acc[type].total++;
          return acc;
        }, {});

      ouverturesParHeure = envois
        .filter((e) => e.date_ouverture)
        .reduce((acc, e) => {
          const heure = new Date(e.date_ouverture).getHours();
          acc[heure] = (acc[heure] || 0) + 1;
          return acc;
        }, {});
    }

    res.json({
      campagne: {
        id: campagne.id,
        titre: campagne.titre,
        statut: campagne.statut,
        date_envoi: campagne.date_envoi,
        nb_envoyes: campagne.nb_envoyes,
        nb_erreurs: campagne.nb_erreurs,
        type_campagne: campagne.type_campagne,
        priorite: campagne.priorite,
      },
      statistiques: statistiques || {},
      stats_en_temps_reel: statsEnTempsReel,
      analyses_avancees: light
        ? undefined
        : {
            geographiques: analysesGeo,
            par_type_client: analysesClient,
            ouvertures_par_heure: ouverturesParHeure,
          },
      envois: light ? undefined : envois.slice(0, 100),
    });
  } catch (error) {
    logger.error('Erreur getStatistiques:', error);
    res.status(500).json({
      message: 'Erreur lors de la récupération des statistiques',
      error: error.message,
    });
  }
};

// Nouvelle fonction : Dupliquer une campagne
const dupliquer = async (req, res) => {
  try {
    const { id } = req.params;
    const { nouveau_titre, date_programmation } = req.body;

    const campagneOriginale = await CampagneEmail.findByPk(id);
    if (!campagneOriginale) {
      return res.status(404).json({ message: 'Campagne non trouvée' });
    }

    // Créer une copie de la campagne
    const campagneDupliquee = await CampagneEmail.create({
      titre: nouveau_titre || `${campagneOriginale.titre} (Copie)`,
      sujet: campagneOriginale.sujet,
      contenu_html: campagneOriginale.contenu_html,
      contenu_texte: campagneOriginale.contenu_texte,
      type_campagne: campagneOriginale.type_campagne,
      priorite: campagneOriginale.priorite,
      segment_id: campagneOriginale.segment_id,
      tags_ids: campagneOriginale.tags_ids,
      contacts_ids: campagneOriginale.contacts_ids,
      parametres: {
        ...campagneOriginale.parametres,
        campagne_originale_id: campagneOriginale.id,
        dupliquee_le: new Date().toISOString(),
      },
      createur_id: req.user.id,
      date_creation: new Date(),
      statut: 'brouillon',
      date_programmation: date_programmation ? new Date(date_programmation) : null,
    });

    // Créer les statistiques initiales
    await StatistiqueCampagne.create({
      campagne_id: campagneDupliquee.id,
      nb_envoyes: 0,
      nb_ouverts: 0,
      nb_clics: 0,
      nb_desabonnements: 0,
    });

    res.status(201).json({
      message: 'Campagne dupliquée avec succès',
      campagne: await CampagneEmail.findByPk(campagneDupliquee.id, {
        include: [
          { model: Utilisateur, as: 'createur', attributes: ['id', 'nom', 'email'] },
          { model: Segment, as: 'segment' },
          { model: StatistiqueCampagne, as: 'statistiques' },
        ],
      }),
    });
  } catch (error) {
    logger.error('Erreur dupliquer campagne:', error);
    res.status(500).json({
      message: 'Erreur lors de la duplication de la campagne',
      error: error.message,
    });
  }
};

// Nouvelle fonction : Obtenir les performances par période
const getPerformancesParPeriode = async (req, res) => {
  try {
    const { id } = req.params;
    const { periode = '7j' } = req.query; // 7j, 30j, 90j, 1an

    const campagne = await CampagneEmail.findByPk(id);
    if (!campagne) {
      return res.status(404).json({ message: 'Campagne non trouvée' });
    }

    let dateDebut;
    const maintenant = new Date();

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
        dateDebut = new Date(maintenant.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Récupérer les envois de la période
    const envois = await EnvoiEmail.findAll({
      where: {
        campagne_id: id,
        date_envoi: { [Op.gte]: dateDebut },
      },
      attributes: ['date_envoi', 'date_ouverture', 'date_clic', 'statut'],
    });

    // Grouper par jour
    const performancesParJour = {};
    envois.forEach((envoi) => {
      const jour = new Date(envoi.date_envoi).toISOString().split('T')[0];
      if (!performancesParJour[jour]) {
        performancesParJour[jour] = {
          envoyes: 0,
          ouverts: 0,
          clics: 0,
          erreurs: 0,
        };
      }

      performancesParJour[jour].envoyes++;
      if (envoi.date_ouverture) performancesParJour[jour].ouverts++;
      if (envoi.date_clic) performancesParJour[jour].clics++;
      if (envoi.statut === 'erreur') performancesParJour[jour].erreurs++;
    });

    // Convertir en tableau pour les graphiques
    const donneesGraphique = Object.keys(performancesParJour).map((jour) => ({
      date: jour,
      ...performancesParJour[jour],
      taux_ouverture:
        performancesParJour[jour].envoyes > 0
          ? ((performancesParJour[jour].ouverts / performancesParJour[jour].envoyes) * 100).toFixed(
              2
            )
          : 0,
      taux_clic:
        performancesParJour[jour].envoyes > 0
          ? ((performancesParJour[jour].clics / performancesParJour[jour].envoyes) * 100).toFixed(2)
          : 0,
    }));

    res.json({
      campagne_id: id,
      periode,
      date_debut: dateDebut,
      date_fin: maintenant,
      performances: donneesGraphique,
      total: {
        envoyes: envois.length,
        ouverts: envois.filter((e) => e.date_ouverture).length,
        clics: envois.filter((e) => e.date_clic).length,
        erreurs: envois.filter((e) => e.statut === 'erreur').length,
      },
    });
  } catch (error) {
    logger.error('Erreur getPerformancesParPeriode:', error);
    res.status(500).json({
      message: 'Erreur lors de la récupération des performances',
      error: error.message,
    });
  }
};

const uploadAttachment = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Fichier manquant' });
    }
    return res.json({
      id: req.file.filename,
      name: req.file.originalname || req.file.filename,
      size: req.file.size,
      mimeType: req.file.mimetype,
      storedPath: req.file.path.replace(/\\/g, '/'),
    });
  } catch (error) {
    logger.error('Erreur upload attachment:', error);
    return res
      .status(500)
      .json({ message: 'Erreur lors du téléversement de la pièce jointe', error: error.message });
  }
};

const downloadAttachment = async (req, res) => {
  try {
    const safeName = path.basename(req.params.id || '');
    if (!safeName) return res.status(400).send('Nom de fichier invalide');
    const filePath = path.join(ATTACHMENTS_DIR, safeName);
    if (!fs.existsSync(filePath)) {
      return res.status(404).send('Fichier introuvable');
    }
    res.sendFile(filePath);
  } catch (error) {
    logger.error('Erreur download attachment:', error);
    res.status(500).send('Erreur lors du téléchargement');
  }
};

// Get follow-up groups for a sent campaign based on engagement behavior
const getFollowupGroups = async (req, res) => {
  try {
    const { id } = req.params;

    const campagne = await CampagneEmail.findByPk(id);
    if (!campagne) {
      return res.status(404).json({ message: 'Campagne non trouvée' });
    }
    if (campagne.statut !== 'envoyée') {
      return res
        .status(400)
        .json({ message: 'Seules les campagnes envoyées ont des groupes de suivi' });
    }

    const envois = await EnvoiEmail.findAll({
      where: { campagne_id: id },
      attributes: ['contact_id', 'statut', 'date_ouverture', 'date_clic'],
      include: [
        {
          model: Contact,
          as: 'contact',
          attributes: ['id', 'nom', 'prenom', 'email'],
        },
      ],
    });

    const clickers = [];
    const openers = [];
    const nonOpeners = [];
    const errors = [];

    for (const envoi of envois) {
      if (!envoi.contact) continue;
      const contactInfo = {
        id: envoi.contact_id,
        nom: envoi.contact.nom,
        prenom: envoi.contact.prenom,
        email: envoi.contact.email,
      };

      if (['bounce', 'erreur', 'spam'].includes(envoi.statut)) {
        errors.push(contactInfo);
      } else if (envoi.date_clic) {
        clickers.push(contactInfo);
      } else if (envoi.date_ouverture) {
        openers.push(contactInfo);
      } else {
        nonOpeners.push(contactInfo);
      }
    }

    res.json({
      campaign_id: parseInt(id),
      campaign_titre: campagne.titre,
      groups: {
        clickers: {
          label: 'Cliqueurs',
          description: 'Ont ouvert ET cliqué — vos contacts les plus engagés',
          emoji: '🔥',
          count: clickers.length,
          contact_ids: clickers.map((c) => c.id),
          contacts: clickers.slice(0, 5),
        },
        openers: {
          label: 'Ouvreurs sans clic',
          description: "Ont ouvert mais n'ont pas cliqué — essayez un autre CTA",
          emoji: '👀',
          count: openers.length,
          contact_ids: openers.map((c) => c.id),
          contacts: openers.slice(0, 5),
        },
        non_openers: {
          label: 'Non-ouvreurs',
          description: "N'ont pas ouvert — relancez avec un autre objet",
          emoji: '😴',
          count: nonOpeners.length,
          contact_ids: nonOpeners.map((c) => c.id),
          contacts: nonOpeners.slice(0, 5),
        },
        errors: {
          label: 'Erreurs / Bounces',
          description: 'Emails non délivrés — vérifiez les adresses',
          emoji: '❌',
          count: errors.length,
          contact_ids: errors.map((c) => c.id),
          contacts: errors.slice(0, 5),
        },
      },
    });
  } catch (error) {
    logger.error('Erreur getFollowupGroups:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// Envoyer un email de test sans ID de campagne (depuis le wizard avant sauvegarde)
const testSendDirect = async (req, res) => {
  try {
    const { email_test, sujet, contenu_html } = req.body;
    if (!email_test || !sujet || !contenu_html) {
      return res.status(400).json({ message: 'email_test, sujet et contenu_html sont requis' });
    }
    const fakeCampagne = { sujet, contenu_html, contenu_texte: null };
    await emailService.envoyerTest(email_test, fakeCampagne);
    res.json({ message: 'Email de test envoyé avec succès' });
  } catch (error) {
    logger.error('Erreur envoi test direct:', error);
    res.status(500).json({ message: "Erreur lors de l'envoi du test", error: error.message });
  }
};

const checkLinks = async (req, res) => {
  try {
    const { urls } = req.body;
    if (!Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({ message: 'urls array required' });
    }
    const https = require('https');
    const http = require('http');
    const MAX = 20;
    const toCheck = urls.slice(0, MAX).filter(u => /^https?:\/\//i.test(u));

    const checkOne = (url) => new Promise((resolve) => {
      const timeout = setTimeout(() => resolve({ url, status: 'timeout', ok: false }), 5000);
      const lib = url.startsWith('https') ? https : http;
      try {
        const req = lib.request(url, { method: 'HEAD', timeout: 5000 }, (r) => {
          clearTimeout(timeout);
          resolve({ url, status: r.statusCode, ok: r.statusCode >= 200 && r.statusCode < 400 });
        });
        req.on('error', () => { clearTimeout(timeout); resolve({ url, status: 'error', ok: false }); });
        req.end();
      } catch { clearTimeout(timeout); resolve({ url, status: 'error', ok: false }); }
    });

    const results = await Promise.all(toCheck.map(checkOne));
    res.json({ results });
  } catch (error) {
    logger.error('Erreur check-links:', error);
    res.status(500).json({ message: 'Erreur vérification liens', error: error.message });
  }
};

const getOptimalSendTime = async (req, res) => {
  try {
    const envois = await EnvoiEmail.findAll({
      where: { club_id: req.clubId, date_ouverture: { [Op.not]: null } },
      attributes: ['date_ouverture'],
    });

    if (envois.length < 10) {
      return res.json({ suggestion: null, totalOpens: envois.length, reason: 'insufficient_data' });
    }

    const slots = {};
    envois.forEach(e => {
      const d = new Date(e.date_ouverture);
      const key = `${d.getDay()}_${d.getHours()}`;
      slots[key] = (slots[key] || 0) + 1;
    });

    const DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const sorted = Object.entries(slots)
      .map(([key, count]) => {
        const [day, hour] = key.split('_').map(Number);
        return { day, hour, count, label: `${DAYS[day]} ${String(hour).padStart(2, '0')}h00` };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    const top = sorted[0];
    const avg = envois.length / Object.keys(slots).length;
    const boostPct = avg > 0 ? Math.max(0, Math.round(((top.count - avg) / avg) * 100)) : 0;

    res.json({
      suggestion: { label: top.label, day: top.day, hour: top.hour, count: top.count, boostPct },
      slots: sorted,
      totalOpens: envois.length,
    });
  } catch (err) {
    logger.error('getOptimalSendTime error:', err);
    res.status(500).json({ message: 'Erreur lors du calcul du créneau optimal' });
  }
};

module.exports = {
  getAll,
  getOne,
  create,
  update,
  remove,
  programmer,
  annuler,
  envoyer,
  envoyerTest,
  testSendDirect,
  calculerDestinataires,
  getStatistiques,
  dupliquer,
  getPerformancesParPeriode,
  uploadAttachment,
  downloadAttachment,
  buildContactQueryFromCriteria,
  getFollowupGroups,
  checkLinks,
  getOptimalSendTime,
};
