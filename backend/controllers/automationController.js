const { Automation } = require('../models');

exports.listAutomations = async (req, res) => {
  try {
    const automations = await Automation.findAll();
    res.json(automations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.toggleAutomation = async (req, res) => {
  try {
    const { id } = req.params;
    const { actif } = req.body;
    
    const automation = await Automation.findByPk(id);
    if (!automation) {
      return res.status(404).json({ message: 'Automation not found' });
    }

    automation.actif = actif;
    await automation.save();
    
    res.json(automation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createCustomAutomation = async (req, res) => {
  try {
    const { nom, config } = req.body;
    
    // config expects { trigger: 'tag_added', condition: 'VIP', action_template_id: 12 }
    const automation = await Automation.create({
      nom,
      type: 'custom',
      actif: true, // auto active on creation
      config
    });

    res.status(201).json(automation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteAutomation = async (req, res) => {
  try {
    const { id } = req.params;
    const automation = await Automation.findByPk(id);
    
    if (!automation) return res.status(404).json({ message: 'Automation not found' });
    if (automation.type !== 'custom') return res.status(403).json({ message: 'Cannot delete system automations' });

    await automation.destroy();
    res.json({ message: 'Automation deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateAutomation = async (req, res) => {
  try {
    const { id } = req.params;
    const { nom, config, actif } = req.body;
    
    const automation = await Automation.findByPk(id);
    if (!automation) {
      return res.status(404).json({ message: 'Automation not found' });
    }

    if (nom !== undefined) automation.nom = nom;
    if (config !== undefined) automation.config = config;
    if (actif !== undefined) automation.actif = actif;
    
    await automation.save();
    res.json(automation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
