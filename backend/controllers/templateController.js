const OpenAI = require('openai');
const createTemplate = require('../use-cases/template/createTemplate');
const updateTemplate = require('../use-cases/template/updateTemplate');
const getTemplate = require('../use-cases/template/getTemplate');
const listTemplates = require('../use-cases/template/listTemplates');
const deleteTemplate = require('../use-cases/template/deleteTemplate');

// CRUD
exports.create = async (req, res, next) => {
  try {
    const template = await createTemplate(req.body, { clubId: req.clubId });
    res.status(201).json(template);
  } catch (err) {
    next(err);
  }
};

exports.getAll = async (req, res, next) => {
  try {
    const templates = await listTemplates({ clubId: req.clubId });
    res.json(templates);
  } catch (err) {
    next(err);
  }
};

exports.getOne = async (req, res, next) => {
  try {
    const template = await getTemplate(req.params.id, { clubId: req.clubId });
    res.json(template);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const template = await updateTemplate(req.params.id, req.body, { clubId: req.clubId });
    res.json(template);
  } catch (err) {
    next(err);
  }
};

exports.delete = async (req, res, next) => {
  try {
    await deleteTemplate(req.params.id, { clubId: req.clubId });
    res.json({ message: 'Modèle supprimé' });
  } catch (err) {
    next(err);
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
