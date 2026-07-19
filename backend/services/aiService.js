'use strict';

const logger = require('../utils/logger');

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

// ── Curated golf imagery from Unsplash (confirmed working IDs) ─────────────
const HERO_IMAGES = {
  tournament: {
    url: 'https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?auto=format&fit=crop&w=640&q=80',
    alt: 'Compétition de golf',
  },
  newsletter: {
    url: 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?auto=format&fit=crop&w=640&q=80',
    alt: 'Parcours de golf',
  },
  welcome: {
    url: 'https://images.unsplash.com/photo-1574175042697-ed11d11a7e41?auto=format&fit=crop&w=640&q=80',
    alt: 'Bienvenue au club de golf',
  },
  birthday: {
    url: 'https://images.unsplash.com/photo-1521229019833-cfe4c8eadc13?auto=format&fit=crop&w=640&q=80',
    alt: 'Golf au coucher du soleil',
  },
  reengagement: {
    url: 'https://images.unsplash.com/photo-1521229019833-cfe4c8eadc13?auto=format&fit=crop&w=640&q=80',
    alt: 'Retour au golf',
  },
  results: {
    url: 'https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?auto=format&fit=crop&w=640&q=80',
    alt: 'Résultats de tournoi',
  },
  announcement: {
    url: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?auto=format&fit=crop&w=640&q=80',
    alt: 'Club de golf premium',
  },
  subscription: {
    url: 'https://images.unsplash.com/photo-1562622944559-28f7c74e8cf9?auto=format&fit=crop&w=640&q=80',
    alt: 'Adhésion club de golf',
  },
  event: {
    url: 'https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?auto=format&fit=crop&w=640&q=80',
    alt: 'Événement golf',
  },
  promotion: {
    url: 'https://images.unsplash.com/photo-1530028828-25e8c5236c78?auto=format&fit=crop&w=640&q=80',
    alt: 'Équipement golf',
  },
};

const FALLBACK_IMAGE = {
  url: 'https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?auto=format&fit=crop&w=640&q=80',
  alt: 'Golf',
};

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

// ── Professional table-based HTML template ─────────────────────────────────
function buildEmailHtml(heroUrl, heroAlt, fields, style) {
  const {
    greeting = 'Bonjour {{prenom}},',
    paragraph1 = '',
    paragraph2 = '',
    paragraph3 = '',
    ctaLabel = 'En savoir plus',
    signature = 'Cordialement,<br><strong style="color:#1a1a2e;">L\'équipe Golf Huub</strong>',
    preheader = '',
  } = fields;

  const heroBlock =
    style !== 'minimal'
      ? `
      <!-- Hero image -->
      <tr>
        <td style="padding:0;line-height:0;">
          <img src="${heroUrl}" width="640" alt="${heroAlt}"
               style="display:block;width:100%;height:auto;max-height:300px;object-fit:cover;"/>
        </td>
      </tr>`
      : '';

  return `<div style="background-color:#f0f2f5;margin:0;padding:0;">
  <!--[if mso]><table width="640" align="center" cellspacing="0" cellpadding="0" border="0"><tr><td><![endif]-->
  <table width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#f0f2f5"
         style="background-color:#f0f2f5;padding:24px 0;">
    <tr>
      <td align="center" valign="top">
        <table width="640" cellspacing="0" cellpadding="0" border="0"
               style="max-width:640px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10);">

          <!-- ── HEADER ──────────────────────────────────────── -->
          <tr>
            <td style="background:#1a1a2e;padding:22px 32px;text-align:center;">
              <p style="margin:0;color:#FFE01B;font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:700;letter-spacing:3px;text-transform:uppercase;line-height:1;">GOLF HUUB</p>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.45);font-size:10px;letter-spacing:2.5px;text-transform:uppercase;font-family:Arial,Helvetica,sans-serif;">Premium Golf Experience</p>
            </td>
          </tr>
          ${heroBlock}

          <!-- ── MAIN CONTENT ────────────────────────────────── -->
          <tr>
            <td style="padding:40px 40px 32px;">

              <!-- Greeting -->
              <h2 style="margin:0 0 22px;color:#1a1a2e;font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:700;line-height:1.3;">${greeting}</h2>

              <!-- Paragraphs -->
              <p style="margin:0 0 18px;color:#374151;font-size:16px;line-height:1.75;font-family:Arial,Helvetica,sans-serif;">${paragraph1}</p>
              <p style="margin:0 0 18px;color:#374151;font-size:16px;line-height:1.75;font-family:Arial,Helvetica,sans-serif;">${paragraph2}</p>
              ${paragraph3 ? `<p style="margin:0 0 28px;color:#374151;font-size:16px;line-height:1.75;font-family:Arial,Helvetica,sans-serif;">${paragraph3}</p>` : '<p style="margin:0 0 28px;"></p>'}

              <!-- CTA button — table-based for Outlook compat -->
              <table cellspacing="0" cellpadding="0" border="0" style="margin:4px 0 32px;">
                <tr>
                  <td align="center" bgcolor="#0a84d6"
                      style="border-radius:5px;mso-padding-alt:0 0 0 0;">
                    <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="#" style="height:50px;v-text-anchor:middle;width:200px;" arcsize="6%" strokecolor="#0a84d6" fillcolor="#0a84d6"><w:anchorlock/><center><![endif]-->
                    <a href="#"
                       style="display:inline-block;padding:15px 36px;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;font-family:Arial,Helvetica,sans-serif;letter-spacing:0.3px;line-height:1;">${ctaLabel}</a>
                    <!--[if mso]></center></v:roundrect><![endif]-->
                  </td>
                </tr>
              </table>

              <!-- Signature -->
              <p style="margin:0;padding-top:22px;border-top:1px solid #f1f5f9;color:#374151;font-size:14px;font-family:Arial,Helvetica,sans-serif;line-height:1.7;">${signature}</p>

            </td>
          </tr>

          <!-- ── FOOTER ──────────────────────────────────────── -->
          <tr>
            <td style="background:#1a1a2e;padding:22px 32px;text-align:center;">
              <p style="margin:0 0 8px;color:rgba(255,255,255,0.3);font-size:11px;font-family:Arial,Helvetica,sans-serif;letter-spacing:1px;text-transform:uppercase;">Golf Huub · Club Management Platform</p>
              <p style="margin:0;color:rgba(255,255,255,0.25);font-size:11px;font-family:Arial,Helvetica,sans-serif;">
                <a href="{{unsubscribe_link}}" style="color:rgba(255,255,255,0.45);text-decoration:none;">Se désabonner</a>
                &nbsp;&nbsp;·&nbsp;&nbsp;
                <a href="{{view_in_browser_link}}" style="color:rgba(255,255,255,0.45);text-decoration:none;">Voir dans le navigateur</a>
              </p>
              <!-- Preheader hidden text -->
              ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;color:#1a1a2e;line-height:1px;">${preheader}&nbsp;‌&zwnj;&nbsp;‌&zwnj;&nbsp;‌&zwnj;&nbsp;‌&zwnj;&nbsp;‌&zwnj;&nbsp;‌&zwnj;&nbsp;‌&zwnj;</div>` : ''}
              {{tracking_pixel}}
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
  <!--[if mso]></td></tr></table><![endif]-->
