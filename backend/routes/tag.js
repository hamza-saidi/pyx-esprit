const express = require('express');
const router = express.Router();
const tagController = require('../controllers/tagController');
const { authenticateToken } = require('../middleware/auth');

// CRUD
router.post('/', authenticateToken, tagController.create);
router.get('/', authenticateToken, tagController.getAll);
router.get('/cloud/metrics', authenticateToken, tagController.getCloudMetrics);
router.get('/:id', authenticateToken, tagController.getOne);
router.put('/:id', authenticateToken, tagController.update);
router.delete('/:id', authenticateToken, tagController.delete);

// Fusionner des tags
router.post('/merge', authenticateToken, tagController.merge);

// Lister les contacts d'un tag
router.get('/:id/contacts', authenticateToken, tagController.getContacts);

module.exports = router;
