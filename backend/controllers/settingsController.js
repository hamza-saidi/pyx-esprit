const { Club } = require('../models');
const logger = require('../utils/logger');
const emailService = require('../services/emailService');
const nodemailer = require('nodemailer');

// GET /api/settings/email
exports.getEmailSettings = async (req, res) => {
  try {
    const club = await Club.findByPk(req.user.club_id, {
      attributes: [
        'email_provider',
        'smtp_host',
        'smtp_port',
        'smtp_secure',
        'smtp_user',
        'email_from_address',
        'email_from_name',
        'azure_tenant_id',
        'graph_from_email',
        'graph_consent_at',
      ],
    });
    if (!club) return res.status(404).json({ message: 'Organisation non trouvée' });

    res.json({
      email_provider: club.email_provider || (club.azure_tenant_id ? 'graph' : 'smtp'),
      smtp: {
        host: club.smtp_host || '',
        port: club.smtp_port || 587,
        secure: club.smtp_secure || false,
        user: club.smtp_user || '',
        pass_set: !!club.smtp_pass,
      },
      from: {
        address: club.email_from_address || '',
        name: club.email_from_name || '',
      },
      graph: {
        connected: !!club.azure_tenant_id,
        from_email: club.graph_from_email || null,
        consent_at: club.graph_consent_at || null,
        tenant_id: club.azure_tenant_id || null,
      },
    });
  } catch (err) {
    logger.error('[SETTINGS] getEmailSettings:', err.message);
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/settings/email
exports.updateEmailSettings = async (req, res) => {
  try {
    const { provider, smtp, from } = req.body;
    const club = await Club.findByPk(req.user.club_id);
    if (!club) return res.status(404).json({ message: 'Organisation non trouvée' });

    const updates = {};

    if (provider && ['smtp', 'graph'].includes(provider)) {
      updates.email_provider = provider;
    }

    if (from) {
      if (from.address !== undefined) updates.email_from_address = (from.address || '').trim();
      if (from.name !== undefined) updates.email_from_name = (from.name || '').trim();
    }

    if (smtp && provider !== 'graph') {
      if (smtp.host !== undefined) updates.smtp_host = (smtp.host || '').trim();
      if (smtp.port !== undefined) updates.smtp_port = parseInt(smtp.port, 10) || 587;
      if (smtp.secure !== undefined) updates.smtp_secure = !!smtp.secure;
      if (smtp.user !== undefined) updates.smtp_user = (smtp.user || '').trim();
      // Only update password if a new one is provided
      if (smtp.pass && smtp.pass.trim()) updates.smtp_pass = smtp.pass;
    }

    await club.update(updates);
    logger.info(`[SETTINGS] Email settings updated for club ${req.user.club_id}`);
    res.json({ success: true });
  } catch (err) {
    logger.error('[SETTINGS] updateEmailSettings:', err.message);
    res.status(500).json({ message: err.message });
  }
};

// POST /api/settings/email/test
exports.testEmailSettings = async (req, res) => {
  try {
    const { to, smtp } = req.body;
    if (!to || !to.includes('@')) {
      return res.status(400).json({ message: 'Adresse email de test invalide' });
    }

    const club = await Club.findByPk(req.user.club_id);
    if (!club) return res.status(404).json({ message: 'Organisation non trouvée' });

    // If smtp override provided in body (unsaved draft), test with those directly
    const testSmtp = smtp || null;

    await emailService.sendTestEmail(to, club, testSmtp);
    res.json({ success: true, message: `Email de test envoyé à ${to}` });
  } catch (err) {
    logger.error('[SETTINGS] testEmail:', err.message);
    res.status(500).json({ message: err.message || "Échec de l'envoi de l'email de test" });
  }
};
