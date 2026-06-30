const {
  Contact,
  Tag,
  Note,
  Category,
  Distribution,
  Segment,
  EnvoiEmail,
  Rsvp,
  ContactTag,
  Abonnement,
} = require('../models');
const { parseFile, generateCsv, generateExcel } = require('../utils/csv');
const BatchProcessor = require('../utils/batchProcessor');
const { Op } = require('sequelize');
const automationService = require('../services/automationService');
const { pick } = require('../utils/pick');
const { runWithTenant } = require('../utils/tenantContext');

// Excludes id/club_id (tenant isolation) and date_creation (server-managed)
const CONTACT_FIELDS = [
  'prenom',
  'nom',
  'email',
  'telephone',
  'sexe',
  'handicap',
  'home_club',
  'date_naissance',
  'nationalite',
  'type_client',
  'ville',
  'entreprise',
  'remarques',
  'actif',
  'adresse',
  'code_postal',
  'pays',
  'statut',
  'source',
  'metadata',
  'historique',
  'date_inscription',
  'consentement_rgpd',
  'abonnement_id',
  'date_debut_abonnement',
  'date_expiration_abonnement',
  'statut_abonnement',
  'dernier_paiement_info',
  'category_id',
  'distribution_id',
];

// Helper: ensure tags from category/distribution are attached to a contact
async function ensureCategoryDistributionTags(contact) {
  await contact.reload({
    include: [
      { model: Category, as: 'category' },
      { model: Distribution, as: 'distribution' },
      { model: Tag, as: 'tags', through: { attributes: [] } },
    ],
  });
  const desiredTagNames = [];
  if (contact.category && contact.category.nom)
    desiredTagNames.push(String(contact.category.nom).trim());
  if (contact.distribution && contact.distribution.nom)
    desiredTagNames.push(String(contact.distribution.nom).trim());
  if (desiredTagNames.length === 0) return [];
  const existingTagNames = new Set((contact.tags || []).map((t) => t.nom));
  const addedTagNames = [];
  for (const tagName of desiredTagNames) {
    if (!tagName) continue;
    if (existingTagNames.has(tagName)) continue;
    const [tag] = await Tag.findOrCreate({ where: { nom: tagName }, defaults: { nom: tagName } });
    await contact.addTag(tag);
    addedTagNames.push(tagName);
  }
  return addedTagNames;
}

// Helper: ensure a specific tag is attached to a contact
async function ensureTag(contact, tagName) {
  if (!tagName) return [];
  await contact.reload({ include: [{ model: Tag, as: 'tags', through: { attributes: [] } }] });
  const existingTagNames = new Set((contact.tags || []).map((t) => t.nom));
  if (existingTagNames.has(tagName)) return [];
  const [tag] = await Tag.findOrCreate({ where: { nom: tagName }, defaults: { nom: tagName } });
  await contact.addTag(tag);
  return [tagName];
}

