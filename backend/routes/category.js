const express = require('express');
const router = express.Router();
const { Category } = require('../models');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    const items = await Category.findAll({ where: { actif: true } });
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
