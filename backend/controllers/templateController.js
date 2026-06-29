const { ModeleEmail } = require('../models');
const { Op } = require('sequelize');
const OpenAI = require('openai');
const { pick } = require('../utils/pick');

const TEMPLATE_FIELDS = ['nom', 'contenu_html', 'blocks_json', 'design_json'];

// CRUD
exports.create = async (req, res) => {
  try {
    const payload = {
      nom: req.body.nom,
      contenu_html: req.body.contenu_html,
      blocks_json: req.body.blocks_json || null,
      design_json: req.body.design_json || null,
    };
    const template = await ModeleEmail.create(payload);
    res.status(201).json(template);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    const templates = await ModeleEmail.findAll({ order: [['date_creation', 'DESC']] });
    res.json(templates);
  } catch (err) {
    try {
      const msg = err?.response?.data?.error?.message || err.message || 'Erreur OpenAI';
      const status = err?.response?.status || 500;
      // Fallback: générer un HTML simple si OpenAI échoue
      const texte = req.body?.texte || '';
      const paragraphs = (texte || '')
        .split(/\n{1,}/)
        .map((p) => p.trim())
        .filter(Boolean);
      const htmlBody = paragraphs
        .map((p) => `<p style="margin:0 0 12px">${p.replace(/\n/g, '<br/>')}</p>`)
        .join('\n');
      const fallbackHtml = `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f7f7;padding:24px">
          <tr><td align="center">
            <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;font-family:Arial, sans-serif;color:#333">
              <tr><td style="padding:16px;background:#1976d2;color:#fff;font-size:20px;font-weight:bold">Votre Club</td></tr>
              <tr><td style="padding:20px">
                ${htmlBody || '<p style="margin:0">(Votre contenu ici)</p>'}
                <p style="margin:20px 0 0"><a href="#" style="display:inline-block;background:#1976d2;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none">Appel à l\'action</a></p>
              </td></tr>
              <tr><td style="padding:16px;background:#f0f0f0;color:#666;font-size:12px;text-align:center">Vous recevez cet email de notre part. <a href="{{unsubscribe_link}}">Se désabonner</a></td></tr>
            </table>
          </td></tr>
        </table>
      `.trim();
      return res.status(status).json({ message: msg, contenu_html: fallbackHtml, fallback: true });
    } catch (e) {
      return res.status(500).json({ message: err.message || 'Erreur serveur' });
    }
  }
};

exports.getOne = async (req, res) => {
  try {
    const template = await ModeleEmail.findByPk(req.params.id);
    if (!template) return res.status(404).json({ message: 'Modèle non trouvé' });
    res.json(template);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const template = await ModeleEmail.findByPk(req.params.id);
    if (!template) return res.status(404).json({ message: 'Modèle non trouvé' });
    await template.update(pick(req.body, TEMPLATE_FIELDS));
    res.json(template);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const template = await ModeleEmail.findByPk(req.params.id);
    if (!template) return res.status(404).json({ message: 'Modèle non trouvé' });
    await template.destroy();
    res.json({ message: 'Modèle supprimé' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Suggestion de modèles (stub AI)
exports.suggest = async (req, res) => {
  try {
    const {
      type = 'anniversaire',
      ton = 'amical',
      longueur = 'moyen',
      sujet = '',
    } = req.body || {};
    const subject =
      sujet || (type === 'anniversaire' ? 'Joyeux anniversaire !' : 'Newsletter du club');
    const html = `
      <h2>${subject}</h2>
      <p style="font-size:16px">Bonjour {{prenom}},</p>
      <p>Voici un modèle ${type} au ton ${ton}. Ajoutez vos informations spécifiques et appels à l'action.</p>
      <p>Cordialement,<br/>Votre club</p>
      <p style="font-size:12px;color:#888">Si vous ne souhaitez plus recevoir ces emails, cliquez ici: {{unsubscribe_link}}</p>
    `;
    res.json({ sujet: subject, contenu_html: html.trim() });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Convertir un texte brut en HTML stylé via OpenAI
exports.textToHtml = async (req, res) => {
  try {
    const { texte = '' } = req.body || {};
    if (!texte || texte.trim().length === 0) {
      return res.status(400).json({ message: 'Le champ "texte" est requis' });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ message: "OPENAI_API_KEY manquant dans l'environnement" });
    }

    const openai = new OpenAI({ apiKey });
    const prompt = `Génère un email HTML complet, responsive et compatible email (tables inlines si besoin), avec header, bouton CTA et footer, pour ce texte : \n\n${texte}\n\nContraintes :\n- Utilise du HTML/CSS inline compatible clients email (Gmail/Outlook).\n- Inclure un header avec logo fictif, un corps clair, un bouton (CTA) et un footer avec lien de désabonnement {{unsubscribe_link}}.\n- N'utilise pas de <script>.\n- Le design doit être propre et lisible.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'Tu es un assistant qui génère des emails HTML responsives compatibles avec Nodemailer.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.6,
      max_tokens: 1500,
    });

    const html = completion.choices?.[0]?.message?.content?.trim();
    if (!html) {
      return res.status(500).json({ message: 'Réponse OpenAI vide' });
    }

    res.json({ contenu_html: html });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
