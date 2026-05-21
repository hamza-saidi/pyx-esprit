const { CampagneEmail, Utilisateur, Segment, StatistiqueCampagne } = require('../models');
const nodemailer = require('nodemailer');

// CRUD
exports.create = async (req, res) => {
  try {
    const campagne = await CampagneEmail.create(req.body);
    res.status(201).json(campagne);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    const campagnes = await CampagneEmail.findAll({
      include: [
        { model: Utilisateur, as: 'createur', attributes: ['id', 'nom', 'email'] },
        { model: Segment, as: 'segment' },
        { model: StatistiqueCampagne, as: 'statistiques' }
      ]
    });
    res.json(campagnes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getOne = async (req, res) => {
  try {
    const campagne = await CampagneEmail.findByPk(req.params.id, {
      include: [
        { model: Utilisateur, as: 'createur', attributes: ['id', 'nom', 'email'] },
        { model: Segment, as: 'segment' },
        { model: StatistiqueCampagne, as: 'statistiques' }
      ]
    });
    if (!campagne) return res.status(404).json({ message: 'Campagne non trouvée' });
    res.json(campagne);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const campagne = await CampagneEmail.findByPk(req.params.id);
    if (!campagne) return res.status(404).json({ message: 'Campagne non trouvée' });
    await campagne.update(req.body);
    res.json(campagne);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const campagne = await CampagneEmail.findByPk(req.params.id);
    if (!campagne) return res.status(404).json({ message: 'Campagne non trouvée' });
    await campagne.destroy();
    res.json({ message: 'Campagne supprimée' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Envoi d'emails (squelette, à compléter selon la logique de segment)
exports.send = async (req, res) => {
  try {
    // À compléter : récupérer les contacts du segment, envoyer via nodemailer
    res.json({ message: 'Envoi en cours (à implémenter)' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}; 