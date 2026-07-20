const nodemailer = require('nodemailer');
const logger = require('../utils/logger');
const fetch = (...args) => import('node-fetch').then((module) => module.default(...args));
const fs = require('fs');
const path = require('path');
const { ClientSecretCredential } = require('@azure/identity');
const { Client } = require('@microsoft/microsoft-graph-client');
const {
  CampagneEmail,
  Contact,
  EnvoiEmail,
  StatistiqueCampagne,
  Club,
  sequelize,
} = require('../models');
const { Op } = require('sequelize');
const emailConfig = require('../config/email');
const { getPublicBaseUrl } = require('../utils/url');

class EmailService {
  constructor() {
    this.transporter = null;
    this.graphClient = null;
    this._graphCredential = null;
    this._redis = null;
    if (process.env.REDIS_HOST || process.env.REDIS_URL) {
      try {
        const Redis = require('ioredis');
        this._redis = new Redis(
          process.env.REDIS_URL || {
            host: process.env.REDIS_HOST || '127.0.0.1',
            port: Number(process.env.REDIS_PORT || 6379),
            lazyConnect: true,
            enableReadyCheck: false,
            maxRetriesPerRequest: null,
          }
        );
        this._redis.on('error', (err) =>
          logger.warn('[EMAIL] Redis error (Graph token cache degraded):', err.message)
        );
      } catch (err) {
        logger.warn('[EMAIL] ioredis unavailable — Graph token cache disabled:', err.message);
      }
    }
    this.initTransporter();
  }

  async initTransporter() {
    try {
      const provider = emailConfig.provider || 'smtp';
      const nodeEnv = process.env.NODE_ENV || 'development';

      if (provider === 'mock' || nodeEnv === 'test') {
        logger.debug('Service email en mode mock — envois désactivés (tests/CI)');
        this.transporter = null;
        return;
      }

      if (provider === 'graph') {
        const { tenantId, clientId, clientSecret } = emailConfig.graph || {};
        if (!tenantId || !clientId || !clientSecret) {
          throw new Error(
            'Configuration Graph incomplète: GRAPH_TENANT_ID, GRAPH_CLIENT_ID, GRAPH_CLIENT_SECRET requis'
          );
        }

        const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
        this._graphCredential = credential;
        this.graphClient = Client.initWithMiddleware({
          authProvider: {
            getAccessToken: async () => {
              const token = await credential.getToken('https://graph.microsoft.com/.default');
              return token.token;
            },
          },
        });
        logger.debug(`Service email initialisé via Microsoft Graph (${nodeEnv})`);
      } else {
        const hasSmtpCreds = !!(
          process.env.SMTP_USER ||
          (emailConfig.smtp && emailConfig.smtp.auth && emailConfig.smtp.auth.user)
        );
        if (hasSmtpCreds) {
          this.transporter = nodemailer.createTransport(emailConfig.smtp);
          await this.transporter.verify();
          logger.debug(`Service email initialisé via SMTP (${nodeEnv})`);
        } else {
          // Fallback développement: MailHog/serveur local
          this.transporter = nodemailer.createTransport(emailConfig.development);
          logger.debug('Mode développement: emails capturés localement (MailHog)');
        }
      }
    } catch (error) {
      logger.error("Erreur lors de l'initialisation du service email:", error);
      this.transporter = null;
    }
  }

