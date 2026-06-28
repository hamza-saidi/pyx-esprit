const { Contact, Tag, EnvoiEmail, sequelize } = require('../models');
const emailService = require('../services/emailService');
const { Op, fn, col, where } = require('sequelize');

exports.listToday = async (req, res) => {
  try {
    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();

    const contacts = await Contact.findAll({
      where: where(
        fn('DATE_FORMAT', col('date_naissance'), '%m-%d'),
        `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      ),
      include: [
        { model: Tag, as: 'tags', through: { attributes: [] }, where: { nom: 'Membre VIP' } },
      ],
      attributes: ['id', 'prenom', 'nom', 'email', 'date_naissance'],
    });

    res.json({ count: contacts.length, contacts });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.sendToday = async (req, res) => {
  try {
    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();

    const contacts = await Contact.findAll({
      where: where(
        fn('DATE_FORMAT', col('date_naissance'), '%m-%d'),
        `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      ),
      include: [
        { model: Tag, as: 'tags', through: { attributes: [] }, where: { nom: 'Membre VIP' } },
      ],
      attributes: ['id', 'prenom', 'nom', 'email'],
    });

    let sent = 0;
    let errors = 0;
    const results = [];
    for (const c of contacts) {
      try {
        const sujet = `Joyeux anniversaire ${c.prenom}!`;
        const contenu_html = `<p>Joyeux anniversaire ${c.prenom} ${c.nom} 🎉</p><p>Toute l'équipe vous souhaite une merveilleuse journée.</p>`;
        const contenu_texte = `Joyeux anniversaire ${c.prenom} ${c.nom} !`;
        // Shim campagne/envoi minimal pour réutiliser l'emailService
        const campagneShim = {
          id: `bday-${today.toISOString().slice(0, 10)}`,
          sujet,
          contenu_html,
          contenu_texte,
        };
        const envoiShim = {
          contact_id: c.id,
          email_destinataire: c.email,
          token_tracking: `bday-${c.id}-${Date.now()}`,
        };
        await emailService.envoyerEmail(campagneShim, envoiShim);
        sent++;
        results.push({ id: c.id, email: c.email, status: 'sent' });
        // Log in envoi_email table for visibility on the day
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
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
