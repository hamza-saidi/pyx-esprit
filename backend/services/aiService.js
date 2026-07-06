'use strict';

const logger = require('../utils/logger');

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

const EVENT_LABELS = {
  tournament: 'Tournoi / Compétition',
  newsletter: 'Newsletter mensuelle',
  welcome: "Accueil d'un nouveau membre",
  birthday: "Email d'anniversaire",
  reengagement: 'Ré-engagement de membres inactifs',
  results: 'Résultats de compétition',
  announcement: 'Annonce importante',
  subscription: "Renouvellement d'abonnement",
  event: 'Événement spécial',
  promotion: 'Offre / Promotion',
};

const TONE_LABELS = {
  formel: 'formel et professionnel',
  amical: 'amical et chaleureux',
  enthousiaste: 'enthousiaste et dynamique',
};

exports.suggestCampaign = async ({ eventType, audience, recipientCount, tone, context }) => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey)
    throw new Error('GROQ_API_KEY non configuré. Obtenez une clé gratuite sur console.groq.com');

  const eventLabel = EVENT_LABELS[eventType] || eventType;
  const toneLabel = TONE_LABELS[tone] || 'amical et chaleureux';

  const userPrompt = `Tu génères un email marketing professionnel.

Paramètres:
- Occasion: ${eventLabel}
- Destinataires: ${audience || 'contacts de la liste'}${recipientCount ? ` (${recipientCount} contacts)` : ''}
- Ton: ${toneLabel}
${context ? `- Contexte: ${context}` : ''}

Génère:
1. Un objet d'email percutant (max 55 caractères, sans majuscules excessives)
2. Le contenu HTML complet de l'email

Structure de l'email attendue:
- Salutation personnalisée (utilise "Bonjour" ou similaire)
- Corps principal: 2-3 paragraphes pertinents et engageants
- Un bouton d'appel à l'action clair
- Signature de l'expéditeur

Contraintes HTML:
- Compatible email (balises: div, h2, p, strong, em, ul, li, a, br)
- Style inline pour les éléments clés
- Bouton CTA: style="display:inline-block;background:#2563eb;color:#ffffff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;font-size:15px"
- Wrapper: style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1e293b;line-height:1.6"
- En français

Réponds UNIQUEMENT avec un objet JSON (pas de markdown, pas de code block):
{"sujet":"...","html":"..."}`;

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        {
          role: 'system',
          content:
            'Tu es un expert en email marketing. Tu génères des emails professionnels et engageants en français. Tu réponds UNIQUEMENT en JSON valide, sans markdown ni code block.',
        },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.72,
      max_tokens: 2048,
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    logger.error('[AI] Groq error:', res.status, body.slice(0, 300));
    if (res.status === 401) throw new Error('Clé API Groq invalide.');
    if (res.status === 429)
      throw new Error('Limite de requêtes Groq atteinte. Réessayez dans 1 minute.');
    throw new Error(`Erreur Groq (${res.status})`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Réponse vide de l'IA.");

  try {
    const parsed = JSON.parse(content);
    if (!parsed.sujet || !parsed.html) throw new Error('Champs manquants dans la réponse IA.');
    logger.info('[AI] Campaign suggestion generated successfully.');
    return { sujet: parsed.sujet.trim(), html: parsed.html };
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Format de réponse IA invalide.');
    const fallback = JSON.parse(match[0]);
    return { sujet: (fallback.sujet || '').trim(), html: fallback.html || '' };
  }
};
