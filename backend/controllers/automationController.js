const listAutomations = require('../use-cases/automation/listAutomations');
const toggleAutomation = require('../use-cases/automation/toggleAutomation');
const createCustomAutomation = require('../use-cases/automation/createCustomAutomation');
const updateAutomation = require('../use-cases/automation/updateAutomation');
const deleteAutomation = require('../use-cases/automation/deleteAutomation');

exports.listAutomations = async (req, res, next) => {
  try {
    const automations = await listAutomations({ clubId: req.clubId });
    res.json(automations);
  } catch (err) {
    next(err);
  }
};

exports.toggleAutomation = async (req, res, next) => {
  try {
    const automation = await toggleAutomation(req.params.id, req.body, { clubId: req.clubId });
    res.json(automation);
  } catch (err) {
    next(err);
  }
};

exports.createCustomAutomation = async (req, res, next) => {
  try {
    const automation = await createCustomAutomation(req.body, { clubId: req.clubId });
    res.status(201).json(automation);
  } catch (err) {
    next(err);
  }
};

exports.deleteAutomation = async (req, res, next) => {
  try {
    await deleteAutomation(req.params.id, { clubId: req.clubId });
    res.json({ message: 'Automation deleted successfully' });
  } catch (err) {
    next(err);
  }
};

exports.updateAutomation = async (req, res, next) => {
  try {
    const automation = await updateAutomation(req.params.id, req.body, { clubId: req.clubId });
    res.json(automation);
  } catch (err) {
    next(err);
  }
};
