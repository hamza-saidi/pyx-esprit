const { Abonnement, Contact } = require('../models');
const { pick } = require('../utils/pick');

const ABONNEMENT_FIELDS = ['nom', 'prix', 'duree_mois', 'description', 'actif'];

exports.create = async (req, res) => {
  try {
    const abonnement = await Abonnement.create(pick(req.body, ABONNEMENT_FIELDS));
    res.status(201).json(abonnement);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    const abonnements = await Abonnement.findAll({
      order: [['nom', 'ASC']],
    });
    res.json(abonnements);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getOne = async (req, res) => {
  try {
    const abonnement = await Abonnement.findByPk(req.params.id);
    if (!abonnement) return res.status(404).json({ message: 'Abonnement non trouvé' });
    res.json(abonnement);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const abonnement = await Abonnement.findByPk(req.params.id);
    if (!abonnement) return res.status(404).json({ message: 'Abonnement non trouvé' });
    await abonnement.update(pick(req.body, ABONNEMENT_FIELDS));
    res.json(abonnement);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const abonnement = await Abonnement.findByPk(req.params.id);
    if (!abonnement) return res.status(404).json({ message: 'Abonnement non trouvé' });

    // Check if contacts are using this abonnement
    const count = await Contact.count({ where: { abonnement_id: req.params.id } });
    if (count > 0) {
      return res
        .status(400)
        .json({ message: `Impossible de supprimer : ${count} contacts utilisent cet abonnement.` });
    }

    await abonnement.destroy();
    res.json({ message: 'Abonnement supprimé' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
