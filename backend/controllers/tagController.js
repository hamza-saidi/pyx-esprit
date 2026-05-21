const { Tag, Contact, ContactTag, sequelize } = require('../models');
const { literal } = require('sequelize');

// CRUD
exports.create = async (req, res) => {
  try {
    const tag = await Tag.create(req.body);
    res.status(201).json(tag);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    const tags = await Tag.findAll();
    res.json(tags);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getOne = async (req, res) => {
  try {
    const tag = await Tag.findByPk(req.params.id);
    if (!tag) return res.status(404).json({ message: 'Tag non trouvé' });
    res.json(tag);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const tag = await Tag.findByPk(req.params.id);
    if (!tag) return res.status(404).json({ message: 'Tag non trouvé' });
    await tag.update(req.body);
    res.json(tag);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const tag = await Tag.findByPk(req.params.id);
    if (!tag) return res.status(404).json({ message: 'Tag non trouvé' });
    await tag.destroy();
    res.json({ message: 'Tag supprimé' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Lister les contacts associés à un tag
exports.getContacts = async (req, res) => {
  try {
    const tag = await Tag.findByPk(req.params.id, {
      include: [{ model: Contact, as: 'contacts', through: { attributes: [] } }]
    });
    if (!tag) return res.status(404).json({ message: 'Tag non trouvé' });
    res.json(tag.contacts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}; 

// Aggregated data for tag cloud (contact counts per tag)
exports.getCloudMetrics = async (req, res) => {
  try {
    const tags = await Tag.findAll({
      attributes: [
        'id',
        'nom',
        [sequelize.fn('COUNT', sequelize.col('contacts.id')), 'contactCount'],
      ],
      include: [{
        model: Contact,
        as: 'contacts',
        attributes: [],
        through: { attributes: [] },
        required: false,
      }],
      group: ['Tag.id'],
      order: [[literal('contactCount'), 'DESC'], ['nom', 'ASC']],
      subQuery: false,
    });

    res.json(tags.map((tag) => ({
      id: tag.id,
      nom: tag.nom,
      contactCount: Number(tag.get('contactCount')) || 0,
    })));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.merge = async (req, res) => {
  const { sourceIds, targetId } = req.body;
  if (!sourceIds || !Array.isArray(sourceIds) || !targetId) {
    return res.status(400).json({ message: 'sourceIds (array) et targetId sont requis' });
  }

  const transaction = await sequelize.transaction();
  try {
    const targetTag = await Tag.findByPk(targetId, { transaction });
    if (!targetTag) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Tag cible non trouvé' });
    }

    // 1. Récupérer tous les contact_id déjà associés au tag cible
    const targetContactTags = await ContactTag.findAll({
      where: { tag_id: targetId },
      attributes: ['contact_id'],
      transaction
    });
    const targetContactIds = new Set(targetContactTags.map(ct => ct.contact_id));

    // 2. Pour chaque tag source
    for (const sourceId of sourceIds) {
      if (Number(sourceId) === Number(targetId)) continue;

      // Récupérer les associations du tag source
      const sourceContactTags = await ContactTag.findAll({
        where: { tag_id: sourceId },
        transaction
      });

      for (const sct of sourceContactTags) {
        // Si le contact n'a pas déjà le tag cible, on "déplace" l'association
        if (!targetContactIds.has(sct.contact_id)) {
          await ContactTag.create({
            contact_id: sct.contact_id,
            tag_id: targetId
          }, { transaction });
          targetContactIds.add(sct.contact_id);
        }
      }

      // 3. Supprimer le tag source (les associations restantes seront supprimées par cascade ou manuellement si besoin)
      await ContactTag.destroy({ where: { tag_id: sourceId }, transaction });
      await Tag.destroy({ where: { id: sourceId }, transaction });
    }

    await transaction.commit();
    res.json({ message: 'Fusion réussie', targetId });
  } catch (err) {
    await transaction.rollback();
    res.status(500).json({ message: err.message });
  }
};