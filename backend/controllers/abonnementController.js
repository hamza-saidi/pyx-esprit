const createAbonnement = require('../use-cases/abonnement/createAbonnement');
const updateAbonnement = require('../use-cases/abonnement/updateAbonnement');
const getAbonnement = require('../use-cases/abonnement/getAbonnement');
const listAbonnements = require('../use-cases/abonnement/listAbonnements');
const deleteAbonnement = require('../use-cases/abonnement/deleteAbonnement');

exports.create = async (req, res, next) => {
  try {
    const abonnement = await createAbonnement(req.body, { clubId: req.clubId });
    res.status(201).json(abonnement);
  } catch (err) {
    next(err);
  }
};

exports.getAll = async (req, res, next) => {
  try {
    const abonnements = await listAbonnements({ clubId: req.clubId });
    res.json(abonnements);
  } catch (err) {
    next(err);
  }
};

exports.getOne = async (req, res, next) => {
  try {
    const abonnement = await getAbonnement(req.params.id, { clubId: req.clubId });
    res.json(abonnement);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const abonnement = await updateAbonnement(req.params.id, req.body, { clubId: req.clubId });
    res.json(abonnement);
  } catch (err) {
    next(err);
  }
};

exports.delete = async (req, res, next) => {
  try {
    await deleteAbonnement(req.params.id, { clubId: req.clubId });
    res.json({ message: 'Abonnement supprimé' });
  } catch (err) {
    next(err);
  }
};
