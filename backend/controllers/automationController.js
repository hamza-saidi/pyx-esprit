const listAutomations = require('../use-cases/automation/listAutomations');
const toggleAutomation = require('../use-cases/automation/toggleAutomation');
const createCustomAutomation = require('../use-cases/automation/createCustomAutomation');
const updateAutomation = require('../use-cases/automation/updateAutomation');
const deleteAutomation = require('../use-cases/automation/deleteAutomation');
const { Contact, Tag, EnvoiEmail, Automation } = require('../models');
const emailService = require('../services/emailService');
const { Op, fn, col, where: seqWhere } = require('sequelize');

exports.listAutomations = async (req, res, next) => {
  try {
    const automations = await listAutomations({ clubId: req.clubId });
    res.json(automations);
  } catch (err) {
    next(err);
  }
};

exports.toggleAutomation = async (req, res, next) => {
  try {
    const automation = await toggleAutomation(req.params.id, req.body, { clubId: req.clubId });
    res.json(automation);
  } catch (err) {
    next(err);
  }
};

exports.createCustomAutomation = async (req, res, next) => {
  try {
    const automation = await createCustomAutomation(req.body, { clubId: req.clubId });
    res.status(201).json(automation);
  } catch (err) {
    next(err);
  }
};

exports.deleteAutomation = async (req, res, next) => {
  try {
    await deleteAutomation(req.params.id, { clubId: req.clubId });
    res.json({ message: 'Automation deleted successfully' });
  } catch (err) {
    next(err);
  }
};

exports.updateAutomation = async (req, res, next) => {
  try {
    const automation = await updateAutomation(req.params.id, req.body, { clubId: req.clubId });
    res.json(automation);
  } catch (err) {
    next(err);
  }
};

// Birthday trigger — contacts with birthday today, filtered by tag 'Membre VIP'
exports.listBirthdaysToday = async (req, res, next) => {
  try {
    const today = new Date();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const contacts = await Contact.findAll({
      where: seqWhere(fn('DATE_FORMAT', col('date_naissance'), '%m-%d'), `${mm}-${dd}`),
      include: [
        { model: Tag, as: 'tags', through: { attributes: [] }, where: { nom: 'Membre VIP' } },
      ],
      attributes: ['id', 'prenom', 'nom', 'email', 'date_naissance'],
    });
    res.json({ count: contacts.length, contacts });
  } catch (err) {
    next(err);
  }
};

exports.sendBirthdaysToday = async (req, res, next) => {
  try {
    const today = new Date();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');

    const birthdayAutomation = await Automation.findOne({ where: { type: 'birthday' } });
    const tagFilter = birthdayAutomation?.config?.tagFilter || 'Membre VIP';

    const contacts = await Contact.findAll({
      where: seqWhere(fn('DATE_FORMAT', col('date_naissance'), '%m-%d'), `${mm}-${dd}`),
      include: [{ model: Tag, as: 'tags', through: { attributes: [] }, where: { nom: tagFilter } }],
      attributes: ['id', 'prenom', 'nom', 'email'],
    });

    let sent = 0,
      errors = 0;
    const results = [];
    for (const c of contacts) {
      try {
        const campagneShim = {
          id: `bday-${today.toISOString().slice(0, 10)}`,
          sujet: `Joyeux anniversaire ${c.prenom}!`,
          contenu_html: `<p>Joyeux anniversaire ${c.prenom} ${c.nom} 🎉</p><p>Toute l'équipe vous souhaite une merveilleuse journée.</p>`,
          contenu_texte: `Joyeux anniversaire ${c.prenom} ${c.nom} !`,
        };
        const envoiShim = {
          contact_id: c.id,
          email_destinataire: c.email,
          token_tracking: `bday-${c.id}-${Date.now()}`,
        };
        await emailService.envoyerEmail(campagneShim, envoiShim);
        sent++;
        results.push({ id: c.id, email: c.email, status: 'sent' });
        try {
          await EnvoiEmail.create({
            campagne_id: null,
            contact_id: c.id,
            email_destinataire: c.email,
            statut: 'envoyé',
            date_envoi: new Date(),
            token_tracking: envoiShim.token_tracking,
            actif: true,
          });
        } catch {}
      } catch (e) {
        errors++;
        results.push({ id: c.id, email: c.email, status: 'error', error: e.message });
      }
    }
    res.json({ sent, errors, total: contacts.length, results });
  } catch (err) {
    next(err);
  }
};
