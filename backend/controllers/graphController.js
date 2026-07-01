const { Club } = require('../models');
const logger = require('../utils/logger');

// GET /api/auth/graph/status
// Returns whether the current club has completed Microsoft Graph admin consent.
exports.getStatus = async (req, res) => {
  try {
    const club = await Club.findByPk(req.user.club_id);
    if (!club) return res.status(404).json({ message: 'Club non trouvé' });

    res.json({
      connected: !!club.azure_tenant_id,
      azure_tenant_id: club.azure_tenant_id || null,
      graph_from_email: club.graph_from_email || null,
      graph_consent_at: club.graph_consent_at || null,
    });
  } catch (err) {
    logger.error('[GRAPH] getStatus error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

// GET /api/auth/graph/connect?from_email=marketing@club.com
// Generates the Microsoft admin consent URL. The authenticated admin opens it
// in their browser; Microsoft redirects to /api/auth/graph/callback on accept.
exports.getConsentUrl = async (req, res) => {
  try {
    const clientId = process.env.GRAPH_CLIENT_ID;
    if (!clientId) {
      return res.status(500).json({ message: 'GRAPH_CLIENT_ID non configuré sur le serveur' });
    }

    const fromEmail = (req.query.from_email || '').trim();
    if (!fromEmail) {
      return res.status(400).json({ message: 'Le paramètre from_email est requis' });
    }

    const clubId = req.user.club_id;
    // state encodes clubId + fromEmail so the callback can associate the consent
    const state = Buffer.from(JSON.stringify({ clubId, fromEmail })).toString('base64url');

    const baseUrl = process.env.PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
    const redirectUri = encodeURIComponent(`${baseUrl}/api/auth/graph/callback`);

    const consentUrl =
      `https://login.microsoftonline.com/common/adminconsent` +
      `?client_id=${clientId}` +
      `&redirect_uri=${redirectUri}` +
      `&state=${state}`;

    logger.info(`[GRAPH] Consent URL generated for club ${clubId} (from: ${fromEmail})`);
    res.json({ consentUrl, from_email: fromEmail });
  } catch (err) {
    logger.error('[GRAPH] getConsentUrl error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

// GET /api/auth/graph/callback
// Microsoft redirects here after admin consent. No JWT available (browser
// redirect), so security relies on the signed `state` parameter.
// On success, stores azure_tenant_id + graph_from_email on the Club row.
exports.handleCallback = async (req, res) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

  try {
    const { tenant, state, error, error_description } = req.query;

    if (error) {
      logger.warn(`[GRAPH] Admin consent refused: ${error} — ${error_description}`);
      return res.redirect(
        `${frontendUrl}/settings?graph_error=${encodeURIComponent(error_description || error)}`
      );
    }

    if (!state || !tenant) {
      return res.status(400).send('Paramètres manquants dans le callback Microsoft');
    }

    let clubId, fromEmail;
    try {
      ({ clubId, fromEmail } = JSON.parse(Buffer.from(state, 'base64url').toString('utf8')));
    } catch (_) {
      return res.status(400).send('Paramètre state invalide');
    }

    if (!clubId) {
      return res.status(400).send('Club ID manquant dans le state');
    }

    await Club.update(
      {
        azure_tenant_id: tenant,
        graph_from_email: fromEmail || null,
        graph_consent_at: new Date(),
      },
      { where: { id: clubId } }
    );

    logger.info(`[GRAPH] Admin consent enregistré — club ${clubId}, tenant ${tenant}`);
    res.redirect(`${frontendUrl}/settings?graph_connected=true`);
  } catch (err) {
    logger.error('[GRAPH] handleCallback error:', err.message);
    res.status(500).send('Erreur interne lors du traitement du consentement');
  }
};

// PATCH /api/auth/graph/from-email   { "graph_from_email": "noreply@club.com" }
// Lets the club admin update the sender mailbox without re-doing the full
// consent flow (useful when they want to change the sending address).
exports.updateFromEmail = async (req, res) => {
  try {
    const { graph_from_email } = req.body;
    if (!graph_from_email || !graph_from_email.includes('@')) {
      return res.status(400).json({ message: 'graph_from_email invalide' });
    }

    await Club.update({ graph_from_email }, { where: { id: req.user.club_id } });

    logger.info(
      `[GRAPH] graph_from_email updated for club ${req.user.club_id}: ${graph_from_email}`
    );
    res.json({ message: 'Adresse expéditeur mise à jour', graph_from_email });
  } catch (err) {
    logger.error('[GRAPH] updateFromEmail error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/auth/graph/disconnect
// Removes the club's Graph consent (admin can redo the flow to reconnect).
// Also invalidates the cached access token in Redis.
exports.disconnect = async (req, res) => {
  try {
    const clubId = req.user.club_id;

    // Read the tenant ID before nulling it so we can invalidate the cached token
    const club = await Club.findByPk(clubId);
    const previousTenantId = club?.azure_tenant_id || null;

    await Club.update(
      { azure_tenant_id: null, graph_from_email: null, graph_consent_at: null },
      { where: { id: clubId } }
    );

    // Best-effort Redis token cache invalidation
    if (previousTenantId) {
      try {
        const emailService = require('../services/emailService');
        if (emailService._redis) {
          await emailService._redis.del(`graph:token:${previousTenantId}`);
        }
      } catch (_) {}
    }

    logger.info(`[GRAPH] Consent révoqué pour le club ${clubId}`);
    res.json({ message: 'Connexion Microsoft Graph supprimée' });
  } catch (err) {
    logger.error('[GRAPH] disconnect error:', err.message);
    res.status(500).json({ message: err.message });
  }
};