</div>`;
}

// ── Validate AI-filled placeholders are gone ───────────────────────────────
function validateFields(fields) {
  return fields.greeting && fields.paragraph1 && fields.paragraph2 && fields.ctaLabel;
}

// ── Main export ────────────────────────────────────────────────────────────
exports.suggestCampaign = async ({
  eventType,
  audience,
  recipientCount,
  tone,
  context,
  style = 'full',
}) => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey)
    throw new Error('GROQ_API_KEY non configuré. Obtenez une clé gratuite sur console.groq.com');

  const eventLabel = EVENT_LABELS[eventType] || eventType;
  const toneLabel = TONE_LABELS[tone] || 'amical et chaleureux';
  const heroImg = HERO_IMAGES[eventType] || FALLBACK_IMAGE;
  const withImage = style !== 'minimal';

  const systemPrompt =
    'Tu es un expert en email marketing golf. Tu génères des emails professionnels en français. ' +
    'Tu réponds UNIQUEMENT en JSON valide, sans markdown ni backtick.';

  const userPrompt = `Génère un email marketing pour un club de golf.

PARAMÈTRES :
- Occasion : ${eventLabel}
- Ton : ${toneLabel}
- Destinataires : ${audience || 'membres du club'}${recipientCount ? ` (${recipientCount} contacts)` : ''}
${context ? `- Contexte : ${context}` : ''}

Tu dois générer un JSON avec ces champs EXACTEMENT (toutes les valeurs en français) :

{
  "sujet": "Objet email percutant — max 55 caractères, sans majuscules excessives",
  "preheader": "Texte d'aperçu — max 90 caractères, complète l'objet sans le répéter",
  "greeting": "Salutation — commencer par 'Bonjour {{prenom}},' puis 1 ligne accroche (ex: 'Bonjour {{prenom}}, nous avons une excellente nouvelle pour vous !')",
  "paragraph1": "Intro engageante — 2-3 phrases contextuelles sur l'occasion",
  "paragraph2": "Corps principal — 3-4 phrases avec les informations importantes, dates, détails",
  "paragraph3": "Clôture — 1-2 phrases avec urgence ou invitation à l'action",
  "ctaLabel": "Texte du bouton CTA — 3-6 mots percutants (ex: 'Réserver ma place', 'Découvrir l'offre')",
  "signature": "HTML de signature complète (ex: Cordialement,<br><strong>L'équipe Golf Huub</strong><br><span style='color:#6b7280;font-size:13px;'>Votre club partenaire</span>)"
}

Réponds UNIQUEMENT avec le JSON ci-dessus (aucun markdown, aucun commentaire).`;

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.68,
      max_tokens: 1200,
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

  let fields;
  try {
    fields = JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Format de réponse IA invalide.');
    fields = JSON.parse(match[0]);
  }

  if (!validateFields(fields)) throw new Error('Champs incomplets dans la réponse IA.');

  const html = buildEmailHtml(heroImg.url, heroImg.alt, fields, style);

  logger.info(`[AI] Email generated — type=${eventType} style=${style} subject="${fields.sujet}"`);

  return {
    sujet: (fields.sujet || '').trim(),
    preheader: (fields.preheader || '').trim(),
    html,
    heroImageUrl: withImage ? heroImg.url : null,
  };
};
