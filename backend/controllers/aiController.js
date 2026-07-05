'use strict';

const { suggestCampaign } = require('../services/aiService');
const logger = require('../utils/logger');

exports.campaignSuggest = async (req, res) => {
  try {
    const { event_type, audience, recipient_count, tone, context } = req.body;

    if (!event_type) {
      return res.status(400).json({ message: 'Le champ event_type est requis.' });
    }

    const result = await suggestCampaign({
      eventType: event_type,
      audience: audience || 'membres du club',
      recipientCount: recipient_count ? Number(recipient_count) : null,
      tone: tone || 'amical',
      context: context || '',
    });

    logger.info(`[AI] Suggestion générée pour le club ${req.user?.club_id}`);
    res.json(result);
  } catch (err) {
    logger.error('[AI] campaignSuggest error:', err.message);
    const status = err.message.includes('API Groq invalide')
      ? 401
      : err.message.includes('Limite')
        ? 429
        : err.message.includes('non configuré')
          ? 503
          : 500;
    res.status(status).json({ message: err.message });
  }
};