  // Replace local media URLs with CID inline attachments for Graph
  _extractInlineImagesForGraph(html) {
    try {
      const uploadsDir = path.join(__dirname, '..', 'uploads');
      const baseUrl = getPublicBaseUrl().replace(/\/+$/, '');
      const regex = /<img\s+[^>]*src=["']([^"']+)["'][^>]*>/gi;
      const attachments = [];
      let next = html;
      let match;

      while ((match = regex.exec(html)) !== null) {
        const fullTag = match[0];
        const url = match[1] || '';

        let safeName = null;
        // Handle absolute local URLs
        if (baseUrl && url.startsWith(baseUrl)) {
          const pathPart = url.substring(baseUrl.length);
          const mediaMatch = pathPart.match(
            /\/api\/(templates\/media|campagne\/attachments)\/([^"'\s?#]+)/
          );
          if (mediaMatch) safeName = mediaMatch[2];
        }
        // Handle relative URLs
        else if (url.startsWith('/api/')) {
          const mediaMatch = url.match(
            /\/api\/(templates\/media|campagne\/attachments)\/([^"'\s?#]+)/
          );
          if (mediaMatch) safeName = mediaMatch[2];
        }

        if (!safeName) continue;

        const filePath = path.join(uploadsDir, safeName);
        if (!fs.existsSync(filePath)) {
          logger.warn(`[INLINE-GRAPH] File not found on disk: ${filePath}`);
          continue;
        }

        const contentId = `img-${safeName.replace(/[^a-zA-Z0-9]/g, '')}`;
        const data = fs.readFileSync(filePath).toString('base64');

        attachments.push({
          '@odata.type': '#microsoft.graph.fileAttachment',
          name: safeName,
          isInline: true,
          contentId,
          contentBytes: data,
        });

        logger.debug(`[INLINE-GRAPH] Inlining image: ${safeName} as ${contentId}`);

        // Outlook Fix: Ensure width attribute exists and is numeric
        let updatedTag = fullTag.replace(url, `cid:${contentId}`);
        if (!updatedTag.includes(' width=')) {
          const styleWidthMatch = updatedTag.match(/width:\s*(\d+)(px|%)/i);
          if (styleWidthMatch) {
            const val = styleWidthMatch[1];
            // if percent, we'll use 600 as base (standard container)
            const numericWidth =
              styleWidthMatch[2] === '%' ? Math.round(600 * (parseInt(val) / 100)) : val;
            updatedTag = updatedTag.replace('<img', `<img width="${numericWidth}"`);
          } else {
            updatedTag = updatedTag.replace('<img', `<img width="600"`);
          }
        }

        next = next.replace(fullTag, updatedTag);
      }
      return { html: next, attachments };
    } catch (error) {
      logger.error('Error extracting images for Graph:', error);
      return { html, attachments: [] };
    }
  }

  // General helper to inline local images for SMTP and fix Outlook-specific layout issues
  _processImagesAndInlining(html) {
    const attachments = [];
    try {
      const uploadsDir = path.join(__dirname, '..', 'uploads');
      const baseUrl = getPublicBaseUrl().replace(/\/+$/, '');
      const regex = /<img\s+[^>]*src=["']([^"']+)["'][^>]*>/gi;
      let next = html;
      let match;

      while ((match = regex.exec(html)) !== null) {
        const fullTag = match[0];
        const url = match[1] || '';

        let safeName = null;
        if (baseUrl && url.startsWith(baseUrl)) {
          const pathPart = url.substring(baseUrl.length);
          const mediaMatch = pathPart.match(
            /\/api\/(templates\/media|campagne\/attachments)\/([^"'\s?#]+)/
          );
          if (mediaMatch) safeName = mediaMatch[2];
        } else if (url.startsWith('/api/')) {
          const mediaMatch = url.match(
            /\/api\/(templates\/media|campagne\/attachments)\/([^"'\s?#]+)/
          );
          if (mediaMatch) safeName = mediaMatch[2];
        }

        if (!safeName) continue;

        const filePath = path.join(uploadsDir, safeName);
        if (!fs.existsSync(filePath)) {
          logger.warn(`[INLINE-SMTP] File not found on disk: ${filePath}`);
          continue;
        }

        const contentId = `img-${safeName.replace(/[^a-zA-Z0-9]/g, '')}`;
        logger.debug(`[INLINE-SMTP] Inlining image: ${safeName} as ${contentId}`);
        attachments.push({
          filename: safeName,
          path: filePath,
          cid: contentId,
        });

        // Update tag: replace src with cid and ensure Outlook-compatible width
        let updatedTag = fullTag.replace(/src=["']([^"']+)["']/i, `src="cid:${contentId}"`);

        // Outlook Fix: word renderer ignores max-width and percentage widths on images
        // We inject a fixed width if possible
        if (!updatedTag.includes(' width=')) {
          const styleWidthMatch = updatedTag.match(/width:\s*(\d+)(px|%)/i);
          if (styleWidthMatch) {
            const val = styleWidthMatch[1];
            // if percent, we'll use 600 as base (standard container)
            const numericWidth =
              styleWidthMatch[2] === '%' ? Math.round(600 * (parseInt(val) / 100)) : val;
            updatedTag = updatedTag.replace('<img', `<img width="${numericWidth}"`);
          }
        }

        // Ensure display block for alignment
        if (!updatedTag.includes('display:')) {
          updatedTag = updatedTag.replace('style="', 'style="display:block;');
        }

        next = next.replace(fullTag, updatedTag);
      }
      return { html: next, attachments };
    } catch (error) {
      logger.error('Error processing images for inlining:', error);
      return { html, attachments: [] };
    }
  }

  _getCampaignAttachments(campagne) {
    try {
      // Parser les paramètres si c'est une chaîne JSON
      let parametres = campagne?.parametres;
      try {
        parametres = typeof parametres === 'string' ? JSON.parse(parametres) : parametres;
        // Security: handle double-stringified values if they occurred
        if (typeof parametres === 'string') {
          parametres = JSON.parse(parametres);
        }
        logger.debug('[ATTACHMENTS] Parsed parametres');
      } catch (e) {
        logger.error('[ATTACHMENTS] Error parsing parametres JSON:', e.message);
        return [];
      }

      const metas = parametres?.attachments;
      if (!Array.isArray(metas) || !metas.length) {
        logger.debug('[ATTACHMENTS] No attachments found in campagne.parametres.attachments');
        return [];
      }

      logger.debug(`[ATTACHMENTS] Found ${metas.length} attachment(s) in campagne ${campagne.id}`);

      return metas
        .map((meta, index) => {
          try {
            // Essayer plusieurs chemins possibles
            const storedPath = meta?.storedPath || meta?.path || meta?.absolutePath;
            if (!storedPath) {
              logger.warn(`[ATTACHMENTS] Attachment ${index} has no path:`, meta);
              return null;
            }

            // Normaliser le chemin - garder les backslashes pour Windows
            let diskPath = storedPath;

            // Essayer le chemin tel quel (absolu)
            if (fs.existsSync(diskPath)) {
              logger.debug(`[ATTACHMENTS] Found attachment ${index} at absolute path: ${diskPath}`);
            } else {
              // Essayer avec path.resolve pour normaliser
              const resolvedPath = path.resolve(storedPath);
              if (fs.existsSync(resolvedPath)) {
                diskPath = resolvedPath;
                logger.debug(
                  `[ATTACHMENTS] Found attachment ${index} at resolved path: ${diskPath}`
                );
              } else {
                // Essayer comme chemin relatif depuis le backend
                const relativePath = path.join(__dirname, '..', storedPath);
                if (fs.existsSync(relativePath)) {
                  diskPath = relativePath;
                  logger.debug(
                    `[ATTACHMENTS] Found attachment ${index} at relative path: ${diskPath}`
                  );
                } else {
                  // Essayer dans le dossier uploads/campaign-attachments avec le nom de fichier
                  const filename = path.basename(storedPath);
                  const attachmentsDir = path.join(
                    __dirname,
                    '..',
                    'uploads',
                    'campaign-attachments'
                  );
                  const fallbackPath = path.join(attachmentsDir, filename);
                  if (fs.existsSync(fallbackPath)) {
                    diskPath = fallbackPath;
                    logger.debug(
                      `[ATTACHMENTS] Found attachment ${index} in attachments dir: ${diskPath}`
                    );
                  } else {
                    // Dernière tentative: utiliser l'ID si disponible
                    if (meta?.id) {
                      const idPath = path.join(attachmentsDir, meta.id);
                      if (fs.existsSync(idPath)) {
                        diskPath = idPath;
                        logger.debug(`[ATTACHMENTS] Found attachment ${index} by ID: ${diskPath}`);
                      } else {
                        logger.error(`[ATTACHMENTS] Attachment ${index} not found at any path:`, {
                          storedPath,
                          resolvedPath,
                          relativePath,
                          fallbackPath,
                          idPath,
                          meta,
                        });
                        return null;
                      }
                    } else {
                      logger.error(`[ATTACHMENTS] Attachment ${index} not found at any path:`, {
                        storedPath,
                        resolvedPath,
                        relativePath,
                        fallbackPath,
                        meta,
                      });
                      return null;
                    }
                  }
                }
              }
            }

            const buffer = fs.readFileSync(diskPath);
            const attachment = {
              name: meta?.name || meta?.filename || path.basename(diskPath),
              mimeType: meta?.mimeType || meta?.mimeType || 'application/octet-stream',
              content: buffer,
            };

            logger.debug(
              `[ATTACHMENTS] Successfully loaded attachment ${index}: ${attachment.name} (${buffer.length} bytes, ${attachment.mimeType})`
            );
            return attachment;
          } catch (e) {
            logger.error(`[ATTACHMENTS] Error loading attachment ${index}:`, e.message);
            return null;
          }
        })
        .filter(Boolean);
    } catch (e) {
      logger.error('[ATTACHMENTS] Error in _getCampaignAttachments:', e.message);
      return [];
    }
  }

  async envoyerCampagne(campagneId) {
    try {
      const campagne = await CampagneEmail.findByPk(campagneId, {
        include: [{ model: StatistiqueCampagne, as: 'statistiques' }],
      });

      // Fetch the owning Club so per-tenant Graph credentials are available
      // during send. Club is not tenant-scoped itself so no context needed.
      const club = campagne ? await Club.findByPk(campagne.club_id) : null;

      if (!campagne) {
        throw new Error('Campagne non trouvée');
      }

      // Log pour déboguer les paramètres et pièces jointes
      logger.debug(`[CAMPAGNE] Loading campagne ${campagneId}`);
      logger.debug(`[CAMPAGNE] Parametres type:`, typeof campagne.parametres);

      // Parser les paramètres si c'est une chaîne JSON
      let parametres = campagne.parametres;
      if (typeof parametres === 'string') {
        try {
          parametres = JSON.parse(parametres);
          // Handle double-stringification
          if (typeof parametres === 'string') {
            parametres = JSON.parse(parametres);
          }
        } catch (e) {
          logger.error(`[CAMPAGNE] Error parsing parametres:`, e.message);
        }
      }

      // Limit logging of large parameters
      const loggedParams = parametres ? { ...parametres } : {};
      if (loggedParams.attachments) loggedParams.attachmentsCount = loggedParams.attachments.length;
      delete loggedParams.attachments; // Don't log full attachment meta

      logger.debug(`[CAMPAGNE] Parametres partial summary:`, JSON.stringify(loggedParams));

      // Autoriser "envoyer maintenant" depuis un brouillon en le basculant automatiquement
      if (campagne.statut === 'brouillon') {
        await campagne.update({
          statut: 'programmée',
          date_programmation: campagne.date_programmation || new Date(),
        });
      }

      // Mettre à jour le statut de manière atomique pour éviter le traitement par plusieurs instances concurrentes (cluster)
      const [updatedRowsCount] = await CampagneEmail.update(
        { statut: 'en_cours', date_envoi: new Date() },
        { where: { id: campagneId, statut: 'programmée' } }
      );

      if (updatedRowsCount === 0) {
        throw new Error("La campagne est déjà en cours d'envoi ou n'est plus programmée");
      }

      // Rafraîchir l'instance en mémoire
      await campagne.reload();

      // Récupérer les destinataires
      const destinataires = await this.getDestinataires(campagne);

      if (destinataires.length === 0) {
        await campagne.update({ statut: 'erreur' });
        throw new Error('Aucun destinataire trouvé pour cette campagne');
      }

      // Créer les enregistrements d'envoi
      const envois = await this.creerEnvois(campagne, destinataires);

      // Envoyer les emails avec limitation de débit
      let nbEnvoyes = 0;
      let nbErreurs = 0;
      const batchSize = emailConfig.limits.emailsPerSecond;
      const delayBetweenBatches = 1000; // 1 seconde

      for (let i = 0; i < envois.length; i += batchSize) {
        const batch = envois.slice(i, i + batchSize);

        // Envoyer le lot d'emails en parallèle
        const promises = batch.map((envoi) => this.envoyerEmailAvecRetry(campagne, envoi, 0, club));
        const results = await Promise.allSettled(promises);

        // Compter les résultats
        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            nbEnvoyes++;
          } else {
            nbErreurs++;
            logger.error(`Erreur envoi email ${batch[index].email_destinataire}:`, result.reason);
          }
        });

        // Pause entre les lots pour respecter la limitation de débit
        if (i + batchSize < envois.length) {
          await this.delay(delayBetweenBatches);
        }
      }

      // Mettre à jour la campagne
      await campagne.update({
        statut: 'envoyée',
        nb_envoyes: nbEnvoyes,
        nb_erreurs: nbErreurs,
      });

      // Mettre à jour ou créer les statistiques
      await this.mettreAJourStatistiques(campagne, nbEnvoyes, nbErreurs);

      // Mettre à jour les statistiques en temps réel
      await this.mettreAJourStatistiquesTempsReel(campagne.id);

      return {
        success: true,
        nbEnvoyes,
        nbErreurs,
        message: `Campagne envoyée: ${nbEnvoyes} emails, ${nbErreurs} erreurs`,
      };
    } catch (error) {
      logger.error("Erreur lors de l'envoi de la campagne:", error);

      // Remettre la campagne en statut programmée en cas d'erreur
      try {
        await CampagneEmail.update({ statut: 'programmée' }, { where: { id: campagneId } });
      } catch (updateError) {
        logger.error('Erreur lors de la remise en statut programmée:', updateError);
      }

      throw error;
    }
  }

  async envoyerEmailAvecRetry(campagne, envoi, retryCount = 0, club = null) {
    try {
      const result = await this.envoyerEmail(campagne, envoi, club);
      try {
        logger.debug(
          `[MAIL][OK] campagne=${campagne.id} envoi=${envoi.id} to=${envoi.email_destinataire} provider=${emailConfig.provider || 'smtp'} result=${result?.messageId || result?.success || 'ok'}`
        );
      } catch {}
      await envoi.update({
        statut: 'envoyé',
        date_envoi: new Date(),
      });
      return result;
    } catch (error) {
      if (retryCount < emailConfig.limits.maxRetries) {
        // Attendre avant de réessayer
        await this.delay(emailConfig.limits.retryDelay);
        return this.envoyerEmailAvecRetry(campagne, envoi, retryCount + 1, club);
      } else {
        // Échec définitif
        await envoi.update({
          statut: 'erreur',
          message_erreur: error.message,
        });
        try {
          logger.error(
            `[MAIL][ERR] campagne=${campagne.id} envoi=${envoi.id} to=${envoi.email_destinataire} provider=${emailConfig.provider || 'smtp'} error=${error.message}`
          );
        } catch {}
        throw error;
      }
    }
  }

  async getDestinataires(campagne) {
    let contacts = [];
    const { Op } = require('sequelize');
    const { Segment, Tag } = require('../models');

    // Prendre en compte les paramètres d'audience stockés en base
    const audience = campagne.parametres?.audience;
    const audienceCategoryId =
      campagne.parametres?.category_id || campagne.parametres?.category_id_fallback;
    const audienceDistributionId =
      campagne.parametres?.distribution_id || campagne.parametres?.distribution_id_fallback;
    const audienceWhere = campagne.parametres?.where;

    let baseWhere = { actif: true };
    if (audience === 'all' && !campagne.segment_id && !campagne.tags_ids) {
      return await Contact.findAll({ where: baseWhere });
    }
    if (
      audience === 'category' &&
      audienceCategoryId &&
      !campagne.segment_id &&
      !campagne.tags_ids
    ) {
      return await Contact.findAll({ where: { ...baseWhere, category_id: audienceCategoryId } });
    }
    if (
      audience === 'distribution' &&
      audienceDistributionId &&
      !campagne.segment_id &&
      !campagne.tags_ids
    ) {
      return await Contact.findAll({
        where: { ...baseWhere, distribution_id: audienceDistributionId },
      });
    }
    if (audience === 'custom' && audienceWhere && typeof audienceWhere === 'object') {
      baseWhere = { ...baseWhere, ...audienceWhere };
    }

    // Normaliser les paramètres potentiellement sérialisés en garantissant un tableau Array pour Sequelize Op.in
    let parsedContacts = Array.isArray(campagne.contacts_ids)
      ? campagne.contacts_ids
      : typeof campagne.contacts_ids === 'string'
        ? (() => {
            try {
              return JSON.parse(campagne.contacts_ids) || [];
            } catch {
              return [];
            }
          })()
        : [];
    const contactsIds = Array.isArray(parsedContacts)
      ? parsedContacts
      : [parsedContacts].filter(Boolean);

    let parsedTags = Array.isArray(campagne.tags_ids)
      ? campagne.tags_ids
      : typeof campagne.tags_ids === 'string'
        ? (() => {
            try {
              return JSON.parse(campagne.tags_ids) || [];
            } catch {
              return [];
            }
          })()
        : [];
    const tagsIds = Array.isArray(parsedTags) ? parsedTags : [parsedTags].filter(Boolean);

    // Construire la requête de manière unifiée (comme calculerDestinataires)
    let whereClause = { ...baseWhere };
    let include = [];

    // PRIORITÉ: segment si fourni
    if (campagne.segment_id) {
      const segment = await Segment.findByPk(campagne.segment_id);
      if (segment && segment.criteres) {
        // FIX: Use standalone queryBuilder utility (eliminates circular dep: emailService → campagneController)
        const { buildContactQueryFromCriteria } = require('../utils/queryBuilder');
        const built = buildContactQueryFromCriteria(segment.criteres);
        whereClause = { ...whereClause, ...built.where };
        include = [...include, ...built.include];
      }
    } else {
      // Audience rapide sinon
      if (audience === 'category' && audienceCategoryId)
        whereClause = { ...whereClause, category_id: audienceCategoryId };
      if (audience === 'distribution' && audienceDistributionId)
        whereClause = { ...whereClause, distribution_id: audienceDistributionId };
      if (audience === 'custom' && audienceWhere && typeof audienceWhere === 'object')
        Object.assign(whereClause, audienceWhere);
    }

    // Filtrer par tags si spécifiés (en plus du segment)
    if (tagsIds && tagsIds.length > 0) {
      include.push({
        model: Tag,
        as: 'tags',
        where: { id: { [Op.in]: tagsIds } },
        through: { attributes: [] },
        required: true,
      });
    }

    // Récupérer les contacts avec la requête unifiée
    // SÉCURITÉ: On ne récupère des contacts que si une intention de ciblage est détectée
    // (segment, tags, ou audience spécifique). Sinon, on attend les contactsIds manuels.
    const hasTargeting =
      campagne.segment_id || (tagsIds && tagsIds.length > 0) || (audience && audience !== 'custom');

    if (hasTargeting) {
      // On ne lance la requête que si on a des inclusions (tags) ou des filtres supplémentaires (where)
      // Note: whereClause contient toujours { actif: true } au minimum.
      if (include.length > 0 || Object.keys(whereClause).length > 1) {
        contacts = await Contact.findAll({ where: whereClause, include, distinct: true });
      } else if (audience === 'all') {
        // Mode "Envoyer à tous" explicite
        contacts = await Contact.findAll({ where: baseWhere });
      }
    }

    // S'assurer que contacts est un tableau
    if (!Array.isArray(contacts)) {
      contacts = contacts ? [contacts] : [];
    }

    // Ajouter les contacts spécifiques
    if (contactsIds && contactsIds.length > 0) {
      const contactsSpecifiques = await Contact.findAll({
        where: {
          id: { [Op.in]: contactsIds },
          actif: true,
        },
      });
      // Utiliser les IDs pour dédupliquer
      const existingIds = new Set(contacts.map((c) => c.id));
      const newContacts = Array.isArray(contactsSpecifiques) ? contactsSpecifiques : [];
      const uniqueNew = newContacts.filter((c) => !existingIds.has(c.id));
      contacts = [...contacts, ...uniqueNew];
    }

    // S'assurer que le résultat final est un tableau
    if (!Array.isArray(contacts)) {
      contacts = contacts ? [contacts] : [];
    }

    // Appliquer la limite d'envois
    if (campagne.limite_envois && contacts.length > campagne.limite_envois) {
      contacts = contacts.slice(0, campagne.limite_envois);
    }

    return contacts;
  }

  async creerEnvois(campagne, destinataires) {
    const envois = [];
    const batchSize = 500; // bulk insert for performance
    for (let i = 0; i < destinataires.length; i += batchSize) {
      const batch = destinataires.slice(i, i + batchSize);
      const rows = batch.map((contact) => ({
        campagne_id: campagne.id,
        contact_id: contact.id,
        email_destinataire: contact.email,
        statut: 'en_attente',
        token_tracking: this.genererTokenTracking(),
        actif: true,
      }));
      const created = await EnvoiEmail.bulkCreate(rows);
      envois.push(...created);
    }
    return envois;
  }

  async envoyerEmail(campagne, envoi, club = null) {
    // Personnaliser le contenu avec tracking
    let htmlContent = await this.personnaliserContenu(campagne.contenu_html, envoi, campagne);

    // Ajouter le pixel de tracking pour les ouvertures
    htmlContent = this.ajouterPixelTracking(htmlContent, envoi.token_tracking);

    // Ajouter le tracking des clics (+ UTM)
    htmlContent = this.ajouterTrackingClics(htmlContent, envoi.token_tracking, campagne);

    // Determine effective provider: club-level override > global config > fallback smtp
    const effectiveProvider =
      club?.email_provider ||
      (club?.azure_tenant_id ? 'graph' : null) ||
      emailConfig.provider ||
      'smtp';

    if (effectiveProvider === 'graph' && club?.azure_tenant_id) {
      return this.envoyerEmailViaGraph(campagne, envoi, htmlContent, club);
    }

    const transporter = this._getTransporterForClub(club);
    const fromAddress = club?.email_from_address || emailConfig.from;
    const fromName = club?.email_from_name;
    const from = fromName ? `"${fromName}" <${fromAddress}>` : fromAddress;

    const persistentAttachments = this._getCampaignAttachments(campagne);
    logger.debug(
      `[EMAIL][SMTP] Sending to ${envoi.email_destinataire} (${persistentAttachments.length} attachments)`
    );

    const processed = this._processImagesAndInlining(htmlContent);
    htmlContent = processed.html;

    const mailOptions = {
      from,
      to: envoi.email_destinataire,
      subject: campagne.sujet,
      html: htmlContent,
      text: campagne.contenu_texte || this.htmlToText(htmlContent),
      headers: {
        'X-Mailer': 'Pylon Pyx',
        'X-Campaign-ID': campagne.id,
        'X-Contact-ID': envoi.contact_id,
        'X-Tracking-Token': envoi.token_tracking,
      },
      attachments: [
        ...persistentAttachments.map((att) => ({
          filename: att.name,
          content: att.content,
          contentType: att.mimeType,
        })),
        ...processed.attachments,
      ],
    };

    const info = await transporter.sendMail(mailOptions);
    try {
      logger.debug(
        `[SMTP] messageId=${info?.messageId} to=${envoi.email_destinataire} campagne=${campagne.id}`
      );
    } catch {}
    return info;
  }

  // Returns a nodemailer transporter configured for the given club's SMTP settings,
  // falling back to the global transporter if the club has no settings.
  _getTransporterForClub(club) {
    if (club?.smtp_host && club?.smtp_user) {
      return nodemailer.createTransport({
        host: club.smtp_host,
        port: club.smtp_port || 587,
        secure: club.smtp_secure || false,
        auth: {
          user: club.smtp_user,
          pass: club.smtp_pass || '',
        },
        tls: { rejectUnauthorized: false },
      });
    }
    return this.transporter;
  }

  // Send a diagnostic test email using the club's current (or draft) settings.
  async sendTestEmail(toEmail, club, smtpOverride = null) {
    const effectiveProvider = club?.email_provider || (club?.azure_tenant_id ? 'graph' : 'smtp');

    const fromAddress = club?.email_from_address || emailConfig.from;
    const fromName = club?.email_from_name;
    const from = fromName ? `"${fromName}" <${fromAddress}>` : fromAddress;
    const subject = '✅ Test de connexion email — Pylon Pyx';
    const html = `
      <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:32px;color:#0f172a">
        <h2 style="margin:0 0 12px;font-size:20px">Connexion email vérifiée</h2>
        <p style="color:#475569;line-height:1.6;margin:0 0 24px">
          Votre configuration email fonctionne correctement.<br>
          Les campagnes seront envoyées depuis <strong>${fromAddress}</strong>.
        </p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 24px">
        <p style="color:#94a3b8;font-size:12px;margin:0">
          Envoyé depuis <strong>Pylon Pyx</strong> — plateforme d'email marketing
        </p>
      </div>`;

    if (effectiveProvider === 'graph' && club?.azure_tenant_id) {
      await this.envoyerEmailViaGraph(
        { sujet: subject, contenu_html: html, id: 0, campagne_id: 0, attachments: null },
        { email_destinataire: toEmail, token_tracking: 'test-email', contact_id: 0 },
        html,
        club
      );
      return { success: true };
    }

    // Use override SMTP if provided (for testing unsaved draft settings)
    let transporter;
    if (smtpOverride?.host && smtpOverride?.user) {
      transporter = nodemailer.createTransport({
        host: smtpOverride.host,
        port: smtpOverride.port || 587,
        secure: smtpOverride.secure || false,
        auth: { user: smtpOverride.user, pass: smtpOverride.pass || '' },
        tls: { rejectUnauthorized: false },
      });
    } else {
      transporter = this._getTransporterForClub(club);
    }

    if (!transporter)
      throw new Error(
        "Aucun transporteur SMTP configuré. Veuillez sauvegarder vos paramètres SMTP d'abord."
      );
    const info = await transporter.sendMail({ from, to: toEmail, subject, html });
    return { success: true, messageId: info?.messageId };
  }

  // Fetch a Microsoft Graph access token for a specific tenant using the
  // shared app credentials (Client Credentials Flow).  Tokens are cached in
  // Redis for 55 minutes so we never call the token endpoint more than once
  // per token lifetime under normal load.
  async getGraphToken(tenantId) {
    const cacheKey = `graph:token:${tenantId}`;
    if (this._redis) {
      try {
        const cached = await this._redis.get(cacheKey);
        if (cached) return cached;
      } catch (_) {}
    }

    const res = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GRAPH_CLIENT_ID,
        client_secret: process.env.GRAPH_CLIENT_SECRET,
        scope: 'https://graph.microsoft.com/.default',
        grant_type: 'client_credentials',
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.access_token) {
      throw new Error(
        `Graph token error (tenant ${tenantId}): ${data.error_description || data.error || 'unknown'}`
      );
    }

    if (this._redis) {
      try {
        await this._redis.set(cacheKey, data.access_token, 'EX', 55 * 60);
      } catch (_) {}
    }
    return data.access_token;
  }

  // Multi-tenant Graph send: uses the club's own Azure tenant + mailbox.
  // Called by envoyerEmailViaGraph when club.azure_tenant_id is present.
  async _sendViaGraphTenant(campagne, envoi, htmlContent, club) {
    const accessToken = await this.getGraphToken(club.azure_tenant_id);
    const fromEmail = club.graph_from_email || emailConfig.graph?.senderEmail || emailConfig.from;

    const inline = this._extractInlineImagesForGraph(htmlContent);
    const persistentAttachments = this._getCampaignAttachments(campagne);
    logger.debug(
      `[EMAIL][GRAPH-MT] Sending to ${envoi.email_destinataire} via tenant ${club.azure_tenant_id} from ${fromEmail} — ${persistentAttachments.length} attachment(s)`
    );

    const graphAttachments = persistentAttachments.map((att) => ({
      '@odata.type': '#microsoft.graph.fileAttachment',
      name: att.name,
      isInline: false,
      contentBytes: att.content.toString('base64'),
      contentType: att.mimeType,
    }));

    const body = {
      message: {
        subject: campagne.sujet,
        body: { contentType: 'HTML', content: inline.html },
        from: { emailAddress: { address: fromEmail } },
        toRecipients: [{ emailAddress: { address: envoi.email_destinataire } }],
        internetMessageHeaders: [
          { name: 'X-Campaign-ID', value: String(campagne.id) },
          { name: 'X-Contact-ID', value: String(envoi.contact_id) },
          { name: 'X-Tracking-Token', value: envoi.token_tracking },
          ...Object.entries(emailConfig.headers || {}).map(([name, value]) => ({ name, value })),
        ],
        attachments: [...(inline.attachments || []), ...graphAttachments],
      },
      saveToSentItems: emailConfig.graph?.saveToSentItems !== false,
    };

    const resp = await fetch(
      `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(fromEmail)}/sendMail`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    if (!resp.ok) {
      let details = `HTTP ${resp.status}`;
      try {
        const errBody = await resp.json();
        details += ` — ${errBody?.error?.message || JSON.stringify(errBody)}`;
      } catch (_) {}
      logger.error(
        `[GRAPH-MT][ERR] sendMail to=${envoi.email_destinataire} campagne=${campagne.id} -> ${details}`
      );
      throw new Error(details);
    }

    logger.debug(
      `[GRAPH-MT] sendMail OK to=${envoi.email_destinataire} from=${fromEmail} campagne=${campagne.id}`
    );
    return { success: true };
  }

  async envoyerEmailViaGraph(campagne, envoi, htmlContent, club = null) {
    // Multi-tenant path: club has its own Azure AD tenant + mailbox configured
    if (club?.azure_tenant_id) {
      return this._sendViaGraphTenant(campagne, envoi, htmlContent, club);
    }

    // Legacy single-tenant path: uses env-var credentials (GRAPH_TENANT_ID etc.)
    if (!this.graphClient) {
      throw new Error('Client Graph non initialisé');
    }

    const fromEmail = emailConfig.graph?.senderEmail || emailConfig.from;
    const inline = this._extractInlineImagesForGraph(htmlContent);
    const persistentAttachments = this._getCampaignAttachments(campagne);
    logger.debug(
      `[EMAIL][GRAPH] Sending email to ${envoi.email_destinataire} with ${persistentAttachments.length} attachment(s)`
    );

    const graphAttachments = persistentAttachments.map((att) => {
      logger.debug(
        `[EMAIL][GRAPH] Attaching file: ${att.name} (${att.content.length} bytes, ${att.mimeType})`
      );
      return {
        '@odata.type': '#microsoft.graph.fileAttachment',
        name: att.name,
        isInline: false,
        contentBytes: att.content.toString('base64'),
        contentType: att.mimeType,
      };
    });
    const message = {
      message: {
        subject: campagne.sujet,
        body: {
          contentType: 'HTML',
          content: inline.html,
        },
        from: {
          emailAddress: { address: fromEmail },
        },
        toRecipients: [{ emailAddress: { address: envoi.email_destinataire } }],
        internetMessageHeaders: [
          { name: 'X-Campaign-ID', value: String(campagne.id) },
          { name: 'X-Contact-ID', value: String(envoi.contact_id) },
          { name: 'X-Tracking-Token', value: envoi.token_tracking },
          ...Object.entries(emailConfig.headers || {}).map(([name, value]) => ({ name, value })),
        ],
        attachments: [...(inline.attachments || []), ...graphAttachments],
      },
      saveToSentItems: emailConfig.graph?.saveToSentItems !== false,
    };

    // With application permissions, /me is NOT allowed. Always target a specific mailbox.
    const senderUserId = emailConfig.graph?.senderUserId;
    const senderUserPrincipal = emailConfig.graph?.senderEmail || emailConfig.from;
    const userPath = senderUserId
      ? `users/${senderUserId}`
      : senderUserPrincipal
        ? `users/${senderUserPrincipal}`
        : null;
    if (!userPath) {
      throw new Error(
        'Configuration Graph incomplète: définir graph.senderEmail ou graph.senderUserId'
      );
    }
    try {
      const resp = await this.graphClient.api(`/${userPath}/sendMail`).post(message);
      try {
        logger.debug(
          `[GRAPH] sendMail to=${envoi.email_destinataire} from=${fromEmail} campagne=${campagne.id} resp=${JSON.stringify(resp)}`
        );
      } catch {}
      return { success: true };
    } catch (error) {
      // Extraire le message d'erreur Graph détaillé si disponible
      let details = error?.message || 'Unknown Graph error';
      if (error?.code) details += ` code=${error.code}`;
      if (error?.statusCode) details += ` status=${error.statusCode}`;
      if (error?.body) {
        try {
          const parsed = typeof error.body === 'string' ? JSON.parse(error.body) : error.body;
          const msg = parsed?.error?.message || parsed?.message;
          if (msg) details += ` bodyMessage=${msg}`;
        } catch {}
      }
      logger.error(
        `[GRAPH][ERR] sendMail to=${envoi.email_destinataire} campagne=${campagne.id} -> ${details}`
      );
      throw new Error(details);
    }
  }

  // Detect and convert Base64 images to files in storage (local or cloud)
  async _convertBase64ImagesToFiles(html) {
    try {
      const base64Regex = /src=["']data:image\/([a-zA-Z]+);base64,([^"']+)["']/gi;
      let match;
      let processedHtml = html;

      const fileStorage = require('../utils/fileStorage');

      while ((match = base64Regex.exec(html)) !== null) {
        const fullMatch = match[0];
        const ext = match[1] || 'png';
        const base64Data = match[2];

        // Skip if base64 is too short (maybe a placeholder) or empty
        if (base64Data.length < 50) continue;

        const fileName = `auto-${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
        const buffer = Buffer.from(base64Data, 'base64');

        // Save to storage (S3 or local fallback)
        const fileUrl = await fileStorage.saveFile(fileName, buffer, `image/${ext}`);

        // Replace base64 source with the public file URL
        processedHtml = processedHtml.split(match[1] + ';base64,' + match[2]).join(fileUrl);
        logger.debug(
          `[EMAIL] Auto-converted Base64 to storage file: ${fileName} (${Math.round((base64Data.length * 0.75) / 1024)} KB)`
        );
      }
      return processedHtml;
    } catch (e) {
      logger.error('[EMAIL][ERR] Error converting Base64 images:', e);
      return html;
    }
  }

  // Ensure all internal URLs (localhost or relative) are absolute production URLs
  _ensureAbsoluteUrls(html) {
    try {
      // Get the production base URL (already verified to be robust)
      const baseUrl = getPublicBaseUrl().replace(/\/+$/, '');

      if (!baseUrl) return html;

      // 1. Replace localhost URLs with the configured BACKEND_URL
      // This handles any port and any path starting with /api/
      const localhostPattern = /https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/api\/[^"'\s<>\)]+)/gi;
      let processedHtml = html.replace(localhostPattern, (match, host, port, path) => {
        return `${baseUrl}${path}`;
      });

      // 2. Replace relative paths with the configured BACKEND_URL
      // Covers src and href attributes for images, links, etc.
      const relativePattern = /(src|href)=["'](\/(api|uploads|logo\.svg)[^"'\s<>\)]+)["']/gi;
      processedHtml = processedHtml.replace(relativePattern, (match, attr, path) => {
        return `${attr}="${baseUrl}${path}"`;
      });

      return processedHtml;
    } catch (error) {
      logger.error('Error ensuring absolute URLs:', error);
      return html;
    }
  }

  async personnaliserContenu(contenu, envoi, campagne) {
    try {
      let html = contenu || '';
      let prenom = '',
        nom = '',
        ville = '',
        nationalite = '',
        sexe = '',
        handicap = '',
        type_client = '';

      // PERF FIX: Single DB query for all contact fields (was 2 identical queries before)
      if (envoi.contact_id) {
        try {
          const { Contact } = require('../models');
          const contact = await Contact.findByPk(envoi.contact_id);
          if (contact) {
            prenom = contact.prenom || '';
            nom = contact.nom || '';
            ville = contact.ville || '';
            nationalite = contact.nationalite || '';
            sexe = contact.sexe || '';
            handicap = contact.handicap !== null ? String(contact.handicap) : '';
            type_client = contact.type_client || '';
          }
        } catch (e) {
          require('../utils/logger').error('personnaliserContenu: contact fetch error', {
            error: e.message,
          });
        }
      }

      const fullname =
        [prenom, nom].filter(Boolean).join(' ').trim() || envoi.email_destinataire || '';
      const baseUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, '');
      const viewInBrowser = `${baseUrl}/view-email?token=${encodeURIComponent(envoi.token_tracking)}&campaign=${encodeURIComponent(campagne?.id || '')}`;
      const preferencesLink = `${baseUrl}/preferences?email=${encodeURIComponent(envoi.email_destinataire)}`;
      const trackingOpenUrl = `${getPublicBaseUrl()}/api/tracking/open/${encodeURIComponent(envoi.token_tracking)}`;

      html = html
        .replace(/\{\{prenom\}\}/g, prenom)
        .replace(/\{\{nom\}\}/g, nom)
        .replace(/\{\{fullname\}\}/g, fullname)
        .replace(/\{\{email\}\}/g, envoi.email_destinataire)
        .replace(/\{\{ville\}\}/g, ville)
        .replace(/\{\{nationalite\}\}/g, nationalite)
        .replace(/\{\{sexe\}\}/g, sexe)
        .replace(/\{\{handicap\}\}/g, handicap)
        .replace(/\{\{type_client\}\}/g, type_client)
        .replace(/\{\{tracking_token\}\}/g, envoi.token_tracking)
        .replace(
          /\{\{unsubscribe_link\}\}/g,
          `${emailConfig.templates.unsubscribeUrl}?token=${envoi.token_tracking}`
        )
        .replace(
          /\{\{tracking_pixel\}\}/g,
          `<img src="${trackingOpenUrl}" width="1" height="1" style="display:none;" />`
        )
        .replace(/\{\{view_in_browser_link\}\}/g, viewInBrowser)
        .replace(/\{\{preferences_link\}\}/g, preferencesLink);

      // NEW: Automatic Optimization for Base64 (Prevents 10MB+ emails that Gmail marks as spam)
      html = await this._convertBase64ImagesToFiles(html);

      // Ensure all internal URLs are absolute
      html = this._ensureAbsoluteUrls(html);

      // SAFE: Check if HTML is already a complete document structure
      // This prevents wrapping emails that already have full HTML structure
      const hasDoctype = /<!doctype\s+html/i.test(html);
      const hasHtmlTag = /<\s*html[\s>]/i.test(html);
      const hasBodyTag = /<\s*body[\s>]/i.test(html);
      const isCompleteHtml = hasDoctype || (hasHtmlTag && hasBodyTag);

      // Prepare footer if needed (before wrapping so we can append it to fragments)
      // Keep only the essential unsubscribe link visible; tracking for opens/clicks is handled separately.
      const hasUnsub = /unsubscribe_link|se désabonner|se desabonner|unsubscrib/i.test(html);
      const footer = !hasUnsub
        ? `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px">
          <tr><td align="center">
            <p style="font-size:12px;color:#666;margin:0">Se désabonner: <a href="${emailConfig.templates.unsubscribeUrl}?token=${envoi.token_tracking}" style="color:#1976d2">cliquez ici</a></p>
          </td></tr>
        </table>
      `.trim()
        : null;

      // Only wrap HTML fragments (not complete documents) to ensure proper rendering
      if (!isCompleteHtml && html.trim()) {
        // Add footer to fragment before wrapping
        if (footer) {
          html += footer;
        }
        // Wrap fragment in a robust, Outlook-compatible HTML structure
        html = `<!DOCTYPE html>
<html lang="fr" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <!--[if mso]>
  <xml>
    <o:OfficeDocumentSettings>
      <o:AllowPNG/>
      <o:PixelsPerInch>96</o:PixelsPerInch>
    </o:OfficeDocumentSettings>
  </xml>
  <![endif]-->
</head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background-color:#f4f4f4;">
  <!--[if mso]>
  <table role="presentation" width="600" align="center" style="margin:0 auto;background-color:#ffffff;">
  <tr>
  <td>
  <![endif]-->
  <div style="max-width:600px;margin:0 auto;background-color:#ffffff;padding:20px;">
    ${html}
  </div>
  <!--[if mso]>
  </td>
  </tr>
  </table>
  <![endif]-->
</body>
</html>`;
      } else if (footer) {
        // For complete HTML documents, insert footer before closing body tag
        if (html.includes('</body>')) {
          html = html.replace('</body>', `${footer}</body>`);
        } else {
          // If no body tag, append footer at the end
          html += footer;
        }
      }

      return html;
    } catch {
      return contenu || '';
    }
  }

  htmlToText(html) {
    // Conversion simple HTML vers texte
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
  }

  genererTokenTracking() {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  // Ajouter un pixel de tracking pour les ouvertures
  ajouterPixelTracking(htmlContent, tokenTracking) {
    // Avoid double-inserting if the template already contains the tracking pixel placeholder
    try {
      if (htmlContent && htmlContent.includes(`/api/tracking/open/${tokenTracking}`)) {
        return htmlContent;
      }
    } catch {}
    const trackingPixel = `<img src="${getPublicBaseUrl()}/api/tracking/open/${tokenTracking}" width="1" height="1" style="display:none;" />`;

    // Insérer le pixel avant la fermeture du body
    if (htmlContent.includes('</body>')) {
      return htmlContent.replace('</body>', `${trackingPixel}</body>`);
    } else {
      return htmlContent + trackingPixel;
    }
  }

  // Ajouter le tracking des clics aux liens
  ajouterTrackingClics(htmlContent, tokenTracking, campagne) {
    // Regex pour trouver tous les liens href
    const linkRegex = /<a\s+([^>]*?)href=["']([^"']+)["']([^>]*?)>/gi;

    return htmlContent.replace(linkRegex, (match, beforeHref, url, afterHref) => {
      const lower = (url || '').toLowerCase();
      // Ne pas tracker certains liens
      if (
        lower.startsWith('mailto:') ||
        lower.startsWith('tel:') ||
        lower.includes('unsubscribe') ||
        lower.includes('desabonnement') ||
        lower.startsWith('#')
      ) {
        return match;
      }
      // UTM params
      try {
        const original = new URL(url, 'https://dummy.base');
        const isHttp = original.protocol === 'http:' || original.protocol === 'https:';
        if (isHttp) {
          if (!original.searchParams.has('utm_source'))
            original.searchParams.set('utm_source', 'newsletter');
          if (!original.searchParams.has('utm_medium'))
            original.searchParams.set('utm_medium', 'email');
          if (!original.searchParams.has('utm_campaign') && campagne?.id)
            original.searchParams.set('utm_campaign', String(campagne.id));
          url = original.href.replace('https://dummy.base', '');
        }
      } catch {}

      // Créer l'URL de tracking
      const trackingUrl = `${getPublicBaseUrl()}/api/tracking/click/${tokenTracking}?url=${encodeURIComponent(url)}`;

      return `<a ${beforeHref}href="${trackingUrl}"${afterHref}>`;
    });
  }

  async mettreAJourStatistiques(campagne, nbEnvoyes, nbErreurs) {
    try {
      const [statistiques, created] = await StatistiqueCampagne.findOrCreate({
        where: { campagne_id: campagne.id },
        defaults: {
          campagne_id: campagne.id,
          nb_envoyes: 0,
          nb_ouverts: 0,
          nb_clics: 0,
          nb_desabonnements: 0,
        },
      });

      if (!created) {
        await statistiques.update({
          nb_envoyes: statistiques.nb_envoyes + nbEnvoyes,
        });
      } else {
        await statistiques.update({
          nb_envoyes: nbEnvoyes,
        });
      }
    } catch (error) {
      logger.error('Erreur lors de la mise à jour des statistiques:', error);
    }
  }

  // Mettre à jour les statistiques en temps réel
  async mettreAJourStatistiquesTempsReel(campagneId) {
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
        },
        {
          where: { campagne_id: campagneId },
        }
      );

      logger.debug(
        `Statistiques mises à jour pour campagne ${campagneId}: ${totalEnvoyes} envoyés, ${ouverts} ouverts, ${clics} clics`
      );
    } catch (error) {
      logger.error('Erreur lors de la mise à jour des statistiques temps réel:', error);
    }
  }

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async envoyerTest(email, campagne) {
    try {
      if ((emailConfig.provider || 'smtp') === 'graph') {
        const htmlContent = campagne.contenu_html;
        const dummyEnvoi = {
          contact_id: 0,
          token_tracking: 'test-token',
          email_destinataire: email,
        };
        await this.envoyerEmailViaGraph(
          { ...campagne, sujet: `[TEST] ${campagne.sujet}` },
          dummyEnvoi,
          htmlContent
        );
        return { success: true };
      }

      const mailOptions = {
        from: emailConfig.from,
        to: email,
        subject: `[TEST] ${campagne.sujet}`,
        html: campagne.contenu_html,
        text: campagne.contenu_texte || this.htmlToText(campagne.contenu_html),
        headers: {
          ...emailConfig.headers,
          'X-Test': 'true',
        },
      };

      const result = await this.transporter.sendMail(mailOptions);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      throw new Error(`Erreur envoi test: ${error.message}`);
    }
  }

  // Send a simple email (subject/html) either via Graph or SMTP based on configuration
  async sendGenericEmail(to, subject, html) {
    const fromEmail = emailConfig.graph?.senderEmail || emailConfig.from;
    if ((emailConfig.provider || 'smtp') === 'graph') {
      if (!this.graphClient) throw new Error('Client Graph non initialisé');
      const message = {
        message: {
          subject,
          body: { contentType: 'HTML', content: html },
          from: { emailAddress: { address: fromEmail } },
          toRecipients: [{ emailAddress: { address: to } }],
        },
        saveToSentItems: emailConfig.graph?.saveToSentItems !== false,
      };
      const senderUserId = emailConfig.graph?.senderUserId;
      const senderUserPrincipal = emailConfig.graph?.senderEmail || emailConfig.from;
      const userPath = senderUserId
        ? `users/${senderUserId}`
        : senderUserPrincipal
          ? `users/${senderUserPrincipal}`
          : null;
      if (!userPath)
        throw new Error(
          'Configuration Graph incomplète: définir graph.senderEmail ou graph.senderUserId'
        );
      await this.graphClient.api(`/${userPath}/sendMail`).post(message);
      return { success: true };
    }
    if (!this.transporter) throw new Error('Transporteur SMTP non initialisé');
    const info = await this.transporter.sendMail({ from: emailConfig.from, to, subject, html });
    return { success: true, messageId: info?.messageId };
  }

  // Send with attachments (array of { filename, path })
  async sendWithAttachments(to, subject, html, attachments = []) {
    const from = emailConfig.graph?.senderEmail || emailConfig.from;
    if ((emailConfig.provider || 'smtp') === 'graph') {
      if (!this.graphClient) throw new Error('Client Graph non initialisé');
      // Inline images: convert <img src=".../api/templates/media/:name"> to CID attachments
      const inline = this._extractInlineImagesForGraph(html);
      const message = {
        message: {
          subject,
          body: { contentType: 'HTML', content: inline.html },
          from: { emailAddress: { address: from } },
          toRecipients: [{ emailAddress: { address: to } }],
          attachments: [
            // Inline images first
            ...inline.attachments,
            // Regular attachments (files uploaded in form)
            ...(await Promise.all(
              (attachments || []).map(async (f) => ({
                '@odata.type': '#microsoft.graph.fileAttachment',
                name: f.filename || path.basename(f.path || 'file'),
                isInline: false,
                contentBytes: fs.existsSync(f.path)
                  ? fs.readFileSync(f.path).toString('base64')
                  : '',
              }))
            )),
          ],
        },
        saveToSentItems: emailConfig.graph?.saveToSentItems !== false,
      };
      const userPath = emailConfig.graph?.senderUserId
        ? `users/${emailConfig.graph.senderUserId}`
        : emailConfig.graph?.senderEmail || emailConfig.from
          ? `users/${emailConfig.graph?.senderEmail || emailConfig.from}`
          : null;
      if (!userPath) throw new Error('Configuration Graph incomplète');
      await this.graphClient.api(`/${userPath}/sendMail`).post(message);
      return { success: true };
    }
    if (!this.transporter) throw new Error('Transporteur SMTP non initialisé');
    const info = await this.transporter.sendMail({ from, to, subject, html, attachments });
    return { success: true, messageId: info?.messageId };
  }

  // Méthode pour vérifier la santé du service
  async checkHealth() {
    try {
      if (this._graphCredential) {
        // App-only (client credentials) auth has no delegated /me endpoint
        // to probe - acquiring a token is itself the meaningful check that
        // the tenant/client/secret are valid.
        await this._graphCredential.getToken('https://graph.microsoft.com/.default');
        return { status: 'healthy', message: 'Service email opérationnel (Microsoft Graph)' };
      }
      if (this.transporter) {
        await this.transporter.verify();
        return { status: 'healthy', message: 'Service email opérationnel (SMTP)' };
      }
      return { status: 'unhealthy', message: 'Service email non initialisé' };
    } catch (error) {
      return { status: 'unhealthy', message: `Erreur de connexion: ${error.message}` };
    }
  }
}

module.exports = new EmailService();