// CRUD Contact
exports.create = async (req, res) => {
  // The authenticated route (POST /contacts) already runs inside the tenant
  // context set up by requireAuthAndTenant middleware. The public route
  // (POST /contacts/public, no auth) has none, so it must establish one
  // itself - pinned to the default club until a club-aware public signup
  // URL scheme exists (out of scope for this phase).
  const isPublicRegistration =
    (req.path && req.path.includes('/public')) ||
    (req.originalUrl && req.originalUrl.includes('/public'));
  const run = (fn) =>
    isPublicRegistration ? runWithTenant({ clubId: 1, isSystem: false }, fn) : fn();

  return run(async () => {
    try {
      // Email uniqueness check (case-insensitive logic delegated to DB collation)
      if (!req.body.email) {
        return res.status(400).json({ message: 'Email requis' });
      }
      const existing = await Contact.findOne({ where: { email: req.body.email } });
      if (existing) {
        return res.status(400).json({ message: 'Un contact avec cet email existe déjà' });
      }

      const contact = await Contact.create(pick(req.body, CONTACT_FIELDS));

      // Trigger: Contact created
      automationService.triggerAutomation('contact_added', { contact });

      try {
        let allAddedTagNames = [];
        const catDistTags = await ensureCategoryDistributionTags(contact);
        allAddedTagNames.push(...catDistTags);

        // Associate explicit tags if provided
        if (Array.isArray(req.body.tags_id) && req.body.tags_id.length > 0) {
          console.log(`[DEBUG] Adding tags ${req.body.tags_id} to contact ${contact.id}`);
          await contact.addTags(req.body.tags_id);
          const addedTags = await Tag.findAll({ where: { id: req.body.tags_id } });
          allAddedTagNames.push(...addedTags.map((t) => t.nom));
        }

        // Add CMT2026 and Golfeurs Allemagne tags for public registrations
        if (isPublicRegistration) {
          allAddedTagNames.push(...(await ensureTag(contact, 'CMT2026')));
          allAddedTagNames.push(...(await ensureTag(contact, 'Golfeurs Allemagne')));
        }

        if (allAddedTagNames.length > 0) {
          automationService.triggerAutomation('tag_added', { contact, tagNames: allAddedTagNames });
        }
      } catch (_) {}

      res.status(201).json(contact);
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  });
};

// Recherche avancée + pagination + tri
// Helper: build where clause from query params (reused for list and exports)
const getContactsWhereClause = async (query) => {
  const {
    tagIds,
    actif,
    nom,
    prenom,
    email,
    telephone,
    statut,
    ville,
    pays,
    entreprise,
    search,
    categoryId,
    distributionId,
    segmentIds,
    filterRules,
    filterMatch,
    onlyMembers,
  } = query;

  const sequelize = Contact.sequelize;
  const whereConditions = [];

  // 1. Basic Filters
  if (actif !== undefined && actif !== '') {
    whereConditions.push({
      actif: actif === 'true' || actif === true || actif === 1 || actif === '1',
    });
  }
  if (nom) whereConditions.push({ nom: { [Op.like]: `%${nom}%` } });
  if (prenom) whereConditions.push({ prenom: { [Op.like]: `%${prenom}%` } });
  if (email) whereConditions.push({ email: { [Op.like]: `%${email}%` } });
  if (telephone) whereConditions.push({ telephone: { [Op.like]: `%${telephone}%` } });
  if (statut) whereConditions.push({ statut });
  if (ville) whereConditions.push({ ville: { [Op.like]: `%${ville}%` } });
  if (pays) whereConditions.push({ pays: { [Op.like]: `%${pays}%` } });
  if (entreprise) whereConditions.push({ entreprise: { [Op.like]: `%${entreprise}%` } });

  if (onlyMembers === 'true' || onlyMembers === true) {
    whereConditions.push({
      [Op.or]: [
        { statut_abonnement: { [Op.ne]: 'aucun' } },
        {
          id: {
            [Op.in]: sequelize.literal(`(
              SELECT ct.contact_id FROM contact_tag ct
              INNER JOIN tag t ON t.id = ct.tag_id
              WHERE t.nom = 'ABONNES GOLF CITRUS'
            )`),
          },
        },
      ],
    });
  }

  // 2. Category / Distribution
  if (categoryId) {
    const list = Array.isArray(categoryId)
      ? categoryId
      : String(categoryId).split(',').filter(Boolean);
    whereConditions.push({ category_id: list.length > 1 ? { [Op.in]: list } : list[0] });
  }
  if (distributionId) {
    const list = Array.isArray(distributionId)
      ? distributionId
      : String(distributionId).split(',').filter(Boolean);
    whereConditions.push({ distribution_id: list.length > 1 ? { [Op.in]: list } : list[0] });
  }

  // 3. Search
  if (search && search.trim() !== '') {
    const s = `%${search.trim()}%`;
    whereConditions.push({
      [Op.or]: [
        { nom: { [Op.like]: s } },
        { prenom: { [Op.like]: s } },
        { email: { [Op.like]: s } },
        { telephone: { [Op.like]: s } },
        { ville: { [Op.like]: s } },
        { entreprise: { [Op.like]: s } },
        { pays: { [Op.like]: s } },
      ],
    });
  }

  // 4. Advanced filterRules
  let rules = [];
  if (filterRules) {
    try {
      rules = typeof filterRules === 'string' ? JSON.parse(filterRules) : filterRules;
    } catch (e) {
      rules = [];
    }

    if (Array.isArray(rules) && rules.length > 0) {
      const ruleConditions = [];
      for (const rule of rules) {
        const { field, operator, value } = rule;
        if (!field || !operator) continue;
        let cond = null;

        if (field === 'tags') {
          const rawIds = Array.isArray(value) ? value : String(value).split(',');
          // SECURITY: validate every id is a positive integer before
          // interpolating into the literal subquery - rejects SQL injection
          // attempts via a crafted filterRules.value array.
          const ids = rawIds.map(Number).filter((n) => Number.isInteger(n) && n > 0);
          if (ids.length > 0) {
            const subquery = `(SELECT ct.contact_id FROM contact_tag ct WHERE ct.tag_id IN (${ids.join(',')}))`;
            cond = {
              id: { [operator === 'excludes' ? Op.notIn : Op.in]: sequelize.literal(subquery) },
            };
          }
        } else if (field === 'segments') {
          const ids = Array.isArray(value)
            ? value
            : String(value).split(',').map(Number).filter(Boolean);
          if (ids.length > 0) {
            const segments = await Segment.findAll({ where: { id: { [Op.in]: ids } } });
            const segmentConditions = segments
              .map((s) => {
                const { buildContactQueryFromCriteria } = require('./segmentController');
                const { where } = buildContactQueryFromCriteria(s.criteres);
                const hasConditions =
                  where &&
                  (Object.keys(where).length > 0 || Object.getOwnPropertySymbols(where).length > 0);
                return hasConditions ? where : null;
              })
              .filter(Boolean);

            if (segmentConditions.length > 0) {
              const innerMatch = filterMatch === 'any' ? Op.or : Op.and;
              const segmentCond = { [innerMatch]: segmentConditions };
              cond = operator === 'excludes' ? { [Op.not]: segmentCond } : segmentCond;
            }
          }
        } else if (field === 'actif') {
          const b = value === 'true' || value === true;
          cond = { actif: operator === 'is' ? b : !b };
        } else {
          const op = operator === 'contains' ? Op.like : operator === 'is_not' ? Op.not : Op.eq;
          const val = operator === 'contains' ? `%${value}%` : value;
          cond = { [field]: { [op]: val } };
        }
        if (cond) ruleConditions.push(cond);
      }

      if (ruleConditions.length > 0) {
        const matchOp = filterMatch === 'any' ? Op.or : Op.and;
        whereConditions.push({ [matchOp]: ruleConditions });
      }
    }
  }

  // 5. Explicit tagIds (intersection) or segmentIds (legacy support)
  const hasTagRule = Array.isArray(rules) && rules.some((r) => r.field === 'tags');
  if (tagIds && !hasTagRule) {
    const ids = String(tagIds)
      .split(',')
      .map(Number)
      .filter((n) => Number.isInteger(n) && n > 0);
    if (ids.length > 0) {
      whereConditions.push({
        id: {
          [Op.in]: sequelize.literal(`(
            SELECT ct.contact_id FROM contact_tag ct
            WHERE ct.tag_id IN (${ids.join(',')})
            GROUP BY ct.contact_id 
            HAVING COUNT(DISTINCT ct.tag_id) = ${ids.length}
          )`),
        },
      });
    }
  }
  const hasSegmentRule = Array.isArray(rules) && rules.some((r) => r.field === 'segments');
  if (segmentIds && !hasSegmentRule) {
    const ids = String(segmentIds)
      .split(',')
      .map(Number)
      .filter((n) => n > 0);
    if (ids.length > 0) {
      const segments = await Segment.findAll({ where: { id: { [Op.in]: ids } } });
      const segmentConditions = segments
        .map((s) => {
          let crit = s.criteres;
          if (typeof crit === 'string')
            try {
              crit = JSON.parse(crit);
            } catch {
              crit = {};
            }
          const sw = {};
          [
            'type_client',
            'ville',
            'nationalite',
            'actif',
            'category_id',
            'distribution_id',
          ].forEach((k) => {
            if (crit[k] !== undefined && crit[k] !== '') sw[k] = crit[k];
          });
          if (Array.isArray(crit.tag_ids) && crit.tag_ids.length > 0) {
            // SECURITY: crit comes from a Segment's stored criteres JSON -
            // validate every id is a positive integer before interpolating
            // into the literal subquery (was a confirmed SQL injection: a
            // crafted tag_ids value would execute as raw SQL here).
            const safeTagIds = crit.tag_ids.map(Number).filter((n) => Number.isInteger(n) && n > 0);
            if (safeTagIds.length > 0) {
              sw.id = {
                [Op.in]: sequelize.literal(
                  `(SELECT contact_id FROM contact_tag WHERE tag_id IN (${safeTagIds.join(',')}))`
                ),
              };
            }
          }
          return sw;
        })
        .filter(
          (c) => c && (Object.keys(c).length > 0 || Object.getOwnPropertySymbols(c).length > 0)
        );
      if (segmentConditions.length > 0) whereConditions.push({ [Op.and]: segmentConditions });
    }
  }

  return whereConditions.length > 0 ? { [Op.and]: whereConditions } : {};
};

// Recherche avancée + pagination + tri
exports.getAll = async (req, res) => {
  try {
    const { page = 1, limit = 25, sort = 'date_creation', order = 'DESC' } = req.query;
    console.log('[DEBUG] getAll contacts params:', req.query);

    const where = await getContactsWhereClause(req.query);
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const include = [
      { model: Tag, as: 'tags', through: { attributes: [] } },
      { model: Note, as: 'notes' },
      { model: Category, as: 'category' },
      { model: Distribution, as: 'distribution' },
      { model: Abonnement, as: 'abonnement' },
    ];

    const { count, rows } = await Contact.findAndCountAll({
      where,
      include,
      offset,
      limit: parseInt(limit),
      order: [[sort, order]],
      distinct: true,
    });
    console.log('[DEBUG] Results found:', count);
    res.json({ total: count, page: parseInt(page), limit: parseInt(limit), data: rows });
  } catch (err) {
    console.error('Error in getAll contacts:', err.message);
    res.status(500).json({ message: err.message });
  }
};

// Contacts avec emails potentiellement obsolètes (basé sur les erreurs d'envoi)
// GET /contacts/obsolete?days=90&minErrors=2
exports.getObsoleteEmails = async (req, res) => {
  try {
    const days = Number(req.query.days || 90);
    const minErrors = Number.isFinite(Number(req.query.minErrors))
      ? Number(req.query.minErrors)
      : 2;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const sequelize = Contact.sequelize;

    const rows = await EnvoiEmail.findAll({
      where: {
        statut: 'erreur',
        date_envoi: { [Op.gte]: since },
      },
      attributes: [
        'contact_id',
        [sequelize.fn('COUNT', sequelize.col('id')), 'nb_erreurs'],
        [sequelize.fn('MAX', sequelize.col('date_envoi')), 'dernier_envoi'],
      ],
      group: ['contact_id'],
      having: sequelize.literal(`COUNT(id) >= ${minErrors}`),
    });

    const contactIds = rows.map((r) => r.contact_id).filter(Boolean);
    if (!contactIds.length) {
      return res.json({ total: 0, data: [] });
    }

    const contacts = await Contact.findAll({
      where: { id: { [Op.in]: contactIds } },
      include: [
        { model: Tag, as: 'tags', through: { attributes: [] } },
        { model: Category, as: 'category' },
        { model: Distribution, as: 'distribution' },
      ],
    });

    res.json({ total: contacts.length, data: contacts });
  } catch (err) {
    console.error('Error getObsoleteEmails:', err);
    res.status(500).json({ message: err.message });
  }
};

// Dashboard stats
exports.getStats = async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);

    // Totals
    const totalContacts = await Contact.count();
    const activeContacts = await Contact.count({ where: { actif: true } });
    const newThisMonth = await Contact.count({
      where: { date_creation: { [Op.gte]: startOfMonth } },
    });

    // By sexe
    const sexeRows = await Contact.findAll({
      attributes: ['sexe', [Contact.sequelize.fn('COUNT', Contact.sequelize.col('sexe')), 'count']],
      group: ['sexe'],
    });
    const bySexe = {};
    sexeRows.forEach((r) => {
      bySexe[r.sexe || 'Non spécifié'] = Number(r.get('count')) || 0;
    });

    // Top categories
    const catRows = await Contact.findAll({
      attributes: [
        'category_id',
        [Contact.sequelize.fn('COUNT', Contact.sequelize.col('category_id')), 'count'],
      ],
      include: [
        {
          model: require('../models').Category,
          as: 'category',
          attributes: ['id', 'nom'],
          required: false,
        },
      ],
      group: ['category_id', 'category.id', 'category.nom'],
      order: [[Contact.sequelize.literal('count'), 'DESC']],
      limit: 10,
    });
    const topCategories = catRows
      .filter((r) => r.category)
      .map((r) => ({ id: r.category.id, nom: r.category.nom, count: Number(r.get('count')) || 0 }));

    // Top distributions
    const distRows = await Contact.findAll({
      attributes: [
        'distribution_id',
        [Contact.sequelize.fn('COUNT', Contact.sequelize.col('distribution_id')), 'count'],
      ],
      include: [
        {
          model: require('../models').Distribution,
          as: 'distribution',
          attributes: ['id', 'nom'],
          required: false,
        },
      ],
      group: ['distribution_id', 'distribution.id', 'distribution.nom'],
      order: [[Contact.sequelize.literal('count'), 'DESC']],
      limit: 10,
    });
    const topDistributions = distRows
      .filter((r) => r.distribution)
      .map((r) => ({
        id: r.distribution.id,
        nom: r.distribution.nom,
        count: Number(r.get('count')) || 0,
      }));

    // By country (pays)
    const paysRows = await Contact.findAll({
      attributes: ['pays', [Contact.sequelize.fn('COUNT', Contact.sequelize.col('pays')), 'count']],
      group: ['pays'],
    });
    const byPays = {};
    paysRows.forEach((r) => {
      byPays[r.pays || 'Non spécifié'] = Number(r.get('count')) || 0;
    });

    // Top tags (via join table). Built through the Tag model (not raw SQL)
    // so the tenant-scope hook on Tag.findAll keeps this club-isolated -
    // the previous raw `sequelize.query` here had no club_id filter at all
    // and counted tags across every club.
    const tagRows = await Tag.findAll({
      attributes: [
        'id',
        'nom',
        [Contact.sequelize.fn('COUNT', Contact.sequelize.col('contacts.id')), 'count'],
      ],
      include: [
        {
          model: Contact,
          as: 'contacts',
          attributes: [],
          through: { attributes: [] },
          required: false,
        },
      ],
      group: ['Tag.id'],
      order: [[Contact.sequelize.literal('count'), 'DESC']],
      subQuery: false,
      limit: 15,
    });
    const topTags = tagRows.map((r) => ({
      id: r.id,
      nom: r.nom,
      count: Number(r.get('count')) || 0,
    }));

    res.json({
      totalContacts,
      activeContacts,
      newThisMonth,
      bySexe,
      byPays,
      topCategories,
      topDistributions,
      topTags,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getOne = async (req, res) => {
  try {
    const contact = await Contact.findByPk(req.params.id, {
      include: [
        { model: Tag, as: 'tags', through: { attributes: [] } },
        { model: Note, as: 'notes' },
        { model: Category, as: 'category' },
        { model: Distribution, as: 'distribution' },
      ],
    });
    if (!contact) return res.status(404).json({ message: 'Contact non trouvé' });
    res.json(contact);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const contact = await Contact.findByPk(req.params.id);
    if (!contact) return res.status(404).json({ message: 'Contact non trouvé' });
    // Prevent email duplication on update
    if (req.body.email && req.body.email !== contact.email) {
      const existing = await Contact.findOne({ where: { email: req.body.email } });
      if (existing) {
        return res.status(400).json({ message: 'Un contact avec cet email existe déjà' });
      }
    }
    await contact.update(pick(req.body, CONTACT_FIELDS));
    try {
      await ensureCategoryDistributionTags(contact);
      // Update explicit tags if provided
      if (Array.isArray(req.body.tags_id)) {
        console.log(`[DEBUG] Syncing tags ${req.body.tags_id} for contact ${contact.id}`);
        await contact.setTags(req.body.tags_id);
      }
    } catch (_) {}
    res.json(contact);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const contact = await Contact.findByPk(req.params.id);
    if (!contact) return res.status(404).json({ message: 'Contact non trouvé' });
    const force =
      String(req.query.force || '').toLowerCase() === '1' ||
      String(req.query.force || '').toLowerCase() === 'true';
    try {
      await contact.destroy();
      return res.json({ message: 'Contact supprimé' });
    } catch (e) {
      // If FK constraint blocks deletion
      const msg = e?.original?.sqlMessage || e.message || '';
      const isFk = /foreign key constraint/i.test(msg);
      if (!isFk) throw e;
      if (!force) {
        return res.status(409).json({
          message:
            "Ce contact est référencé par des envois d'emails. Utilisez force=1 pour supprimer aussi son historique d'envoi.",
          code: 'FK_CONSTRAINT',
        });
      }
      // Cascade delete envoi_email rows for this contact, then delete
      const { EnvoiEmail } = require('../models');
      await EnvoiEmail.destroy({ where: { contact_id: contact.id } });
      await contact.destroy();
      return res.json({ message: "Contact et historique d'envoi supprimés" });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Désactiver un contact (actif = false)
exports.disable = async (req, res) => {
  try {
    const contact = await Contact.findByPk(req.params.id);
    if (!contact) return res.status(404).json({ message: 'Contact non trouvé' });
    contact.actif = false;
    await contact.save();
    res.json(contact);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Tags
exports.addTag = async (req, res) => {
  try {
    const contact = await Contact.findByPk(req.params.id);
    const tag = await Tag.findByPk(req.body.tagId);
    if (!contact || !tag) return res.status(404).json({ message: 'Contact ou tag non trouvé' });
    await contact.addTag(tag);

    // Trigger: Tag added
    automationService.triggerAutomation('tag_added', { contact, tagName: tag.nom });

    res.json({ message: 'Tag associé' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
exports.removeTag = async (req, res) => {
  try {
    const contact = await Contact.findByPk(req.params.id);
    const tag = await Tag.findByPk(req.body.tagId);
    if (!contact || !tag) return res.status(404).json({ message: 'Contact ou tag non trouvé' });
    await contact.removeTag(tag);
    res.json({ message: 'Tag dissocié' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Notes (CRUD sur les notes d'un contact)
exports.addNote = async (req, res) => {
  try {
    const contact = await Contact.findByPk(req.params.id);
    if (!contact) return res.status(404).json({ message: 'Contact non trouvé' });
    const note = await Note.create({
      contact_id: contact.id,
      contenu: req.body.contenu,
      auteur: req.body.auteur || 'Système',
    });
    res.status(201).json(note);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
exports.updateNote = async (req, res) => {
  try {
    const note = await Note.findByPk(req.params.noteId);
    if (!note) return res.status(404).json({ message: 'Note non trouvée' });
    await note.update(pick(req.body, ['contenu', 'auteur']));
    res.json(note);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
exports.deleteNote = async (req, res) => {
  try {
    const note = await Note.findByPk(req.params.noteId);
    if (!note) return res.status(404).json({ message: 'Note non trouvée' });
    await note.destroy();
    res.json({ message: 'Note supprimée' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Import Excel/CSV with duplicate elimination
exports.importFile = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Fichier manquant' });

    console.log(`Importing file: ${req.file.originalname}`);
    console.log(`File size: ${req.file.size} bytes`);
    console.log(`File mimetype: ${req.file.mimetype}`);

    let contacts;
    try {
      contacts = await parseFile(req.file.path);

      if (contacts.length === 0) {
        return res.status(400).json({ message: 'Aucun contact valide trouvé dans le fichier' });
      }
    } catch (parseError) {
      console.error('File parsing error:', parseError);
      return res.status(400).json({
        message: `Erreur lors du parsing du fichier: ${parseError.message}`,
        details: 'Vérifiez que le fichier est un Excel (.xlsx/.xls) ou CSV valide',
      });
    }

    // Process categories, distributions, tags, and segments
    const categoryNames = [...new Set(contacts.map((c) => c._category_name).filter(Boolean))];
    const distributionNames = [
      ...new Set(contacts.map((c) => c._distribution_name).filter(Boolean)),
    ];

    // Extract all unique tags and segments
    const allTags = contacts.flatMap((c) => c._tags || []).filter(Boolean);
    const allSegments = contacts.flatMap((c) => c._segments || []).filter(Boolean);
    const uniqueTags = [...new Set(allTags)];
    const uniqueSegments = [...new Set(allSegments)];

    // Create categories and distributions if they don't exist
    const categoryMap = {};
    for (const categoryName of categoryNames) {
      const [category] = await Category.findOrCreate({
        where: { nom: categoryName },
        defaults: { nom: categoryName },
      });
      categoryMap[categoryName] = category.id;
    }

    const distributionMap = {};
    for (const distributionName of distributionNames) {
      const [distribution] = await Distribution.findOrCreate({
        where: { nom: distributionName },
        defaults: { nom: distributionName },
      });
      distributionMap[distributionName] = distribution.id;
    }

    // Create tags if they don't exist
    const tagMap = {};
    for (const tagName of uniqueTags) {
      const [tag] = await Tag.findOrCreate({
        where: { nom: tagName },
        defaults: { nom: tagName },
      });
      tagMap[tagName] = tag.id;
    }

    // Create segments if they don't exist
    const segmentMap = {};
    for (const segmentName of uniqueSegments) {
      const [segment] = await Segment.findOrCreate({
        where: { nom: segmentName },
        defaults: { nom: segmentName, criteres: {} },
      });
      segmentMap[segmentName] = segment.id;
    }

    // Check for existing emails to avoid duplicates in database (or to update if requested)
    const existingEmails = await Contact.findAll({
      where: {
        email: contacts.map((c) => c.email),
      },
      attributes: ['email'],
    });

    const existingEmailSet = new Set(existingEmails.map((c) => c.email.toLowerCase()));
    const updateExisting =
      req.query.updateExisting === 'true' ||
      (req.body && String(req.body.updateExisting) === 'true');
    const newContacts = contacts.filter((c) => !existingEmailSet.has(c.email.toLowerCase()));
    const contactsToUpdate = updateExisting
      ? contacts.filter((c) => existingEmailSet.has(c.email.toLowerCase()))
      : [];

    // Batch Tag IDs (from UI)
    let batchTagIds = [];
    if (req.body.batchTagIds) {
      batchTagIds = String(req.body.batchTagIds).split(',').map(Number).filter(Boolean);
    }

    // Map contacts to include category_id and distribution_id, and prepare tags/segments
    const processedContacts = newContacts.map((contact) => {
      const processed = { ...contact };
      if (contact._category_name && categoryMap[contact._category_name]) {
        processed.category_id = categoryMap[contact._category_name];
      }
      if (contact._distribution_name && distributionMap[contact._distribution_name]) {
        processed.distribution_id = distributionMap[contact._distribution_name];
      }

      // Store tag and segment IDs for later association
      processed._tagIds = [
        ...new Set([
          ...(contact._tags || []).map((tagName) => tagMap[tagName]).filter(Boolean),
          ...batchTagIds,
        ]),
      ];
      processed._segmentIds = (contact._segments || [])
        .map((segmentName) => segmentMap[segmentName])
        .filter(Boolean);

      // Remove temporary fields
      delete processed._category_name;
      delete processed._distribution_name;
      delete processed._tags;
      delete processed._segments;
      return processed;
    });

    // Use BatchProcessor to handle large imports efficiently
    const optimalBatchSize = BatchProcessor.getOptimalBatchSize(processedContacts.length);
    const batchProcessor = new BatchProcessor(optimalBatchSize);

    console.log(
      `Using optimal batch size of ${optimalBatchSize} for ${processedContacts.length} contacts`
    );

    const created = await batchProcessor.processContacts(processedContacts, {
      Contact,
      Category,
      Distribution,
      Tag,
    });

    // Trigger automations for newly created contacts
    if (created && created.length > 0) {
      console.log(`[IMPORT] Triggering automations for ${created.length} new contacts`);
      created.forEach((contact) => {
        automationService.triggerAutomation('contact_added', { contact });
        // If they have tags from the import, those will be handled inside triggerAutomation if we pass tagNames
        // but batchProcessor adds tags directly. For simplicity, we trigger 'contact_added'.
      });
    }

    // Optionally update existing contacts when updateExisting=true
    let updatedCount = 0;
    if (contactsToUpdate.length > 0) {
      for (const raw of contactsToUpdate) {
        const contact = await Contact.findOne({ where: { email: raw.email } });
        if (!contact) continue;
        const updates = {};
        if (raw.prenom) updates.prenom = raw.prenom;
        if (raw.nom) updates.nom = raw.nom;
        if (raw.telephone) updates.telephone = raw.telephone;
        if (raw.sexe) updates.sexe = raw.sexe;
        if (raw.ville) updates.ville = raw.ville;
        if (raw.entreprise) updates.entreprise = raw.entreprise;
        if (raw.statut) updates.statut = raw.statut;
        if (raw._category_name && categoryMap[raw._category_name])
          updates.category_id = categoryMap[raw._category_name];
        if (raw._distribution_name && distributionMap[raw._distribution_name])
          updates.distribution_id = distributionMap[raw._distribution_name];

        await contact.update(updates);

        // Handle tags for updated contacts too
        const contactTagIds = [
          ...new Set([
            ...(raw._tags || []).map((tagName) => tagMap[tagName]).filter(Boolean),
            ...batchTagIds,
          ]),
        ];
        if (contactTagIds.length > 0) {
          await contact.addTags(contactTagIds);
          // Trigger: Tag added for updated contact
          const tagNamesAdded = (raw._tags || []).concat(
            uniqueTags.filter((t) => batchTagIds.includes(tagMap[t]))
          );
          automationService.triggerAutomation('tag_added', { contact, tagNames: tagNamesAdded });
        }

        updatedCount++;
      }
    }

    res.json({
      message: `${created.length} contacts importés, ${updatedCount} mis à jour`,
      total_processed: contacts.length,
      contacts_created: created.length,
      duplicates_skipped: contacts.length - newContacts.length,
      contacts_updated: updatedCount,
      categories_created: categoryNames.length,
      distributions_created: distributionNames.length,
      tags_created: uniqueTags.length,
      segments_created: uniqueSegments.length,
      batches_processed: Math.ceil(processedContacts.length / 100),
      file_type: req.file.originalname.split('.').pop().toUpperCase(),
      import_time: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Import error:', err);
    res.status(500).json({ message: err.message });
  }
};
// Export CSV (supports optional filters: search, categoryId, distributionId, tags, segments, etc.)
exports.exportCsv = async (req, res) => {
  try {
    const where = await getContactsWhereClause(req.query);

    const contacts = await Contact.findAll({
      where,
      include: [
        { model: Category, as: 'category' },
        { model: Distribution, as: 'distribution' },
        { model: Tag, as: 'tags', through: { attributes: [] } },
      ],
      order: [['date_creation', 'DESC']],
    });

    const exportData = contacts.map((contact) => ({
      Prenom: contact.prenom,
      Nom: contact.nom,
      Email: contact.email,
      Telephone: contact.telephone,
      Sexe: contact.sexe,
      Ville: contact.ville,
      Entreprise: contact.entreprise,
      Type: contact.type_client,
      Statut: contact.statut,
      Categorie: contact.category?.nom || '',
      Distribution: contact.distribution?.nom || '',
      Tags: (contact.tags || []).map((t) => t.nom).join(', '),
      DateCreation: contact.date_creation,
    }));
    const meta = {
      ExportedBy: req.user?.email || 'inconnu',
      ExportedAt: new Date().toISOString(),
      Filters: {
        search: req.query.search || '',
        categoryId: req.query.categoryId || '',
        distributionId: req.query.distributionId || '',
        tagIds: req.query.tagIds || '',
        segmentIds: req.query.segmentIds || '',
        filterRules: req.query.filterRules || '',
      },
    };
    const metaLines = [
      `# Exported By,${meta.ExportedBy}`,
      `# Exported At,${meta.ExportedAt}`,
      `# Filters,search=${meta.Filters.search};categoryId=${meta.Filters.categoryId};distributionId=${meta.Filters.distributionId};tagIds=${meta.Filters.tagIds};segmentIds=${meta.Filters.segmentIds};filterRules=${meta.Filters.filterRules}`,
      `# Columns: Prenom, Nom, Email, Telephone, Sexe, Ville, Entreprise, Type, Statut, Categorie, Distribution, Tags, DateCreation`,
    ].join('\n');

    const csvBody = generateCsv(exportData);
    const csv = `${metaLines}\n${csvBody}`;
    res.header('Content-Type', 'text/csv');
    res.attachment(`contacts_${new Date().toISOString().slice(0, 10)}.csv`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Export Excel avec feuille Meta et feuille Contacts formatée
exports.exportExcel = async (req, res) => {
  try {
    const where = await getContactsWhereClause(req.query);

    const contacts = await Contact.findAll({
      where,
      include: [
        { model: Category, as: 'category' },
        { model: Distribution, as: 'distribution' },
        { model: Tag, as: 'tags', through: { attributes: [] } },
      ],
      order: [['date_creation', 'DESC']],
    });

    const rows = contacts.map((c) => ({
      Prenom: c.prenom,
      Nom: c.nom,
      Email: c.email,
      Telephone: c.telephone,
      Sexe: c.sexe,
      Ville: c.ville,
      Entreprise: c.entreprise,
      Type: c.type_client,
      Statut: c.statut,
      Categorie: c.category?.nom || '',
      Distribution: c.distribution?.nom || '',
      Tags: (c.tags || []).map((t) => t.nom).join(', '),
      DateCreation: c.date_creation,
    }));

    const XLSX = require('xlsx');
    const wb = XLSX.utils.book_new();

    // Meta sheet
    const metaData = [
      ['Exported By', req.user?.email || 'inconnu'],
      ['Exported At', new Date().toISOString()],
      [
        'Filters',
        `search=${req.query.search || ''}; categoryId=${req.query.categoryId || ''}; distributionId=${req.query.distributionId || ''}; tagIds=${req.query.tagIds || ''}; segmentIds=${req.query.segmentIds || ''}; filterRules=${req.query.filterRules || ''}`,
      ],
    ];
    const wsMeta = XLSX.utils.aoa_to_sheet(metaData);
    XLSX.utils.book_append_sheet(wb, wsMeta, 'Meta');

    // Contacts sheet
    const ws = XLSX.utils.json_to_sheet(rows, {
      header: [
        'Prenom',
        'Nom',
        'Email',
        'Telephone',
        'Sexe',
        'Ville',
        'Entreprise',
        'Type',
        'Statut',
        'Categorie',
        'Distribution',
        'Tags',
        'DateCreation',
      ],
    });
    // Column widths
    ws['!cols'] = [
      { wch: 14 },
      { wch: 18 },
      { wch: 28 },
      { wch: 16 },
      { wch: 10 },
      { wch: 16 },
      { wch: 18 },
      { wch: 12 },
      { wch: 12 },
      { wch: 18 },
      { wch: 18 },
      { wch: 22 },
      { wch: 20 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Contacts');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.attachment(`contacts_${new Date().toISOString().slice(0, 10)}.xlsx`);
    return res.send(buffer);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// Export template for import
exports.exportTemplate = async (req, res) => {
  try {
    const isMinimal = req.query.minimal === 'true';

    let templateData;
    if (isMinimal) {
      templateData = [
        {
          Prénom: 'Jean',
          Nom: 'Dupont',
          Email: 'jean.dupont@example.com',
          Téléphone: '+33123456789',
        },
        {
          Prénom: 'Marie',
          Nom: 'Martin',
          Email: 'marie.martin@example.com',
          Téléphone: '+32456789012',
        },
      ];
    } else {
      // Create a full template with both French and English column structures
      templateData = [
        {
          // French column names
          Prénom: 'Jean',
          Nom: 'Dupont',
          Email: 'jean.dupont@example.com',
          Téléphone: '+33123456789',
          Sexe: 'Homme',
          Statut: 'client',
          Ville: 'Paris',
          Entreprise: 'ABC Corp',
          Catégorie: 'Membres VIP',
          Distribution: 'Agence France',
          Tags: 'VIP, Golf, Paris',
        },
        {
          // English column names (also supported)
          firstname: 'Marie',
          lastname: 'Martin',
          email: 'marie.martin@example.com',
          telephone: '+32456789012',
          sex: 'Femme',
          status: 'prospect',
          city: 'Bruxelles',
          company: 'XYZ Ltd',
          category: 'Mailing Agences',
          distribution: 'Agence Belgique',
          tags: 'Nouveau, Bruxelles',
        },
      ];
    }

    const excelBuffer = generateExcel(templateData);
    res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.attachment('template_contacts.xlsx');
    res.send(excelBuffer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Bulk: generate tags for all contacts from their category and distribution
exports.generateAutoTagsForAll = async (req, res) => {
  try {
    const pageSize = Math.min(Number(req.query.batchSize) || 500, 2000);
    let page = 0;
    let processed = 0;
    // Loop by batches to avoid loading all at once

    while (true) {
      const contacts = await Contact.findAll({
        include: [
          { model: Category, as: 'category' },
          { model: Distribution, as: 'distribution' },
          { model: Tag, as: 'tags', through: { attributes: [] } },
        ],
        limit: pageSize,
        offset: page * pageSize,
        order: [['id', 'ASC']],
      });
      if (!contacts.length) break;
      for (const contact of contacts) {
        await ensureCategoryDistributionTags(contact);
        processed += 1;
      }
      page += 1;
    }
    return res.json({ message: 'Auto-tags generation completed', processed });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/**
 * GET /api/contacts/health/stats
 * Returns breakdown of list hygiene issues
 */
exports.getHealthStats = async (req, res) => {
  try {
    const sequelize = Contact.sequelize;

    // 1. Invalid Emails (basic syntax check)
    // We'll use a standard regex for MySQL
    const invalidCount = await Contact.count({
      where: sequelize.literal(
        "email NOT REGEXP '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\\\.[A-Za-z]{2,}$'"
      ),
    });

    // 2. Bounced Emails (unique contacts with bounce/error status)
    const bouncedCount = await EnvoiEmail.count({
      distinct: true,
      col: 'contact_id',
      where: {
        statut: { [Op.in]: ['bounce', 'erreur', 'spam'] },
      },
    });

    // 3. Inactive Contacts (received emails but 0 opens in last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const sixMonthsAgoStr = sixMonthsAgo.toISOString().slice(0, 19).replace('T', ' ');

    const inactiveCount = await Contact.count({
      where: {
        id: {
          [Op.in]: sequelize.literal(`(
            SELECT contact_id FROM envoi_email
            WHERE club_id = ${Number(req.clubId)}
            GROUP BY contact_id
            HAVING SUM(CASE WHEN date_ouverture IS NOT NULL OR date_clic IS NOT NULL THEN 1 ELSE 0 END) = 0
            AND MAX(date_envoi) < '${sixMonthsAgoStr}'
          )`),
        },
      },
    });

    res.json({
      invalid: invalidCount,
      bounced: bouncedCount,
      inactive: inactiveCount,
    });
  } catch (err) {
    console.error('[HealthStats] Error:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * POST /api/contacts/health/bulk-action
 * category: 'invalid', 'bounced', 'inactive'
 * action: 'disable', 'delete', 'tag'
 */
exports.bulkHealthAction = async (req, res) => {
  try {
    const { category, action, tagId } = req.body;
    const sequelize = Contact.sequelize;
    let contactIds = [];

    if (category === 'invalid') {
      const contacts = await Contact.findAll({
        attributes: ['id'],
        where: sequelize.literal(
          "email NOT REGEXP '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\\\.[A-Za-z]{2,}$'"
        ),
        raw: true,
      });
      contactIds = contacts.map((c) => c.id);
    } else if (category === 'bounced') {
      const envois = await EnvoiEmail.findAll({
        attributes: [[sequelize.fn('DISTINCT', sequelize.col('contact_id')), 'contact_id']],
        where: { statut: { [Op.in]: ['bounce', 'erreur', 'spam'] } },
        raw: true,
      });
      contactIds = envois.map((e) => e.contact_id);
    } else if (category === 'inactive') {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const sixMonthsAgoStr = sixMonthsAgo.toISOString().slice(0, 19).replace('T', ' ');

      const results = await sequelize.query(
        `
        SELECT contact_id FROM envoi_email
        WHERE club_id = ${Number(req.clubId)}
        GROUP BY contact_id
        HAVING SUM(CASE WHEN date_ouverture IS NOT NULL OR date_clic IS NOT NULL THEN 1 ELSE 0 END) = 0
        AND MAX(date_envoi) < '${sixMonthsAgoStr}'
      `,
        { type: sequelize.QueryTypes.SELECT }
      );
      contactIds = results.map((r) => r.contact_id);
    }

    if (!contactIds.length) {
      return res.json({ message: 'No contacts found', processed: 0 });
    }

    let processed = 0;
    if (action === 'disable') {
      const [count] = await Contact.update(
        { actif: false },
        { where: { id: { [Op.in]: contactIds } } }
      );
      processed = count;
    } else if (action === 'delete') {
      // Use transaction to ensure all associated records are deleted or none
      await sequelize.transaction(async (t) => {
        // 1. Delete associated records that would block contact deletion
        await EnvoiEmail.destroy({
          where: { contact_id: { [Op.in]: contactIds } },
          transaction: t,
        });
        await Note.destroy({ where: { contact_id: { [Op.in]: contactIds } }, transaction: t });
        await Rsvp.destroy({ where: { contact_id: { [Op.in]: contactIds } }, transaction: t });
        await ContactTag.destroy({
          where: { contact_id: { [Op.in]: contactIds } },
          transaction: t,
        });

        // 2. Delete the contacts
        const count = await Contact.destroy({
          where: { id: { [Op.in]: contactIds } },
          transaction: t,
        });
        processed = count;
      });
    } else if (action === 'tag' && tagId) {
      const tag = await Tag.findByPk(tagId);
      if (tag) {
        for (const id of contactIds) {
          const c = await Contact.findByPk(id);
          if (c) {
            await c.addTag(tag);
            processed++;
          }
        }
      }
    }

    res.json({ message: 'Action completed', processed });
  } catch (err) {
    console.error('[BulkHealthAction] Error:', err);
    res.status(500).json({ message: err.message });
  }
};
