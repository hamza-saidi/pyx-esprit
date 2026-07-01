const path = require('path');
const logger = require('../utils/logger');
const fs = require('fs');
const emailService = require('../services/emailService');
const { Contact, Tag, EnvoiEmail } = require('../models');
const { Op } = require('sequelize');
const { runWithTenant } = require('../utils/tenantContext');

// /unsubscribe is public (a link in an email, no JWT) - authorization is by
// possession of the unique token_tracking value, not by club membership.
const SYSTEM_CONTEXT = { clubId: null, isSystem: true };

// POST /api/mailer/send
// Accepts: to, subject, html, signatureHtml (optional), and files as attachments
exports.send = async (req, res) => {
  try {
    const toRaw = String(req.body.to || '').trim();
    const subject = String(req.body.subject || '').trim() || '(Sans sujet)';
    let html = String(req.body.html || '');
    const signatureHtml = String(req.body.signatureHtml || '');

    // Supporter plusieurs emails séparés par virgule / point-virgule
    const recipients = toRaw
      .split(/[,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    const emailRegex = /^[^@]+@[^@]+\.[^@]+$/;
    if (!recipients.length || recipients.some((e) => !emailRegex.test(e))) {
      return res.status(400).json({ message: 'Champ "to" invalide' });
    }
    if (signatureHtml) {
      html += `\n\n<div style="margin-top:16px;border-top:1px solid #eee;padding-top:12px">${signatureHtml}</div>`;
    }

    const files = (req.files || []).map((f) => ({
      filename: f.originalname || f.filename,
      path: f.path,
    }));

    let processed = 0;
    let lastMessageId = null;
    for (const email of recipients) {
      const result = await emailService.sendWithAttachments(email, subject, html, files);
      processed += 1;
      lastMessageId = result?.messageId || lastMessageId;
    }

    // Clean temp files after sending
    try {
      (req.files || []).forEach((f) => fs.existsSync(f.path) && fs.unlinkSync(f.path));
    } catch {}

    return res.json({ success: true, processed, messageId: lastMessageId });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Erreur envoi email' });
  }
};

// GET /api/mailer/recipients/count?tagIds=1,2,3
exports.countRecipientsByTags = async (req, res) => {
  try {
    const tagIds = String(req.query.tagIds || '')
      .split(',')
      .map((x) => Number(x))
      .filter(Boolean);
    if (!tagIds.length) return res.json({ count: 0 });
    const contacts = await Contact.findAll({
      include: [
        { model: Tag, as: 'tags', where: { id: { [Op.in]: tagIds } }, through: { attributes: [] } },
      ],
      where: { actif: true },
      attributes: ['id', 'email'],
    });
    const emails = new Set(contacts.map((c) => (c.email || '').toLowerCase()).filter(Boolean));
    return res.json({ count: emails.size });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Erreur comptage destinataires' });
  }
};

// POST /api/mailer/send-by-tags
// body: { tagIds: number[], subject, html, signatureHtml?, attachments(files), batchSize?, perSecond? }
exports.sendByTags = async (req, res) => {
  try {
    const raw =
      (req.body && (req.body.tagIds !== undefined ? req.body.tagIds : req.body['tagIds[]'])) ??
      null;
    let tagIds = [];
    if (Array.isArray(raw)) tagIds = raw.map(Number).filter(Boolean);
    else if (typeof raw === 'string') tagIds = String(raw).split(',').map(Number).filter(Boolean);
    const subject = String(req.body.subject || '').trim();
    let html = String(req.body.html || '');
    const signatureHtml = String(req.body.signatureHtml || '');
    const batchSize = Math.max(1, Math.min(Number(req.body.batchSize) || 300, 1000));
    const perSecond = Math.max(
      1,
      Math.min(
        Number(req.body.perSecond) || require('../config/email').limits?.emailsPerSecond || 5,
        50
      )
    );
    if (
      !tagIds.length &&
      !req.body.segment_id &&
      !(req.body.contacts_ids || req.body['contacts_ids[]'])
    ) {
      return res.status(400).json({ message: 'Cible (tags, segment ou contacts) requise' });
    }
    if (!subject || !html) return res.status(400).json({ message: 'Sujet et contenu requis' });
    if (signatureHtml)
      html += `\n\n<div style="margin-top:16px;border-top:1px solid #eee;padding-top:12px">${signatureHtml}</div>`;

    // Gather recipients
    const segmentId = req.body.segment_id ? Number(req.body.segment_id) : null;
    const rawContactIds =
      (req.body.contacts_ids !== undefined ? req.body.contacts_ids : req.body['contacts_ids[]']) ??
      null;
    let contactIds = [];
    if (Array.isArray(rawContactIds)) contactIds = rawContactIds.map(Number).filter(Boolean);
    else if (typeof rawContactIds === 'string')
      contactIds = String(rawContactIds).split(',').map(Number).filter(Boolean);

    const whereClause = { actif: true };
    const include = [];

    if (tagIds.length > 0) {
      include.push({
        model: Tag,
        as: 'tags',
        where: { id: { [Op.in]: tagIds } },
        through: { attributes: [] },
      });
    }

    if (segmentId) {
      const segment = await require('../models').Segment.findByPk(segmentId);
      if (segment && segment.criteres) {
        const criteres =
          typeof segment.criteres === 'string' ? JSON.parse(segment.criteres) : segment.criteres;
        // Basic implementation: if segment has criteria, we might need a more complex query.
        // For now, let's just add the segment filter if it's simple or use a subquery.
        // (Simplified for this context as full segment resolution is complex)
      }
    }

    const contacts = await Contact.findAll({
      include,
      where: {
        [Op.or]: [
          tagIds.length > 0 || segmentId ? whereClause : null,
          contactIds.length > 0 ? { id: { [Op.in]: contactIds } } : null,
        ].filter(Boolean),
      },
      attributes: ['id', 'email'],
      distinct: true,
    });
    const recipients = [
      ...new Set(contacts.map((c) => (c.email || '').toLowerCase()).filter(Boolean)),
    ];
    if (!recipients.length) return res.json({ success: true, processed: 0, batches: 0 });

    // Prepare attachments (single read per file)
    const files = (req.files || []).map((f) => ({
      filename: f.originalname || f.filename,
      path: f.path,
    }));

    let processed = 0;
    let batches = 0;
    let errors = 0;
    for (let i = 0; i < recipients.length; i += batchSize) {
      const slice = recipients.slice(i, i + batchSize);
      batches += 1;
      // Rate-limit inside the batch: perSecond parallel sends per second
      for (let j = 0; j < slice.length; j += perSecond) {
        const windowRecipients = slice.slice(j, j + perSecond);
        const results = await Promise.allSettled(
          windowRecipients.map((email) =>
            emailService.sendWithAttachments(email, subject, html, files)
          )
        );
        results.forEach((r) => {
          if (r.status === 'fulfilled') processed += 1;
          else errors += 1;
        });
        if (j + perSecond < slice.length) await new Promise((r) => setTimeout(r, 1000));
      }
      // small pause between batches
      if (i + batchSize < recipients.length) await new Promise((r) => setTimeout(r, 1500));
    }

    try {
      (req.files || []).forEach((f) => fs.existsSync(f.path) && fs.unlinkSync(f.path));
    } catch {}
    return res.json({
      success: true,
      processed,
      errors,
      total: recipients.length,
      batches,
      batchSize,
      perSecond,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Erreur envoi par tags' });
  }
};

const parseMetadata = (source) => {
  if (!source) return {};
  if (typeof source === 'object') return { ...source };
  if (typeof source === 'string') {
    try {
      const parsed = JSON.parse(source);
      return typeof parsed === 'object' && parsed ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
};

exports.unsubscribe = async (req, res) =>
  runWithTenant(SYSTEM_CONTEXT, async () => {
    try {
      const token = req.params.token || req.body.token || req.query.token;
      if (!token) {
        return res
          .status(400)
          .json({ success: false, message: 'Lien de désabonnement invalide (token manquant).' });
      }

      const envoi = await EnvoiEmail.findOne({ where: { token_tracking: token } });
      if (!envoi) {
        return res
          .status(404)
          .json({ success: false, message: 'Lien de désabonnement invalide ou expiré.' });
      }

      const contact = await Contact.findByPk(envoi.contact_id);
      if (!contact) {
        return res
          .status(404)
          .json({ success: false, message: 'Contact introuvable pour ce lien.' });
      }

      const metadata = parseMetadata(contact.metadata);
      metadata.unsubscribedAt = new Date().toISOString();
      metadata.unsubscribedToken = token;
      metadata.unsubscribedCampaignId = envoi.campagne_id;

      const updates = {
        metadata,
      };

      if (contact.actif) {
        updates.actif = false;
      }

      if (contact.consentement_rgpd) {
        updates.consentement_rgpd = false;
      }

      await contact.update(updates);
      await envoi.update({ actif: false });

      return res.json({
        success: true,
        email: contact.email,
        message: 'Votre adresse a bien été désabonnée de nos communications.',
      });
    } catch (err) {
      logger.error('Erreur désabonnement:', err);
      return res
        .status(500)
        .json({ success: false, message: 'Une erreur est survenue lors du désabonnement.' });
    }
  });
